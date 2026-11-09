import uuid
from decimal import Decimal
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from backend.app.models.sales import Sale, SaleItem, Invoice
from backend.app.models.inventory import Product, InventoryTransaction
from backend.app.models.orders import Customer
from backend.app.models.audit import Notification, AuditLog
from backend.app.schemas.sale import SaleCreate

class SalesService:
    async def create_sale(
        self,
        db: AsyncSession,
        business_id: str,
        sale_data: SaleCreate,
        reference_type: str = "pos_sale",
        reference_id: Optional[str] = None,
        is_simulation: bool = False
    ) -> Sale:
        """
        Processes a multi-item sale atomically with exact Decimal arithmetic.
        Deducts stock and records inventory ledger transactions.
        """
        # Idempotency check if key provided
        if sale_data.idempotency_key:
            existing_sale = await db.execute(
                select(Sale).filter(
                    Sale.business_id == business_id,
                    Sale.notes.ilike(f"%idempotency:{sale_data.idempotency_key}%")
                )
            )
            found = existing_sale.scalar_one_or_none()
            if found:
                return found

        subtotal = Decimal("0.0")
        items_to_create = []

        # Validate stock availability for all items first before mutating
        for item in sale_data.items:
            prod_result = await db.execute(
                select(Product).filter(Product.id == item.product_id, Product.business_id == business_id)
            )
            product = prod_result.scalar_one_or_none()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product {item.product_id} not found"
                )

            if product.current_stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}'. Required: {item.quantity} {product.unit}, Available: {product.current_stock} {product.unit}"
                )

            unit_price = item.unit_price if item.unit_price is not None else product.selling_price
            line_total = unit_price * item.quantity
            subtotal += line_total

            items_to_create.append({
                "product": product,
                "quantity": item.quantity,
                "unit_price": unit_price,
                "total_price": line_total
            })

        total_amount = subtotal + sale_data.tax_amount - sale_data.discount_amount
        if total_amount < Decimal("0.0"):
            total_amount = Decimal("0.0")

        # Generate unique human-readable invoice number: INV-YYYYMMDD-XXXX
        now_utc = datetime.now(timezone.utc)
        random_suffix = uuid.uuid4().hex[:6].upper()
        invoice_num = f"INV-{now_utc.strftime('%Y%m%d')}-{random_suffix}"

        notes_str = sale_data.notes or ""
        if sale_data.idempotency_key:
            notes_str = f"{notes_str} [idempotency:{sale_data.idempotency_key}]".strip()

        sale = Sale(
            business_id=business_id,
            customer_id=sale_data.customer_id,
            invoice_number=invoice_num,
            subtotal=subtotal,
            tax_amount=sale_data.tax_amount,
            discount_amount=sale_data.discount_amount,
            total_amount=total_amount,
            payment_method=sale_data.payment_method,
            status="completed",
            is_simulation=is_simulation,
            notes=notes_str
        )
        db.add(sale)
        await db.flush()

        # Create line items and deduct stock
        for item_data in items_to_create:
            product = item_data["product"]
            qty = item_data["quantity"]

            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=qty,
                unit_price=item_data["unit_price"],
                total_price=item_data["total_price"]
            )
            db.add(sale_item)

            # Deduct stock
            new_stock = product.current_stock - qty
            product.current_stock = new_stock

            # Create inventory transaction
            inv_tx = InventoryTransaction(
                business_id=business_id,
                product_id=product.id,
                type="OUT",
                quantity=-qty,
                balance_after=new_stock,
                unit_price=item_data["unit_price"],
                reference_type=reference_type,
                reference_id=sale.id,
                notes=f"Sold via Invoice {invoice_num}"
            )
            db.add(inv_tx)

            # Check low-stock threshold
            if new_stock <= product.low_stock_threshold:
                notif = Notification(
                    business_id=business_id,
                    title=f"Low Stock: {product.name}",
                    message=f"Only {new_stock} {product.unit} remaining after sale {invoice_num}.",
                    type="warning"
                )
                db.add(notif)

        # Update customer spend balance if customer attached
        if sale_data.customer_id:
            cust_res = await db.execute(
                select(Customer).filter(Customer.id == sale_data.customer_id, Customer.business_id == business_id)
            )
            customer = cust_res.scalar_one_or_none()
            if customer:
                customer.total_purchases += total_amount
                if sale_data.payment_method == "credit":
                    customer.credit_balance += total_amount

        # Generate UPI payment QR payload
        # Standard Bharat NPCI UPI format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR
        upi_payload = f"upi://pay?pa=vyaparimitra@upi&pn=VyapariStore&am={float(total_amount):.2f}&cu=INR&tr={invoice_num}"
        invoice = Invoice(
            sale_id=sale.id,
            invoice_number=invoice_num,
            qr_payload=upi_payload
        )
        db.add(invoice)

        await db.commit()
        await db.refresh(sale)
        return sale

    async def get_sales(
        self,
        db: AsyncSession,
        business_id: str,
        limit: int = 50
    ) -> List[Sale]:
        result = await db.execute(
            select(Sale)
            .filter(Sale.business_id == business_id)
            .options(selectinload(Sale.items).selectinload(SaleItem.product), selectinload(Sale.invoice), selectinload(Sale.customer))
            .order_by(Sale.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

sales_service = SalesService()

