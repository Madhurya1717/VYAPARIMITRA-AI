from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: str
    business_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str
    telugu_name: Optional[str] = None
    aliases: Optional[List[str]] = []
    category_id: Optional[str] = None
    sku: Optional[str] = None
    current_stock: Decimal = Field(default=Decimal("0.0"))
    unit: str = "kg"
    cost_price: Decimal = Field(default=Decimal("0.0"))
    selling_price: Decimal = Field(default=Decimal("0.0"))
    low_stock_threshold: Decimal = Field(default=Decimal("10.0"))
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    telugu_name: Optional[str] = None
    aliases: Optional[List[str]] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    current_stock: Optional[Decimal] = None
    unit: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    low_stock_threshold: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    id: str
    business_id: str
    name: str
    telugu_name: Optional[str] = None
    aliases: List[str] = []
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    sku: Optional[str] = None
    current_stock: float
    unit: str
    cost_price: float
    selling_price: float
    low_stock_threshold: float
    is_active: bool
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class InventoryAdjustRequest(BaseModel):
    product_id: str
    type: str = "ADJUSTMENT"  # IN, OUT, ADJUSTMENT
    quantity: Decimal
    unit_price: Optional[Decimal] = None
    notes: Optional[str] = None

class InventoryTransactionResponse(BaseModel):
    id: str
    business_id: str
    product_id: str
    product_name: Optional[str] = None
    type: str
    quantity: float
    balance_after: float
    unit_price: Optional[float] = None
    reference_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
