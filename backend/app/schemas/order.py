from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: str
    business_id: str
    total_purchases: float
    credit_balance: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: Decimal
    unit_price: Optional[Decimal] = None

class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    quantity: float
    unit_price: float
    total_price: float
    model_config = ConfigDict(from_attributes=True)

class OrderCreate(BaseModel):
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    items: List[OrderItemCreate]
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: Optional[str] = None  # pending, ready, fulfilled, cancelled
    payment_status: Optional[str] = None  # unpaid, paid, partially_paid
    notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    business_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    order_number: str
    status: str
    payment_status: str
    total_amount: float
    notes: Optional[str] = None
    items: List[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
