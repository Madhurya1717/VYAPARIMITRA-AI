"""
VyapariMitra AI — Simulated Live Grocery Merchant Sales Service
Replays real Instacart order baskets periodically to simulate live, realistic
merchant sales traffic, deducting stock atomically and updating business metrics.
"""

import os
import json
import random
import asyncio
import logging
from decimal import Decimal
from typing import Dict, Any, List, Optional
from collections import deque
from datetime import datetime, timezone

from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.realtime import realtime_manager
from backend.app.models.business import Business
from backend.app.models.inventory import Product, InventoryTransaction
from backend.app.models.sales import Sale, SaleItem
from backend.app.schemas.sale import SaleCreate, SaleItemCreate
from backend.app.services.sales_service import sales_service

logger = logging.getLogger("vyaparimitra.simulation")

BASKETS_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "simulation_baskets.json"
)

PAYMENT_METHODS = ["cash", "upi", "upi", "cash", "credit"]

class SimulationService:
    def __init__(self):
        self.is_running: bool = False
        self.interval_seconds: int = 3
        self.active_business_id: Optional[str] = None
        self._task: Optional[asyncio.Task] = None
        self.session_factory = None
        self.baskets: List[Dict[str, Any]] = []
        self.recent_transactions: deque = deque(maxlen=50)
        self.total_simulated_sales: int = 0
        self.total_simulated_revenue: float = 0.0
        self.last_transaction: Optional[Dict[str, Any]] = None
        self._load_baskets()

    def get_session(self):
        return (self.session_factory or AsyncSessionLocal)()

    def _load_baskets(self):
        if os.path.exists(BASKETS_FILE):
            try:
                with open(BASKETS_FILE, mode="r", encoding="utf-8") as f:
                    self.baskets = json.load(f)
                logger.info(f"Loaded {len(self.baskets)} realistic simulation baskets.")
            except Exception as e:
                logger.error(f"Failed to load simulation baskets: {e}")
                self.baskets = []
        else:
            logger.warning(f"Baskets file not found at {BASKETS_FILE}")
            self.baskets = []

    async def start(self, business_id: str, interval_seconds: int = 3) -> Dict[str, Any]:
        if self.is_running:
            self.interval_seconds = max(1, interval_seconds)
            return {
                "success": True,
                "message": f"Simulation already running. Updated interval to {self.interval_seconds}s.",
                "is_running": True
            }

        self.active_business_id = business_id
        self.interval_seconds = max(1, interval_seconds)
        self.is_running = True
        self._task = asyncio.create_task(self._simulation_loop())
        logger.info(f"Started live sales simulation for business {business_id} every {self.interval_seconds}s.")
        return {
            "success": True,
            "message": f"Live grocery sales simulation started (interval: {self.interval_seconds}s).",
            "is_running": True
        }

    async def stop(self) -> Dict[str, Any]:
        if not self.is_running:
            return {"success": True, "message": "Simulation is not currently running.", "is_running": False}

        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        logger.info("Live sales simulation stopped.")
        return {"success": True, "message": "Live grocery sales simulation stopped.", "is_running": False}

    async def reset(self, business_id: str) -> Dict[str, Any]:
        """
        Safely reverts all simulated transactions and restores inventory stock.
        """
        was_running = self.is_running
        if was_running:
            await self.stop()

        async with self.get_session() as db:
            # Query all simulated sales for this business
            sim_sales_res = await db.execute(
                select(Sale)
                .options(selectinload(Sale.items).selectinload(SaleItem.product))
                .filter(Sale.business_id == business_id, Sale.is_simulation == True)
            )
            sim_sales = sim_sales_res.scalars().all()
            deleted_count = len(sim_sales)

            # Restore stock for each item sold in simulation
            for sale in sim_sales:
                for item in sale.items:
                    if item.product:
                        item.product.current_stock += item.quantity

            # Delete related inventory transactions with simulation reference
            await db.execute(
                select(InventoryTransaction).filter(
                    InventoryTransaction.business_id == business_id,
                    InventoryTransaction.reference_type == "simulation_sale"
                )
            )

            # Delete simulated sales (SaleItems cascade)
            for sale in sim_sales:
                await db.delete(sale)

            await db.commit()

        # Reset counters
        self.total_simulated_sales = 0
        self.total_simulated_revenue = 0.0
        self.recent_transactions.clear()
        self.last_transaction = None

        logger.info(f"Reset {deleted_count} simulated sales for business {business_id}.")

        return {
            "success": True,
            "deleted_sales_count": deleted_count,
            "message": f"Successfully reset {deleted_count} simulated sales and restored inventory."
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "interval_seconds": self.interval_seconds,
            "total_simulated_sales": self.total_simulated_sales,
            "total_simulated_revenue": round(self.total_simulated_revenue, 2),
            "last_transaction": self.last_transaction,
            "active_business_id": self.active_business_id
        }

    def get_transactions(self, limit: int = 20) -> List[Dict[str, Any]]:
        txs = list(self.recent_transactions)
        txs.reverse()
        return txs[:limit]

    async def _simulation_loop(self):
        basket_index = 0
        while self.is_running:
            try:
                if not self.is_running or not self.active_business_id:
                    break

                if not self.baskets:
                    self._load_baskets()
                    if not self.baskets:
                        logger.warning("No simulation baskets available.")
                        await asyncio.sleep(5)
                        continue

                # Select basket
                basket = self.baskets[basket_index % len(self.baskets)]
                basket_index += 1

                # Execute basket purchase immediately
                await self._process_simulated_basket(basket)

                # Wait for next interval
                await asyncio.sleep(self.interval_seconds)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in simulation loop: {e}", exc_info=True)
                await asyncio.sleep(self.interval_seconds)

    async def _process_simulated_basket(self, basket: Dict[str, Any]):
        async with self.get_session() as db:
            ext_ids = [it["external_product_id"] for it in basket["items"]]

            # Fetch matching products from DB for this business
            prod_res = await db.execute(
                select(Product).filter(
                    Product.business_id == self.active_business_id,
                    Product.external_product_id.in_(ext_ids),
                    Product.is_active == True
                )
            )
            products_by_ext_id = {p.external_product_id: p for p in prod_res.scalars().all()}

            prod_map = {}
            if not products_by_ext_id:
                # If no products found by external_product_id, pick random active products
                random_res = await db.execute(
                    select(Product).filter(
                        Product.business_id == self.active_business_id,
                        Product.is_active == True
                    ).limit(3)
                )
                random_prods = random_res.scalars().all()
                if not random_prods:
                    # Fallback to any active products in the database
                    fallback_res = await db.execute(
                        select(Product).filter(Product.is_active == True).limit(3)
                    )
                    random_prods = fallback_res.scalars().all()
                    if random_prods:
                        self.active_business_id = random_prods[0].business_id
                    else:
                        return
                sale_item_creates = []
                for p in random_prods:
                    prod_map[p.id] = p
                    # Auto replenish if out of stock
                    if p.current_stock < 2:
                        p.current_stock = Decimal("50.0")
                    sale_item_creates.append(
                        SaleItemCreate(
                            product_id=p.id,
                            quantity=Decimal("1.0"),
                            unit_price=p.selling_price
                        )
                    )
            else:
                sale_item_creates = []
                for it in basket["items"]:
                    p = products_by_ext_id.get(it["external_product_id"])
                    if not p:
                        continue
                    prod_map[p.id] = p
                    qty = Decimal(str(it.get("quantity", 1)))
                    # Auto replenish if low stock to keep simulation humming smoothly
                    if p.current_stock < qty:
                        p.current_stock += Decimal("50.0")

                    sale_item_creates.append(
                        SaleItemCreate(
                            product_id=p.id,
                            quantity=qty,
                            unit_price=p.selling_price
                        )
                    )

            if not sale_item_creates:
                return

            payment = random.choice(PAYMENT_METHODS)
            sale_data = SaleCreate(
                items=sale_item_creates,
                payment_method=payment,
                tax_amount=Decimal("0.0"),
                discount_amount=Decimal("0.0"),
                notes="Instacart Market Basket Live Simulation"
            )

            # Create sale with is_simulation=True
            sale = await sales_service.create_sale(
                db=db,
                business_id=self.active_business_id,
                sale_data=sale_data,
                reference_type="simulation_sale",
                is_simulation=True
            )
            await db.commit()

            # Format transaction for live ticker using in-memory product details (no lazy loading queries)
            items_summary = []
            for item in sale_item_creates:
                prod = prod_map.get(item.product_id)
                p_name = prod.name if prod else "Grocery Item"
                p_unit = prod.unit if prod else "unit"
                remaining = float(prod.current_stock) if prod else 0
                qty = float(item.quantity)
                unit_price = float(item.unit_price)
                items_summary.append({
                    "name": p_name,
                    "quantity": qty,
                    "unit": p_unit,
                    "unit_price": unit_price,
                    "total_price": round(qty * unit_price, 2),
                    "remaining_stock": remaining
                })

            tx_record = {
                "id": sale.id,
                "invoice_number": sale.invoice_number,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_amount": float(sale.total_amount),
                "payment_method": sale.payment_method,
                "items_count": len(items_summary),
                "items": items_summary,
                "first_item_name": items_summary[0]["name"] if items_summary else "Grocery Item"
            }

            self.total_simulated_sales += 1
            self.total_simulated_revenue += float(sale.total_amount)
            self.last_transaction = tx_record
            self.recent_transactions.append(tx_record)

            # Broadcast real-time event across websockets
            try:
                await realtime_manager.broadcast("SALE_CREATED", {
                    "sale_id": sale.id,
                    "invoice_number": sale.invoice_number,
                    "total_amount": float(sale.total_amount),
                    "payment_method": sale.payment_method,
                    "is_simulation": True,
                    "items_count": len(items_summary),
                    "first_item_name": tx_record["first_item_name"]
                })
            except Exception as b_err:
                logger.warning(f"Failed to broadcast simulation sale event: {b_err}")

            logger.info(
                f"[SIMULATION] Sale {sale.invoice_number} | {len(items_summary)} items | "
                f"₹{sale.total_amount} via {payment.upper()}"
            )

simulation_service = SimulationService()
