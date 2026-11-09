"""
VyapariMitra AI — Idempotent Grocery Catalogue Import Script
Imports the prepared 1,000 grocery items from backend/data/vyaparimitra_grocery_catalogue.csv
into the Supabase PostgreSQL (or local fallback) database for the demo merchant store.
"""

import os
import sys
import csv
import asyncio
from decimal import Decimal

# Add root directory to sys.path so backend imports work properly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from sqlalchemy.future import select
from backend.app.core.database import AsyncSessionLocal, engine, Base
from backend.app.models.business import Business, User
from backend.app.models.inventory import Product, Category

CSV_FILE = os.path.join(ROOT_DIR, "backend", "data", "vyaparimitra_grocery_catalogue.csv")

async def import_catalogue():
    print("=" * 70)
    print("VyapariMitra AI — Grocery Catalogue Database Importer")
    print("=" * 70)

    if not os.path.exists(CSV_FILE):
        print(f"[ERROR] Catalogue CSV not found at: {CSV_FILE}")
        print("Please run backend/scripts/prepare_grocery_dataset.py first.")
        return

    # Ensure tables exist and run additive migrations for existing tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Execute additive migrations for Supabase PostgreSQL
        from sqlalchemy import text
        try:
            await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS external_product_id VARCHAR(64);"))
            await conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS department VARCHAR(120);"))
            await conn.execute(text("ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT FALSE;"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_products_external_product_id ON products (external_product_id);"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sales_is_simulation ON sales (is_simulation);"))
        except Exception as mig_err:
            print(f"[MIGRATION NOTE] Schema migration notice: {mig_err}")

    async with AsyncSessionLocal() as session:
        # Find demo merchant business (Sri Lakshmi Kirana & General Stores)
        b_res = await session.execute(
            select(Business).filter(Business.name.ilike("%Lakshmi%")).limit(1)
        )
        business = b_res.scalar_one_or_none()

        if not business:
            # Fallback to any business or create one
            b_res_any = await session.execute(select(Business).limit(1))
            business = b_res_any.scalar_one_or_none()

        if not business:
            print("[ERROR] No business found in database. Please run initial seed first.")
            return

        print(f"[TARGET BUSINESS] {business.name} (ID: {business.id})")

        # Load existing categories for this business into memory cache
        cat_res = await session.execute(
            select(Category).filter(Category.business_id == business.id)
        )
        category_map = {c.name.lower(): c.id for c in cat_res.scalars().all()}

        # Load existing external_product_ids for this business to ensure strict idempotency
        prod_res = await session.execute(
            select(Product.external_product_id).filter(
                Product.business_id == business.id,
                Product.external_product_id.isnot(None)
            )
        )
        existing_ext_ids = {row[0] for row in prod_res.all() if row[0]}
        print(f"[CACHE] Found {len(existing_ext_ids)} already imported products.")

        # Read CSV
        items_to_insert = []
        skipped_count = 0
        new_categories_created = 0

        with open(CSV_FILE, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ext_id = row["external_product_id"].strip()
                if ext_id in existing_ext_ids:
                    skipped_count += 1
                    continue

                category_name = row["category"].strip()
                cat_key = category_name.lower()

                # Ensure category exists
                if cat_key not in category_map:
                    new_cat = Category(
                        business_id=business.id,
                        name=category_name,
                        description=f"Grocery items under {category_name}"
                    )
                    session.add(new_cat)
                    await session.flush()
                    category_map[cat_key] = new_cat.id
                    new_categories_created += 1

                cat_id = category_map[cat_key]

                # Create product
                product = Product(
                    business_id=business.id,
                    category_id=cat_id,
                    name=row["name"].strip(),
                    telugu_name=row.get("telugu_name", "").strip() or None,
                    external_product_id=ext_id,
                    department=row.get("department", "General"),
                    unit=row["unit"].strip(),
                    cost_price=Decimal(str(row["cost_price"])),
                    selling_price=Decimal(str(row["selling_price"])),
                    current_stock=Decimal(str(row["stock_quantity"])),
                    low_stock_threshold=Decimal(str(row["low_stock_threshold"])),
                    is_active=True
                )
                items_to_insert.append(product)

                if len(items_to_insert) >= 100:
                    session.add_all(items_to_insert)
                    await session.commit()
                    print(f"  Committed batch of {len(items_to_insert)} products...")
                    items_to_insert.clear()

            if items_to_insert:
                session.add_all(items_to_insert)
                await session.commit()
                print(f"  Committed final batch of {len(items_to_insert)} products.")

        # Total verification count
        total_res = await session.execute(
            select(Product).filter(Product.business_id == business.id)
        )
        total_products = len(total_res.scalars().all())

        print("=" * 70)
        print(f"[SUMMARY] New Categories Created : {new_categories_created}")
        print(f"[SUMMARY] New Products Inserted  : {1000 - skipped_count}")
        print(f"[SUMMARY] Existing Products Skipped: {skipped_count}")
        print(f"[SUMMARY] Total Products in Store: {total_products}")
        print("=" * 70)

if __name__ == "__main__":
    asyncio.run(import_catalogue())
