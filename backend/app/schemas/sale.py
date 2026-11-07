from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class SaleItemCreate(BaseModel):
    product_id: str
    quantity: Decimal
    unit_price: Optional[Decimal] = None

class SaleItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    quantity: float
    unit_price: float
    total_price: float
    model_config = ConfigDict(from_attributes=True)

class SaleCreate(BaseModel):
    customer_id: Optional[str] = None
    items: List[SaleItemCreate]
    discount_amount: Decimal = Field(default=Decimal("0.0"))
    tax_amount: Decimal = Field(default=Decimal("0.0"))
    payment_method: str = "cash"  # cash, upi, credit
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    pdf_url: Optional[str] = None
    qr_payload: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SaleResponse(BaseModel):
    id: str
    business_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    invoice_number: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    payment_method: str
    status: str
    notes: Optional[str] = None
    items: List[SaleItemResponse] = []
    invoice: Optional[InvoiceResponse] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
