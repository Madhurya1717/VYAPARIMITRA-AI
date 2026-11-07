import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Sale(Base):
    __tablename__ = "sales"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    invoice_number = Column(String(64), nullable=False, index=True)
    subtotal = Column(Numeric(12, 2), default=0.0, nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0.0, nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0.0, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.0, nullable=False)
    payment_method = Column(String(32), default="cash", nullable=False)  # cash, upi, credit
    status = Column(String(32), default="completed", nullable=False)  # completed, cancelled, refunded
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    business = relationship("Business", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="sale", uselist=False, cascade="all, delete-orphan")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sale_id = Column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sale_id = Column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    invoice_number = Column(String(64), unique=True, nullable=False, index=True)
    pdf_url = Column(String(512), nullable=True)
    qr_payload = Column(Text, nullable=True)  # For UPI payment QR code
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    sale = relationship("Sale", back_populates="invoice")
