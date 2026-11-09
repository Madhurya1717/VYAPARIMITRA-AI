from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.core.realtime import realtime_manager
from backend.app.models.business import User
from backend.app.schemas.sale import SaleCreate, SaleResponse
from backend.app.services.sales_service import sales_service

router = APIRouter(prefix="/sales", tags=["Sales & Invoicing"])

@router.get("", response_model=List[SaleResponse])
async def list_sales(
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sales = await sales_service.get_sales(db, current_user.business_id, limit=limit)
    response = []
    for s in sales:
        items = []
        for itm in s.items:
            items.append({
                "id": itm.id,
                "product_id": itm.product_id,
                "product_name": itm.product.name if itm.product else "Unknown",
                "quantity": float(itm.quantity),
                "unit_price": float(itm.unit_price),
                "total_price": float(itm.total_price)
            })

        inv_data = None
        if s.invoice:
            inv_data = {
                "id": s.invoice.id,
                "invoice_number": s.invoice.invoice_number,
                "pdf_url": s.invoice.pdf_url,
                "qr_payload": s.invoice.qr_payload,
                "created_at": s.invoice.created_at
            }

        response.append({
            "id": s.id,
            "business_id": s.business_id,
            "customer_id": s.customer_id,
            "customer_name": s.customer.name if s.customer else None,
            "invoice_number": s.invoice_number,
            "subtotal": float(s.subtotal),
            "tax_amount": float(s.tax_amount),
            "discount_amount": float(s.discount_amount),
            "total_amount": float(s.total_amount),
            "payment_method": s.payment_method,
            "status": s.status,
            "notes": s.notes,
            "items": items,
            "invoice": inv_data,
            "created_at": s.created_at
        })
    return response

@router.post("", response_model=SaleResponse)
async def create_sale(
    data: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sale = await sales_service.create_sale(
        db=db,
        business_id=current_user.business_id,
        sale_data=data,
        reference_type="pos_sale"
    )
    sales = await sales_service.get_sales(db, current_user.business_id, limit=1)
    for s in sales:
        if s.id == sale.id:
            items = [{
                "id": itm.id,
                "product_id": itm.product_id,
                "product_name": itm.product.name if itm.product else "Unknown",
                "quantity": float(itm.quantity),
                "unit_price": float(itm.unit_price),
                "total_price": float(itm.total_price)
            } for itm in s.items]

            inv_data = {
                "id": s.invoice.id,
                "invoice_number": s.invoice.invoice_number,
                "pdf_url": s.invoice.pdf_url,
                "qr_payload": s.invoice.qr_payload,
                "created_at": s.invoice.created_at
            } if s.invoice else None

            # Broadcast real-time sale event to all connected dashboards
            await realtime_manager.broadcast("SALE_CREATED", {
                "sale_id": s.id,
                "invoice_number": s.invoice_number,
                "total_amount": float(s.total_amount),
                "payment_method": s.payment_method,
                "customer_name": s.customer.name if s.customer else "Walk-in Customer",
                "items_count": len(items)
            })

            return {
                "id": s.id,
                "business_id": s.business_id,
                "customer_id": s.customer_id,
                "customer_name": s.customer.name if s.customer else None,
                "invoice_number": s.invoice_number,
                "subtotal": float(s.subtotal),
                "tax_amount": float(s.tax_amount),
                "discount_amount": float(s.discount_amount),
                "total_amount": float(s.total_amount),
                "payment_method": s.payment_method,
                "status": s.status,
                "notes": s.notes,
                "items": items,
                "invoice": inv_data,
                "created_at": s.created_at
            }

    raise HTTPException(status_code=500, detail="Failed to retrieve created sale record")

