import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(
    DateTime,
    default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    nullable=False
    )

    business = relationship("Business", back_populates="categories")
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    telugu_name = Column(String(255), nullable=True, index=True)
    aliases = Column(Text, default="[]", nullable=False)  # JSON array of alternative names/spellings
    sku = Column(String(64), nullable=True)
    external_product_id = Column(String(64), nullable=True, index=True)
    department = Column(String(120), nullable=True)
    current_stock = Column(Numeric(12, 3), default=0.0, nullable=False)
    unit = Column(String(20), default="kg", nullable=False)  # kg, litre, packet, piece, bag
    cost_price = Column(Numeric(10, 2), default=0.0, nullable=False)
    selling_price = Column(Numeric(10, 2), default=0.0, nullable=False)
    low_stock_threshold = Column(Numeric(12, 3), default=10.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
    DateTime,
    default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    nullable=False
    )

    updated_at = Column(
    DateTime,
    default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    nullable=False
    )

    business = relationship("Business", back_populates="products")
    category = relationship("Category", back_populates="products")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product", cascade="all, delete-orphan")
    sale_items = relationship("SaleItem", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(32), nullable=False)  # IN, OUT, ADJUSTMENT, RETURN
    quantity = Column(Numeric(12, 3), nullable=False)  # + for stock added, - for stock deducted
    balance_after = Column(Numeric(12, 3), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=True)
    reference_type = Column(String(32), nullable=True)  # sale, manual, voice_command, purchase_order
    reference_id = Column(String(36), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(
    DateTime,
    default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    nullable=False
)

    business = relationship("Business", back_populates="inventory_transactions")
    product = relationship("Product", back_populates="inventory_transactions")

