import json
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, update
from fastapi import HTTPException, status

from backend.app.models.inventory import Product, Category, InventoryTransaction
from backend.app.models.audit import Notification
from backend.app.schemas.product import ProductCreate, ProductUpdate, InventoryAdjustRequest

from sqlalchemy.orm import selectinload

class InventoryService:
    async def get_products(
        self,
        db: AsyncSession,
        business_id: str,
        category_id: Optional[str] = None,
        search: Optional[str] = None,
        low_stock_only: bool = False
    ) -> List[Dict[str, Any]]:
        query = select(Product, Category.name.label("category_name")).outerjoin(
            Category, Product.category_id == Category.id
        ).filter(Product.business_id == business_id, Product.is_active == True)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if low_stock_only:
            query = query.filter(Product.current_stock <= Product.low_stock_threshold)

        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(s),
                    Product.telugu_name.ilike(s),
                    Product.sku.ilike(s),
                    Product.aliases.ilike(s)
                )
            )

        query = query.order_by(Product.name.asc())
        result = await db.execute(query)
        rows = result.all()

        products = []
        for product, category_name in rows:
            aliases_list = []
            if product.aliases:
                try:
                    aliases_list = json.loads(product.aliases) if isinstance(product.aliases, str) else product.aliases
                except Exception:
                    aliases_list = [product.aliases]

            products.append({
                "id": product.id,
                "business_id": product.business_id,
                "name": product.name,
                "telugu_name": product.telugu_name,
                "aliases": aliases_list,
                "category_id": product.category_id,
                "category_name": category_name,
                "sku": product.sku,
                "current_stock": float(product.current_stock),
                "unit": product.unit,
                "cost_price": float(product.cost_price),
                "selling_price": float(product.selling_price),
                "low_stock_threshold": float(product.low_stock_threshold),
                "is_active": product.is_active,
                "is_low_stock": float(product.current_stock) <= float(product.low_stock_threshold),
                "created_at": product.created_at,
                "updated_at": product.updated_at
            })
        return products

    async def get_product_by_id(self, db: AsyncSession, business_id: str, product_id: str) -> Optional[Product]:
        result = await db.execute(
            select(Product).options(selectinload(Product.category)).filter(Product.id == product_id, Product.business_id == business_id)
        )
        return result.scalar_one_or_none()

    async def create_product(self, db: AsyncSession, business_id: str, data: ProductCreate) -> Product:
        aliases_json = json.dumps(data.aliases or [])
        product = Product(
            business_id=business_id,
            name=data.name,
            telugu_name=data.telugu_name,
            aliases=aliases_json,
            category_id=data.category_id,
            sku=data.sku,
            current_stock=data.current_stock,
            unit=data.unit,
            cost_price=data.cost_price,
            selling_price=data.selling_price,
            low_stock_threshold=data.low_stock_threshold,
            is_active=data.is_active
        )
        db.add(product)
        await db.flush()

        # Log initial inventory transaction if starting stock > 0
        if data.current_stock > 0:
            tx = InventoryTransaction(
                business_id=business_id,
                product_id=product.id,
                type="IN",
                quantity=data.current_stock,
                balance_after=data.current_stock,
                unit_price=data.cost_price,
                reference_type="initial_setup",
                notes="Initial product registration"
            )
            db.add(tx)

        await db.commit()
        await db.refresh(product)
        return product

    async def update_product(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: str,
        data: ProductUpdate
    ) -> Optional[Product]:
        """
        Updates product attributes, maintaining business tenant isolation.
        """
        product = await self.get_product_by_id(db, business_id, product_id)
        if not product:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        if "aliases" in update_dict and update_dict["aliases"] is not None:
            update_dict["aliases"] = json.dumps(update_dict["aliases"])

        for key, value in update_dict.items():
            setattr(product, key, value)

        await db.commit()
        await db.refresh(product)
        return product

    async def delete_product(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: str
    ) -> bool:
        """
        Soft-deletes product by setting is_active=False to preserve sales history and audit transactions.
        """
        product = await self.get_product_by_id(db, business_id, product_id)
        if not product:
            return False

        product.is_active = False
        await db.commit()
        return True

    async def adjust_stock(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: str,
        quantity_delta: Decimal,
        tx_type: str = "ADJUSTMENT",
        reference_type: str = "manual",
        reference_id: Optional[str] = None,
        unit_price: Optional[Decimal] = None,
        notes: Optional[str] = None
    ) -> Tuple[bool, Product, Optional[str]]:
        """
        Atomic stock adjustment with full audit ledger tracking.
        Returns: (success, updated_product, error_message)
        """
        product = await self.get_product_by_id(db, business_id, product_id)
        if not product:
            return False, None, "Product not found"

        new_stock = product.current_stock + quantity_delta
        if new_stock < 0:
            return False, product, f"Insufficient stock. Available: {product.current_stock} {product.unit}"

        product.current_stock = new_stock

        tx = InventoryTransaction(
            business_id=business_id,
            product_id=product.id,
            type=tx_type,
            quantity=quantity_delta,
            balance_after=new_stock,
            unit_price=unit_price or product.selling_price,
            reference_type=reference_type,
            reference_id=reference_id,
            notes=notes
        )
        db.add(tx)

        # Trigger low stock notification if balance crosses threshold downwards
        if new_stock <= product.low_stock_threshold and quantity_delta < 0:
            notif = Notification(
                business_id=business_id,
                title=f"Low Stock Alert: {product.name}",
                message=f"Stock for {product.name} ({product.telugu_name or ''}) has dropped to {new_stock} {product.unit}. Threshold is {product.low_stock_threshold} {product.unit}.",
                type="warning"
            )
            db.add(notif)

        await db.commit()
        await db.refresh(product)
        return True, product, None

    async def get_inventory_transactions(
        self,
        db: AsyncSession,
        business_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = select(InventoryTransaction, Product.name.label("product_name")).join(
            Product, InventoryTransaction.product_id == Product.id
        ).filter(
            InventoryTransaction.business_id == business_id
        ).order_by(
            InventoryTransaction.created_at.desc()
        ).limit(limit)

        result = await db.execute(query)
        rows = result.all()

        transactions = []
        for tx, product_name in rows:
            transactions.append({
                "id": tx.id,
                "business_id": tx.business_id,
                "product_id": tx.product_id,
                "product_name": product_name,
                "type": tx.type,
                "quantity": float(tx.quantity),
                "balance_after": float(tx.balance_after),
                "unit_price": float(tx.unit_price) if tx.unit_price else None,
                "reference_type": tx.reference_type,
                "notes": tx.notes,
                "created_at": tx.created_at
            })
        return transactions

inventory_service = InventoryService()
