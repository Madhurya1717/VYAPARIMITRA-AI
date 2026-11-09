import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.core.realtime import realtime_manager
from backend.app.models.business import User
from backend.app.models.orders import Customer, Order, OrderItem
from backend.app.models.inventory import Product
from backend.app.schemas.order import OrderCreate, OrderUpdate, OrderResponse

router = APIRouter(prefix="/orders", tags=["Orders Management"])

@router.get("", response_model=List[OrderResponse])
async def list_orders(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Order).filter(Order.business_id == current_user.business_id)
    if status:
        query = query.filter(Order.status == status)
    query = query.options(
        selectinload(Order.items).selectinload(OrderItem.product),
        selectinload(Order.customer)
    ).order_by(Order.created_at.desc())
    
    res = await db.execute(query)
    orders = res.scalars().all()

    result = []
    for o in orders:
        items = [{
            "id": itm.id,
            "product_id": itm.product_id,
            "product_name": itm.product.name if itm.product else "Kirana Item",
            "quantity": float(itm.quantity),
            "unit_price": float(itm.unit_price),
            "total_price": float(itm.total_price)
        } for itm in o.items]

        result.append({
            "id": o.id,
            "business_id": o.business_id,
            "customer_id": o.customer_id,
            "customer_name": o.customer.name if o.customer else "Walk-in Customer",
            "customer_phone": o.customer.phone if o.customer else None,
            "order_number": o.order_number,
            "status": o.status,
            "payment_status": o.payment_status,
            "total_amount": float(o.total_amount),
            "notes": o.notes,
            "items": items,
            "created_at": o.created_at,
            "updated_at": o.updated_at
        })
    return result

@router.post("", response_model=OrderResponse)
async def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Customer resolution
    customer_id = data.customer_id
    if not customer_id and data.customer_phone:
        c_res = await db.execute(
            select(Customer).filter(
                Customer.phone == data.customer_phone,
                Customer.business_id == current_user.business_id
            )
        )
        existing_c = c_res.scalar_one_or_none()
        if existing_c:
            customer_id = existing_c.id
        else:
            new_c = Customer(
                business_id=current_user.business_id,
                name=data.customer_name or "Walk-in Customer",
                phone=data.customer_phone
            )
            db.add(new_c)
            await db.flush()
            customer_id = new_c.id

    order_num = f"ORD-{uuid.uuid4().hex[:6].upper()}"
    total = Decimal("0.0")
    line_items = []

    for itm in data.items:
        p_res = await db.execute(
            select(Product).filter(
                Product.id == itm.product_id,
                Product.business_id == current_user.business_id
            )
        )
        product = p_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {itm.product_id} not found")
        u_price = itm.unit_price or product.selling_price
        t_price = u_price * itm.quantity
        total += t_price
        line_items.append((product, itm.quantity, u_price, t_price))

    order = Order(
        business_id=current_user.business_id,
        customer_id=customer_id,
        order_number=order_num,
        status="pending",
        payment_status="unpaid",
        total_amount=total,
        notes=data.notes
    )
    db.add(order)
    await db.flush()

    for prod, qty, u_price, t_price in line_items:
        oi = OrderItem(
            order_id=order.id,
            product_id=prod.id,
            quantity=qty,
            unit_price=u_price,
            total_price=t_price
        )
        db.add(oi)

    await db.commit()
    
    # Reload with relations
    q = (
        select(Order)
        .filter(Order.id == order.id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.customer)
        )
    )
    res = await db.execute(q)
    refreshed_order = res.scalar_one()

    items = [{
        "id": itm.id,
        "product_id": itm.product_id,
        "product_name": itm.product.name if itm.product else "Kirana Item",
        "quantity": float(itm.quantity),
        "unit_price": float(itm.unit_price),
        "total_price": float(itm.total_price)
    } for itm in refreshed_order.items]

    # Broadcast real-time order event
    try:
        await realtime_manager.broadcast("ORDER_UPDATED", {
            "order_id": refreshed_order.id,
            "order_number": refreshed_order.order_number,
            "status": refreshed_order.status,
            "total_amount": float(refreshed_order.total_amount),
            "customer_name": refreshed_order.customer.name if refreshed_order.customer else (data.customer_name or "Walk-in Customer")
        })
    except Exception:
        pass

    return {
        "id": refreshed_order.id,
        "business_id": refreshed_order.business_id,
        "customer_id": refreshed_order.customer_id,
        "customer_name": refreshed_order.customer.name if refreshed_order.customer else (data.customer_name or "Walk-in Customer"),
        "customer_phone": refreshed_order.customer.phone if refreshed_order.customer else data.customer_phone,
        "order_number": refreshed_order.order_number,
        "status": refreshed_order.status,
        "payment_status": refreshed_order.payment_status,
        "total_amount": float(refreshed_order.total_amount),
        "notes": refreshed_order.notes,
        "items": items,
        "created_at": refreshed_order.created_at,
        "updated_at": refreshed_order.updated_at
    }

@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    data: OrderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = (
        select(Order)
        .filter(Order.id == order_id, Order.business_id == current_user.business_id)
        .options(
            selectinload(Order.items).selectinload(OrderItem.product),
            selectinload(Order.customer)
        )
    )
    res = await db.execute(q)
    order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if data.status:
        order.status = data.status
    if data.payment_status:
        order.payment_status = data.payment_status
    if data.notes is not None:
        order.notes = data.notes

    await db.commit()
    await db.refresh(order)

    # Re-fetch with relations loaded
    res_ref = await db.execute(q)
    order_updated = res_ref.scalar_one()

    items = [{
        "id": itm.id,
        "product_id": itm.product_id,
        "product_name": itm.product.name if itm.product else "Kirana Item",
        "quantity": float(itm.quantity),
        "unit_price": float(itm.unit_price),
        "total_price": float(itm.total_price)
    } for itm in order_updated.items]

    # Broadcast real-time order status change
    try:
        await realtime_manager.broadcast("ORDER_UPDATED", {
            "order_id": order_updated.id,
            "order_number": order_updated.order_number,
            "status": order_updated.status,
            "total_amount": float(order_updated.total_amount),
            "customer_name": order_updated.customer.name if order_updated.customer else "Walk-in Customer"
        })
    except Exception:
        pass

    return {
        "id": order_updated.id,
        "business_id": order_updated.business_id,
        "customer_id": order_updated.customer_id,
        "customer_name": order_updated.customer.name if order_updated.customer else "Walk-in Customer",
        "customer_phone": order_updated.customer.phone if order_updated.customer else None,
        "order_number": order_updated.order_number,
        "status": order_updated.status,
        "payment_status": order_updated.payment_status,
        "total_amount": float(order_updated.total_amount),
        "notes": order_updated.notes,
        "items": items,
        "created_at": order_updated.created_at,
        "updated_at": order_updated.updated_at
    }
