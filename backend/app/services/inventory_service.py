import re
import json
import difflib
from decimal import Decimal
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, update, func, desc, asc
from fastapi import HTTPException, status

from backend.app.models.inventory import Product, Category, InventoryTransaction
from backend.app.models.audit import Notification
from backend.app.schemas.product import ProductCreate, ProductUpdate, InventoryAdjustRequest

from sqlalchemy.orm import selectinload

# Common bilingual grocery & kirana item phonetic synonyms
BILINGUAL_SYNONYMS = {
    "mehendi": ["మెహందీ", "mehndi", "mehandi", "గోరింటాకు", "cone", "cones", "mehendi cone"],
    "rice": ["బియ్యం", "వరి అన్నం", "biyyam", "sona masoori", "raw rice", "ric"],
    "dal": ["కందిపప్పు", "పప్పు", "toor dal", "kandi pappu", "red gram", "moong dal", "chana dal"],
    "oil": ["నూనె", "సన్‌ఫ్లవర్ నూనె", "sunflower oil", "noon", "cooking oil", "groundnut oil"],
    "sugar": ["పంచదార", "చక్కెర", "panchadara", "sweetener"],
    "salt": ["ఉప్పు", "టాటా ఉప్పు", "uppu"],
    "chilli": ["కారం", "కారం పొడి", "గుంటూరు కారం", "mirchi", "chilli powder"],
    "atta": ["గోధుమపిండి", "ఆశీర్వాద్ గోధుమపిండి", "godhumapindi", "flour", "wheat"],
    "soap": ["సబ్బు", "లైఫ్‌బాయ్", "డవ్", "లక్స్", "soaps", "bathing soap"],
    "milk": ["పాలు", "విజయ పాలు", "ప్యాకెట్ పాలు", "curd", "yogurt"]
}

class InventoryService:
    async def get_products(
        self,
        db: AsyncSession,
        business_id: str,
        category_id: Optional[str] = None,
        category_name: Optional[str] = None,
        search: Optional[str] = None,
        low_stock_only: bool = False,
        out_of_stock_only: bool = False,
        in_stock_only: bool = False,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_stock: Optional[float] = None,
        max_stock: Optional[float] = None,
        unit: Optional[str] = None,
        sort_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        query = select(Product, Category.name.label("category_name")).outerjoin(
            Category, Product.category_id == Category.id
        ).filter(Product.business_id == business_id, Product.is_active == True)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if category_name:
            query = query.filter(Category.name.ilike(f"%{category_name}%"))

        if low_stock_only:
            query = query.filter(Product.current_stock <= Product.low_stock_threshold)
        elif out_of_stock_only:
            query = query.filter(Product.current_stock <= 0)
        elif in_stock_only:
            query = query.filter(Product.current_stock > 0)

        if min_price is not None:
            query = query.filter(Product.selling_price >= Decimal(str(min_price)))
        if max_price is not None:
            query = query.filter(Product.selling_price <= Decimal(str(max_price)))

        if min_stock is not None:
            query = query.filter(Product.current_stock >= Decimal(str(min_stock)))
        if max_stock is not None:
            query = query.filter(Product.current_stock <= Decimal(str(max_stock)))

        if unit:
            query = query.filter(Product.unit.ilike(f"%{unit}%"))

        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Product.name.ilike(s),
                    Product.telugu_name.ilike(s),
                    Product.sku.ilike(s),
                    Product.aliases.ilike(s),
                    Category.name.ilike(s)
                )
            )

        if sort_by == "stock_desc":
            query = query.order_by(Product.current_stock.desc(), Product.name.asc())
        elif sort_by == "stock_asc":
            query = query.order_by(Product.current_stock.asc(), Product.name.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Product.selling_price.desc(), Product.name.asc())
        elif sort_by == "price_asc":
            query = query.order_by(Product.selling_price.asc(), Product.name.asc())
        else:
            query = query.order_by(Product.name.asc())

        if offset:
            query = query.offset(offset)
        if limit:
            query = query.limit(limit)

        result = await db.execute(query)
        rows = result.all()

        products = []
        for product, cat_name in rows:
            aliases_list = []
            if product.aliases:
                try:
                    aliases_list = json.loads(product.aliases) if isinstance(product.aliases, str) else product.aliases
                except Exception:
                    aliases_list = [product.aliases]

            products.append({
                "id": product.id,
                "business_id": product.business_id,
                "name": product.name,
                "telugu_name": product.telugu_name,
                "aliases": aliases_list,
                "category_id": product.category_id,
                "category_name": cat_name,
                "sku": product.sku,
                "current_stock": float(product.current_stock),
                "unit": product.unit,
                "cost_price": float(product.cost_price),
                "selling_price": float(product.selling_price),
                "low_stock_threshold": float(product.low_stock_threshold),
                "is_active": product.is_active,
                "is_low_stock": float(product.current_stock) <= float(product.low_stock_threshold),
                "is_out_of_stock": float(product.current_stock) <= 0,
                "created_at": product.created_at,
                "updated_at": product.updated_at
            })
        return products

    async def query_inventory(
        self,
        db: AsyncSession,
        business_id: str,
        search: Optional[str] = None,
        category_name: Optional[str] = None,
        category_id: Optional[str] = None,
        stock_status: Optional[str] = None,  # "all", "in_stock", "low_stock", "out_of_stock", "needs_restock"
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_stock: Optional[float] = None,
        max_stock: Optional[float] = None,
        unit: Optional[str] = None,
        sort_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = 0
    ) -> Dict[str, Any]:
        """
        Comprehensive authoritative inventory query engine.
        Returns complete merchant inventory statistics and filtered product results
        without silent truncation.
        """
        # Store totals for this business
        all_store_query = select(Product).filter(
            Product.business_id == business_id, Product.is_active == True
        )
        all_res = await db.execute(all_store_query)
        all_store_products = all_res.scalars().all()

        total_store_products = len(all_store_products)
        total_store_valuation = sum(float(p.current_stock * p.cost_price) for p in all_store_products)
        store_available_count = sum(1 for p in all_store_products if p.current_stock > 0)
        store_out_of_stock_count = sum(1 for p in all_store_products if p.current_stock <= 0)
        store_low_stock_count = sum(1 for p in all_store_products if p.current_stock <= p.low_stock_threshold)

        # Build filtered query
        filtered_query = select(Product, Category.name.label("category_name")).outerjoin(
            Category, Product.category_id == Category.id
        ).filter(Product.business_id == business_id, Product.is_active == True)

        if category_id:
            filtered_query = filtered_query.filter(Product.category_id == category_id)

        if category_name:
            filtered_query = filtered_query.filter(
                or_(
                    Category.name.ilike(f"%{category_name}%"),
                    Product.name.ilike(f"%{category_name}%")
                )
            )

        if stock_status == "out_of_stock":
            filtered_query = filtered_query.filter(Product.current_stock <= 0)
        elif stock_status in ["low_stock", "needs_restock"]:
            filtered_query = filtered_query.filter(Product.current_stock <= Product.low_stock_threshold)
        elif stock_status == "in_stock":
            filtered_query = filtered_query.filter(Product.current_stock > 0)

        if min_price is not None:
            filtered_query = filtered_query.filter(Product.selling_price >= Decimal(str(min_price)))
        if max_price is not None:
            filtered_query = filtered_query.filter(Product.selling_price <= Decimal(str(max_price)))

        if min_stock is not None:
            filtered_query = filtered_query.filter(Product.current_stock >= Decimal(str(min_stock)))
        if max_stock is not None:
            filtered_query = filtered_query.filter(Product.current_stock <= Decimal(str(max_stock)))

        if unit:
            filtered_query = filtered_query.filter(
                or_(
                    Product.unit.ilike(f"%{unit}%"),
                    Product.name.ilike(f"%{unit}%")
                )
            )

        if search:
            s = f"%{search}%"
            filtered_query = filtered_query.filter(
                or_(
                    Product.name.ilike(s),
                    Product.telugu_name.ilike(s),
                    Product.sku.ilike(s),
                    Product.aliases.ilike(s),
                    Category.name.ilike(s)
                )
            )

        if sort_by == "stock_desc":
            filtered_query = filtered_query.order_by(Product.current_stock.desc(), Product.name.asc())
        elif sort_by == "stock_asc":
            filtered_query = filtered_query.order_by(Product.current_stock.asc(), Product.name.asc())
        elif sort_by == "price_desc":
            filtered_query = filtered_query.order_by(Product.selling_price.desc(), Product.name.asc())
        elif sort_by == "price_asc":
            filtered_query = filtered_query.order_by(Product.selling_price.asc(), Product.name.asc())
        else:
            filtered_query = filtered_query.order_by(Product.name.asc())

        result = await db.execute(filtered_query)
        matched_rows = result.all()

        total_matching = len(matched_rows)
        matching_available = sum(1 for p, _ in matched_rows if p.current_stock > 0)
        matching_out_of_stock = sum(1 for p, _ in matched_rows if p.current_stock <= 0)
        matching_low_stock = sum(1 for p, _ in matched_rows if p.current_stock <= p.low_stock_threshold)
        matching_valuation = sum(float(p.current_stock * p.cost_price) for p, _ in matched_rows)

        # Slice for pagination if specified, else return all matching
        selected_rows = matched_rows
        if limit is not None:
            off = offset or 0
            selected_rows = matched_rows[off : off + limit]

        formatted_products = []
        for product, cat_name in selected_rows:
            aliases_list = []
            if product.aliases:
                try:
                    aliases_list = json.loads(product.aliases) if isinstance(product.aliases, str) else product.aliases
                except Exception:
                    aliases_list = [product.aliases]

            cur_stk = float(product.current_stock)
            thresh = float(product.low_stock_threshold)
            status_label = "out_of_stock" if cur_stk <= 0 else ("low_stock" if cur_stk <= thresh else "in_stock")

            formatted_products.append({
                "id": product.id,
                "business_id": product.business_id,
                "name": product.name,
                "telugu_name": product.telugu_name,
                "aliases": aliases_list,
                "category_id": product.category_id,
                "category_name": cat_name,
                "sku": product.sku,
                "current_stock": cur_stk,
                "unit": product.unit,
                "cost_price": float(product.cost_price),
                "selling_price": float(product.selling_price),
                "low_stock_threshold": thresh,
                "stock_status": status_label,
                "is_low_stock": cur_stk <= thresh,
                "is_out_of_stock": cur_stk <= 0,
                "created_at": product.created_at,
                "updated_at": product.updated_at
            })

        return {
            "total_store_products": total_store_products,
            "total_store_valuation": round(total_store_valuation, 2),
            "store_available_count": store_available_count,
            "store_out_of_stock_count": store_out_of_stock_count,
            "store_low_stock_count": store_low_stock_count,
            "total_matching": total_matching,
            "available_count": matching_available,
            "out_of_stock_count": matching_out_of_stock,
            "low_stock_count": matching_low_stock,
            "valuation": round(matching_valuation, 2),
            "products": formatted_products,
            "returned_count": len(formatted_products),
            "is_truncated": False,
            "filters_applied": {
                "search": search,
                "category_name": category_name,
                "category_id": category_id,
                "stock_status": stock_status,
                "min_price": min_price,
                "max_price": max_price,
                "min_stock": min_stock,
                "max_stock": max_stock,
                "unit": unit,
                "sort_by": sort_by
            }
        }

    async def find_products(
        self,
        db: AsyncSession,
        business_id: str,
        query_text: str
    ) -> Dict[str, Any]:
        """
        Intelligent product finder for voice assistant.
        Accurately identifies exact matches, multi-matches, genuine similar products,
        and unlisted products according to merchant database truth.
        """
        q_raw = query_text.strip()
        q_lower = q_raw.lower()

        # Fetch all active products for this merchant
        products = await self.get_products(db, business_id)
        if not products:
            return {
                "status": "UNLISTED",
                "query": q_raw,
                "product": None,
                "matches": [],
                "match_count": 0,
                "similar_products": [],
                "message": f"Sorry, {q_raw} is currently not available in your store."
            }

        # 1. Direct and Alias Matches
        direct_matches = []
        q_words = [w.rstrip('s') for w in q_lower.split() if len(w) > 2 and w not in ["the", "any", "some", "available", "store", "shop"]]

        for p in products:
            p_name = p["name"].lower()
            p_telugu = (p["telugu_name"] or "").lower()
            p_aliases = [str(a).lower() for a in p["aliases"]]

            # Exact name or alias
            if q_lower == p_name or q_raw == (p.get("telugu_name") or "") or any(q_lower == a for a in p_aliases):
                direct_matches.append(p)
                continue

            # Check if all significant query words are present in product name / telugu name / aliases
            if q_words:
                all_words_match = True
                for qw in q_words:
                    word_found = (
                        re.search(r'\b' + re.escape(qw), p_name) is not None or
                        (p_telugu and qw in p_telugu) or
                        any(qw in a for a in p_aliases)
                    )
                    # Also check synonyms for this word
                    if not word_found:
                        for k, syns in BILINGUAL_SYNONYMS.items():
                            if qw == k or qw in syns:
                                if k in p_name or any(s in p_name or s in p_telugu for s in syns if len(s) > 3):
                                    word_found = True
                                    break
                    if not word_found:
                        all_words_match = False
                        break

                if all_words_match:
                    direct_matches.append(p)
                    continue

        # De-duplicate matches
        seen_ids = set()
        unique_matches = []
        for m in direct_matches:
            if m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                unique_matches.append(m)

        if unique_matches:
            if len(unique_matches) == 1:
                single_prod = unique_matches[0]
                stk = single_prod["current_stock"]
                thresh = single_prod["low_stock_threshold"]
                if stk <= 0:
                    status_type = "OUT_OF_STOCK"
                elif stk <= thresh:
                    status_type = "LOW_STOCK"
                else:
                    status_type = "AVAILABLE"
                return {
                    "status": status_type,
                    "query": q_raw,
                    "product": single_prod,
                    "matches": unique_matches,
                    "match_count": 1,
                    "similar_products": [],
                    "message": None
                }
            else:
                return {
                    "status": "MULTIPLE_MATCHES",
                    "query": q_raw,
                    "product": unique_matches[0],
                    "matches": unique_matches,
                    "match_count": len(unique_matches),
                    "similar_products": [],
                    "message": f"Found {len(unique_matches)} matching products in your store."
                }

        # 2. Check Genuine Similar Products in DB (When partial words or related tokens match)
        similar_items = []
        tokens = [t.rstrip('s') for t in q_lower.split() if len(t) > 2 and t not in ["show", "what", "have", "with", "stock", "check", "rate", "cost", "price", "the", "any", "some"]]
        for p in products:
            p_name = p["name"].lower()
            p_telugu = (p["telugu_name"] or "").lower()

            # Partial token match (e.g. "rice" matches "Sona Masoori Rice")
            matched_partial = False
            for t in tokens:
                if re.search(r'\b' + re.escape(t), p_name):
                    matched_partial = True
                    break
                for k, syns in BILINGUAL_SYNONYMS.items():
                    if t == k or t in syns:
                        if k in p_name or any(s in p_name or s in p_telugu for s in syns if len(s) > 3):
                            matched_partial = True
                            break
                if matched_partial:
                    break

            if matched_partial:
                similar_items.append(p)
                continue

            ratio = difflib.SequenceMatcher(None, q_lower, p_name).ratio()
            if ratio >= 0.58:
                similar_items.append(p)

        # De-duplicate similar items
        seen_sim = set()
        unique_sim = []
        for s in similar_items:
            if s["id"] not in seen_sim:
                seen_sim.add(s["id"])
                unique_sim.append(s)

        if unique_sim:
            return {
                "status": "SIMILAR_FOUND",
                "query": q_raw,
                "product": None,
                "matches": [],
                "match_count": 0,
                "similar_products": unique_sim[:6],
                "message": f"No exact match found, but found {len(unique_sim)} similar products."
            }

        return {
            "status": "UNLISTED",
            "query": q_raw,
            "product": None,
            "matches": [],
            "match_count": 0,
            "similar_products": [],
            "message": f"Sorry, {q_raw} is currently not available in your store."
        }

    async def get_categories_summary(self, db: AsyncSession, business_id: str) -> List[Dict[str, Any]]:
        query = select(
            Category.id,
            Category.name,
            Category.description,
            func.count(Product.id).label("product_count")
        ).outerjoin(
            Product, and_(Product.category_id == Category.id, Product.business_id == business_id, Product.is_active == True)
        ).filter(
            Category.business_id == business_id
        ).group_by(
            Category.id, Category.name, Category.description
        ).order_by(
            func.count(Product.id).desc(), Category.name.asc()
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            {
                "id": r[0],
                "name": r[1],
                "description": r[2],
                "product_count": r[3]
            }
            for r in rows
        ]

    async def get_product_by_id(self, db: AsyncSession, business_id: str, product_id: str) -> Optional[Product]:
        result = await db.execute(
            select(Product).options(selectinload(Product.category)).filter(Product.id == product_id, Product.business_id == business_id)
        )
        return result.scalar_one_or_none()

    async def create_product(self, db: AsyncSession, business_id: str, data: ProductCreate) -> Product:
        aliases_json = json.dumps(data.aliases or [])
        
        # If Telugu title is not provided, automatically generate an accurate natural Telugu title
        telugu_name = (data.telugu_name or "").strip()
        if not telugu_name:
            from backend.app.services.telugu_translator import translate_product_to_telugu
            telugu_name = translate_product_to_telugu(data.name)

        product = Product(
            business_id=business_id,
            name=data.name,
            telugu_name=telugu_name,
            aliases=aliases_json,
            category_id=data.category_id,
            sku=data.sku,
            current_stock=data.current_stock,
            unit=data.unit,
            cost_price=data.cost_price,
            selling_price=data.selling_price,
            low_stock_threshold=data.low_stock_threshold,
            is_active=data.is_active
        )
        db.add(product)
        await db.flush()

        # Log initial inventory transaction if starting stock > 0
        if data.current_stock > 0:
            tx = InventoryTransaction(
                business_id=business_id,
                product_id=product.id,
                type="IN",
                quantity=data.current_stock,
                balance_after=data.current_stock,
                unit_price=data.cost_price,
                reference_type="initial_setup",
                notes="Initial product registration"
            )
            db.add(tx)

        await db.commit()
        await db.refresh(product)
        return product

    async def update_product(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: str,
        data: ProductUpdate
    ) -> Optional[Product]:
        """
        Updates product attributes, maintaining business tenant isolation.
        """
        product = await self.get_product_by_id(db, business_id, product_id)
        if not product:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        if "aliases" in update_dict and update_dict["aliases"] is not None:
            update_dict["aliases"] = json.dumps(update_dict["aliases"])

        for key, value in update_dict.items():
            setattr(product, key, value)

        await db.commit()
        await db.refresh(product)
        return product

    async def delete_product(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: str
    ) -> bool:
        """
        Soft-deletes product by setting is_active=False to preserve sales history and audit transactions.
        """
        product = await self.get_product_by_id(db, business_id, product_id)
        if not product:
            return False

        product.is_active = False
        await db.commit()
        return True

    async def adjust_stock(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: str,
        quantity_delta: Decimal,
        tx_type: str = "ADJUSTMENT",
        reference_type: str = "manual",
        reference_id: Optional[str] = None,
        unit_price: Optional[Decimal] = None,
        notes: Optional[str] = None
    ) -> Tuple[bool, Product, Optional[str]]:
        """
        Atomic stock adjustment with full audit ledger tracking.
        Returns: (success, updated_product, error_message)
        """
        product = await self.get_product_by_id(db, business_id, product_id)
        if not product:
            return False, None, "Product not found"

        new_stock = product.current_stock + quantity_delta
        if new_stock < 0:
            return False, product, f"Insufficient stock. Available: {product.current_stock} {product.unit}"

        product.current_stock = new_stock

        tx = InventoryTransaction(
            business_id=business_id,
            product_id=product.id,
            type=tx_type,
            quantity=quantity_delta,
            balance_after=new_stock,
            unit_price=unit_price or product.selling_price,
            reference_type=reference_type,
            reference_id=reference_id,
            notes=notes
        )
        db.add(tx)

        # Trigger low stock notification if balance crosses threshold downwards
        if new_stock <= product.low_stock_threshold and quantity_delta < 0:
            notif = Notification(
                business_id=business_id,
                title=f"Low Stock Alert: {product.name}",
                message=f"Stock for {product.name} ({product.telugu_name or ''}) has dropped to {new_stock} {product.unit}. Threshold is {product.low_stock_threshold} {product.unit}.",
                type="warning"
            )
            db.add(notif)

        await db.commit()
        await db.refresh(product)
        return True, product, None

    async def get_inventory_transactions(
        self,
        db: AsyncSession,
        business_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = select(InventoryTransaction, Product.name.label("product_name")).join(
            Product, InventoryTransaction.product_id == Product.id
        ).filter(
            InventoryTransaction.business_id == business_id
        ).order_by(
            InventoryTransaction.created_at.desc()
        ).limit(limit)

        result = await db.execute(query)
        rows = result.all()

        transactions = []
        for tx, product_name in rows:
            transactions.append({
                "id": tx.id,
                "business_id": tx.business_id,
                "product_id": tx.product_id,
                "product_name": product_name,
                "type": tx.type,
                "quantity": float(tx.quantity),
                "balance_after": float(tx.balance_after),
                "unit_price": float(tx.unit_price) if tx.unit_price else None,
                "reference_type": tx.reference_type,
                "notes": tx.notes,
                "created_at": tx.created_at
            })
        return transactions

inventory_service = InventoryService()
