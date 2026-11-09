"""
VyapariMitra AI — Autonomous Grocery Dataset Acquisition & Preparation Script
Downloads real grocery catalog and market basket data from Instacart dataset mirror on Hugging Face,
normalizes and enhances it with realistic Indian Kirana/Grocery store pricing and stock,
and exports:
1. backend/data/vyaparimitra_grocery_catalogue.csv (1000 products with categories, INR pricing, stock)
2. backend/data/simulation_baskets.json (Real customer baskets for live merchant sales simulation)
"""

import os
import sys
import csv
import json
import random
import urllib.request
from collections import defaultdict, Counter

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")

HF_BASE_URL = "https://huggingface.co/datasets/yaocg112324424233/Instacart-Market-Basket-Analysis/resolve/main"

FILES = {
    "aisles.csv": f"{HF_BASE_URL}/aisles.csv",
    "departments.csv": f"{HF_BASE_URL}/departments.csv",
    "products.csv": f"{HF_BASE_URL}/products.csv",
    "order_products__train.csv": f"{HF_BASE_URL}/order_products__train.csv",
}

# Pricing profiles in INR by department (min_price, max_price, default_unit)
DEPT_PROFILES = {
    "produce": (20.0, 140.0, "kg"),
    "dairy eggs": (25.0, 160.0, "packet"),
    "bakery": (25.0, 95.0, "packet"),
    "beverages": (20.0, 180.0, "bottle"),
    "snacks": (15.0, 120.0, "packet"),
    "pantry": (40.0, 260.0, "kg"),
    "canned goods": (45.0, 190.0, "can"),
    "frozen": (60.0, 290.0, "packet"),
    "meat seafood": (120.0, 450.0, "kg"),
    "deli": (50.0, 220.0, "packet"),
    "breakfast": (35.0, 210.0, "box"),
    "dry goods pasta": (30.0, 180.0, "packet"),
    "household": (30.0, 250.0, "piece"),
    "personal care": (35.0, 280.0, "piece"),
    "international": (50.0, 320.0, "packet"),
    "other": (25.0, 150.0, "piece"),
    "missing": (25.0, 150.0, "piece"),
}

def download_file(url: str, dest_path: str, max_bytes: int = None):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"[CACHE] {os.path.basename(dest_path)} exists ({os.path.getsize(dest_path):,} bytes). Skipping download.")
        return

    print(f"[DOWNLOAD] Downloading {os.path.basename(dest_path)} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VyapariMitra/1.0"}
    req = urllib.request.Request(url, headers=headers)

    with urllib.request.urlopen(req, timeout=60) as response, open(dest_path, "wb") as out_file:
        downloaded = 0
        chunk_size = 64 * 1024
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if max_bytes and downloaded >= max_bytes:
                print(f"  Reached sample limit of {max_bytes:,} bytes.")
                break
            if downloaded % (512 * 1024) == 0:
                print(f"  Downloaded {downloaded // 1024:,} KB...", end="\r")

    print(f"\n[DOWNLOAD] Successfully saved {os.path.basename(dest_path)} ({os.path.getsize(dest_path):,} bytes).")

def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    random.seed(42)  # Deterministic pricing & stock

    # Step 1: Download necessary files
    for filename, url in FILES.items():
        dest = os.path.join(RAW_DIR, filename)
        # Download files (train orders is ~24MB, products is ~2MB, aisles/dept are <5KB)
        download_file(url, dest)

    # Step 2: Load aisles
    aisles = {}
    with open(os.path.join(RAW_DIR, "aisles.csv"), mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            aisles[row["aisle_id"]] = row["aisle"].strip().title()

    # Step 3: Load departments
    departments = {}
    with open(os.path.join(RAW_DIR, "departments.csv"), mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            departments[row["department_id"]] = row["department"].strip().lower()

    # Step 4: Count product popularity from order_products__train.csv
    print("[PROCESSING] Analyzing order frequency in order_products__train.csv...")
    product_freq = Counter()
    order_baskets_raw = defaultdict(list)

    with open(os.path.join(RAW_DIR, "order_products__train.csv"), mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            p_id = row["product_id"]
            o_id = row["order_id"]
            product_freq[p_id] += 1
            if len(order_baskets_raw) < 5000:
                order_baskets_raw[o_id].append(p_id)
            count += 1

    print(f"[PROCESSING] Scanned {count:,} order line-items across {len(order_baskets_raw):,} orders.")

    # Step 5: Load products and select top 1000 items
    print("[PROCESSING] Loading products catalogue...")
    all_products = {}
    with open(os.path.join(RAW_DIR, "products.csv"), mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            all_products[row["product_id"]] = row

    # Sort products by frequency in orders, picking top 1000 most popular items
    sorted_product_ids = sorted(
        all_products.keys(),
        key=lambda pid: product_freq.get(pid, 0),
        reverse=True
    )[:1000]

    print(f"[PROCESSING] Selected top {len(sorted_product_ids)} most popular grocery products.")

    # Step 6: Generate enhanced catalogue
    selected_set = set(sorted_product_ids)
    catalogue_rows = []

    for pid in sorted_product_ids:
        raw_prod = all_products[pid]
        p_name = raw_prod["product_name"].strip()
        aisle_id = raw_prod["aisle_id"]
        dept_id = raw_prod["department_id"]

        category_name = aisles.get(aisle_id, "General Grocery")
        dept_name = departments.get(dept_id, "other")

        min_p, max_p, default_unit = DEPT_PROFILES.get(dept_name, (25.0, 150.0, "packet"))
        
        # Consistent deterministic price
        name_hash = abs(hash(p_name))
        price_range = max_p - min_p
        raw_price = min_p + ((name_hash % 1000) / 1000.0) * price_range
        # Round to nearest 5 or 0 for realistic Indian retail prices
        selling_price = round(round(raw_price / 5.0) * 5.0, 2)
        if selling_price < 10.0:
            selling_price = 15.0

        cost_price = round(selling_price * (0.75 + ((name_hash % 100) / 1000.0)), 2)
        stock_quantity = 20 + (name_hash % 130)  # Between 20 and 150 units
        low_stock_threshold = 10 if stock_quantity > 30 else 5

        # Infer unit if in product name
        lower_name = p_name.lower()
        unit = default_unit
        if "milk" in lower_name or "juice" in lower_name or "water" in lower_name or "soda" in lower_name:
            unit = "litre"
        elif "kg" in lower_name or "banana" in lower_name or "apple" in lower_name or "onion" in lower_name or "potato" in lower_name:
            unit = "kg"
        elif "egg" in lower_name:
            unit = "piece"
        elif "bread" in lower_name or "biscuit" in lower_name or "chips" in lower_name:
            unit = "packet"

        catalogue_rows.append({
            "external_product_id": f"INSTA_{pid}",
            "name": p_name,
            "category": category_name,
            "department": dept_name.title(),
            "unit": unit,
            "selling_price": selling_price,
            "cost_price": cost_price,
            "stock_quantity": stock_quantity,
            "low_stock_threshold": low_stock_threshold
        })

    # Step 7: Save vyaparimitra_grocery_catalogue.csv
    catalogue_path = os.path.join(DATA_DIR, "vyaparimitra_grocery_catalogue.csv")
    with open(catalogue_path, mode="w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "external_product_id", "name", "category", "department",
            "unit", "selling_price", "cost_price", "stock_quantity", "low_stock_threshold"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(catalogue_rows)

    print(f"[SUCCESS] Saved {len(catalogue_rows)} grocery products to {catalogue_path}")

    # Step 8: Build realistic simulation order baskets (only keeping products in our top 1000 catalogue)
    valid_baskets = []
    # Build pid -> product details map
    prod_lookup = {r["external_product_id"]: r for r in catalogue_rows}

    for o_id, pids in order_baskets_raw.items():
        matched_ext_ids = [f"INSTA_{p}" for p in pids if p in selected_set]
        # Keep baskets with 1 to 6 items
        if 1 <= len(matched_ext_ids) <= 6:
            basket_items = []
            for ext_id in matched_ext_ids:
                p_info = prod_lookup[ext_id]
                qty = 1 if p_info["unit"] in ["box", "piece"] else (1 if random.random() > 0.3 else 2)
                basket_items.append({
                    "external_product_id": ext_id,
                    "name": p_info["name"],
                    "selling_price": p_info["selling_price"],
                    "quantity": qty,
                    "unit": p_info["unit"]
                })
            total_amt = round(sum(it["selling_price"] * it["quantity"] for it in basket_items), 2)
            valid_baskets.append({
                "source_order_id": o_id,
                "items": basket_items,
                "total_amount": total_amt
            })
            if len(valid_baskets) >= 1000:
                break

    baskets_path = os.path.join(DATA_DIR, "simulation_baskets.json")
    with open(baskets_path, mode="w", encoding="utf-8") as f:
        json.dump(valid_baskets, f, indent=2)

    print(f"[SUCCESS] Saved {len(valid_baskets)} realistic simulation order baskets to {baskets_path}")

if __name__ == "__main__":
    main()

