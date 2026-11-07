from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.business import User
from backend.app.models.orders import Customer
from backend.app.schemas.order import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Customer).filter(Customer.business_id == current_user.business_id)
    if search:
        s = f"%{search}%"
        query = query.filter((Customer.name.ilike(s)) | (Customer.phone.ilike(s)))
    query = query.order_by(Customer.name.asc())
    res = await db.execute(query)
    customers = res.scalars().all()
    return customers

@router.post("", response_model=CustomerResponse)
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    customer = Customer(
        business_id=current_user.business_id,
        name=data.name,
        phone=data.phone,
        email=data.email,
        address=data.address
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer
