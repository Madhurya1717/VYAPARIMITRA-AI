import json
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.business import User
from backend.app.models.inventory import Category, Product
from backend.app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    CategoryCreate, CategoryResponse, InventoryAdjustRequest,
    InventoryTransactionResponse
)
from backend.app.services.inventory_service import inventory_service

router = APIRouter(prefix="/products", tags=["Inventory & Products"])

@router.get("", response_model=List[ProductResponse])
async def list_products(
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    products = await inventory_service.get_products(
        db=db,
        business_id=current_user.business_id,
        category_id=category_id,
        search=search,
        low_stock_only=low_stock_only
    )
    return products

@router.post("", response_model=ProductResponse)
async def create_product(
    data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prod = await inventory_service.create_product(
        db=db,
        business_id=current_user.business_id,
        data=data
    )
    # Refresh and return detailed product response
    products = await inventory_service.get_products(db, current_user.business_id, search=prod.name)
    for p in products:
        if p["id"] == prod.id:
            return p
    return {
        "id": prod.id,
        "business_id": prod.business_id,
        "name": prod.name,
        "telugu_name": prod.telugu_name,
        "aliases": json.loads(prod.aliases) if prod.aliases else [],
        "category_id": prod.category_id,
        "category_name": None,
        "sku": prod.sku,
        "current_stock": float(prod.current_stock),
        "unit": prod.unit,
        "cost_price": float(prod.cost_price),
        "selling_price": float(prod.selling_price),
        "low_stock_threshold": float(prod.low_stock_threshold),
        "is_active": prod.is_active,
        "is_low_stock": float(prod.current_stock) <= float(prod.low_stock_threshold),
        "created_at": prod.created_at,
        "updated_at": prod.updated_at
    }

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Category).filter(Category.business_id == current_user.business_id).order_by(Category.name.asc())
    )
    return res.scalars().all()

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    cat = Category(
        business_id=current_user.business_id,
        name=data.name,
        description=data.description
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return cat

@router.get("/transactions", response_model=List[InventoryTransactionResponse])
async def get_transactions(
    limit: int = Query(default=50, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await inventory_service.get_inventory_transactions(db, current_user.business_id, limit=limit)

@router.post("/{product_id}/adjust-stock")
async def adjust_stock(
    product_id: str,
    data: InventoryAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    delta = data.quantity if data.type == "IN" else -abs(data.quantity)
    success, prod, err = await inventory_service.adjust_stock(
        db=db,
        business_id=current_user.business_id,
        product_id=product_id,
        quantity_delta=delta,
        tx_type=data.type,
        reference_type="manual_adjustment",
        notes=data.notes
    )
    if not success:
        raise HTTPException(status_code=400, detail=err)
    return {
        "success": True,
        "product_id": prod.id,
        "name": prod.name,
        "new_stock": float(prod.current_stock),
        "unit": prod.unit
    }

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prod = await inventory_service.get_product_by_id(db, current_user.business_id, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    aliases_list = json.loads(prod.aliases) if prod.aliases else []
    return {
        "id": prod.id,
        "business_id": prod.business_id,
        "name": prod.name,
        "telugu_name": prod.telugu_name,
        "aliases": aliases_list,
        "category_id": prod.category_id,
        "category_name": prod.category.name if prod.category else None,
        "sku": prod.sku,
        "current_stock": float(prod.current_stock),
        "unit": prod.unit,
        "cost_price": float(prod.cost_price),
        "selling_price": float(prod.selling_price),
        "low_stock_threshold": float(prod.low_stock_threshold),
        "is_active": prod.is_active,
        "is_low_stock": float(prod.current_stock) <= float(prod.low_stock_threshold),
        "created_at": prod.created_at,
        "updated_at": prod.updated_at
    }

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    prod = await inventory_service.update_product(
        db=db,
        business_id=current_user.business_id,
        product_id=product_id,
        data=data
    )
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    aliases_list = json.loads(prod.aliases) if prod.aliases else []
    return {
        "id": prod.id,
        "business_id": prod.business_id,
        "name": prod.name,
        "telugu_name": prod.telugu_name,
        "aliases": aliases_list,
        "category_id": prod.category_id,
        "category_name": prod.category.name if prod.category else None,
        "sku": prod.sku,
        "current_stock": float(prod.current_stock),
        "unit": prod.unit,
        "cost_price": float(prod.cost_price),
        "selling_price": float(prod.selling_price),
        "low_stock_threshold": float(prod.low_stock_threshold),
        "is_active": prod.is_active,
        "is_low_stock": float(prod.current_stock) <= float(prod.low_stock_threshold),
        "created_at": prod.created_at,
        "updated_at": prod.updated_at
    }

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    success = await inventory_service.delete_product(
        db=db,
        business_id=current_user.business_id,
        product_id=product_id
    )
    if not success:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True, "message": "Product deactivated successfully"}


