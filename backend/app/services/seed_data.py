import json
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.models.business import Business, User
from backend.app.models.inventory import Category, Product, InventoryTransaction
from backend.app.models.sales import Sale, SaleItem, Invoice
from backend.app.models.orders import Customer, Order, OrderItem
from backend.app.models.audit import Notification
from backend.app.core.security import get_password_hash

async def seed_demo_data_if_empty(db: AsyncSession):
    # Check if business exists
    res = await db.execute(select(Business).limit(1))
    if res.scalar_one_or_none() is not None:
        return

    # 1. Create Demo Business
    business = Business(
        name="Sri Lakshmi Kirana & General Stores",
        owner_name="Kishore Kumar",
        phone="9876543210",
        email="kishore@vyaparimitra.ai",
        address="Shop #4, Market Road, Kakinada, Andhra Pradesh",
        gstin="37AAAAA0000A1Z5",
        preferred_language="te-IN",
        currency="INR"
    )
    db.add(business)
    await db.flush()

    # 2. Create Default Owner User
    user = User(
        business_id=business.id,
        full_name="Kishore Kumar",
        phone_or_email="demo@vyaparimitra.ai",
        password_hash=get_password_hash("Vyapari@123"),
        role="owner",
        is_active=True
    )
    db.add(user)

    # 3. Create Categories
    categories_data = [
        ("Grains & Rice", "All varieties of rice, wheat, and whole grains"),
        ("Pulses & Dals", "Toor dal, moong dal, chana dal, urad dal"),
        ("Oils & Ghee", "Edible cooking oils and pure cow ghee"),
        ("Spices & Condiments", "Chilli powder, turmeric, salt, cumin"),
        ("Packaged Goods", "Flour, biscuits, noodles, tea and coffee")
    ]
    created_cats = {}
    for name, desc in categories_data:
        cat = Category(
            business_id=business.id,
            name=name,
            description=desc
        )
        db.add(cat)
        await db.flush()
        created_cats[name] = cat.id

    # 4. Create Products (including 50 kg Rice for the prompt test journey)
    catalog = [
        {
            "name": "Sona Masoori Rice",
            "telugu_name": "సోనా మసూరి బియ్యం",
            "aliases": ["rice", "biyyam", "బియ్యం", "వరి అన్నం", "sona masoori", "raw rice"],
            "category_id": created_cats["Grains & Rice"],
            "sku": "GR-RICE-001",
            "current_stock": Decimal("50.000"),
            "unit": "kg",
            "cost_price": Decimal("48.00"),
            "selling_price": Decimal("56.00"),
            "low_stock_threshold": Decimal("15.000")
        },
        {
            "name": "Toor Dal",
            "telugu_name": "కందిపప్పు",
            "aliases": ["toor dal", "kandi pappu", "dal", "పప్పు", "red gram"],
            "category_id": created_cats["Pulses & Dals"],
            "sku": "PL-TDAL-002",
            "current_stock": Decimal("35.000"),
            "unit": "kg",
            "cost_price": Decimal("130.00"),
            "selling_price": Decimal("155.00"),
            "low_stock_threshold": Decimal("10.000")
        },
        {
            "name": "Freedom Sunflower Oil",
            "telugu_name": "ఫ్రీడమ్ సన్‌ఫ్లవర్ నూనె",
            "aliases": ["oil", "sunflower oil", "noon", "నూనె", "cooking oil"],
            "category_id": created_cats["Oils & Ghee"],
            "sku": "OL-SUN-003",
            "current_stock": Decimal("24.000"),
            "unit": "litre",
            "cost_price": Decimal("112.00"),
            "selling_price": Decimal("135.00"),
            "low_stock_threshold": Decimal("8.000")
        },
        {
            "name": "Refined Sugar",
            "telugu_name": "పంచదార",
            "aliases": ["sugar", "panchadara", "పంచదార", "చక్కెర", "sweetener"],
            "category_id": created_cats["Packaged Goods"],
            "sku": "PK-SUG-004",
            "current_stock": Decimal("45.000"),
            "unit": "kg",
            "cost_price": Decimal("38.00"),
            "selling_price": Decimal("44.00"),
            "low_stock_threshold": Decimal("10.000")
        },
        {
            "name": "Aashirvaad Shudh Chakki Atta",
            "telugu_name": "ఆశీర్వాద్ గోధుమపిండి",
            "aliases": ["atta", "wheat flour", "godhumapindi", "గోధుమపిండి", "flour"],
            "category_id": created_cats["Packaged Goods"],
            "sku": "PK-ATTA-005",
            "current_stock": Decimal("18.000"),
            "unit": "packet",
            "cost_price": Decimal("210.00"),
            "selling_price": Decimal("245.00"),
            "low_stock_threshold": Decimal("5.000")
        },
        {
            "name": "Tata Salt Vacuum Evaporated",
            "telugu_name": "టాటా ఉప్పు",
            "aliases": ["salt", "uppu", "ఉప్పు", "tata salt"],
            "category_id": created_cats["Spices & Condiments"],
            "sku": "SP-SALT-006",
            "current_stock": Decimal("4.000"),  # Deliberately low stock for alerting
            "unit": "packet",
            "cost_price": Decimal("22.00"),
            "selling_price": Decimal("28.00"),
            "low_stock_threshold": Decimal("10.000")
        },
        {
            "name": "Guntur Red Chilli Powder",
            "telugu_name": "గుంటూరు కారం పొడి",
            "aliases": ["chilli powder", "karam", "కారం", "mirchi powder"],
            "category_id": created_cats["Spices & Condiments"],
            "sku": "SP-CHIL-007",
            "current_stock": Decimal("12.000"),
            "unit": "kg",
            "cost_price": Decimal("260.00"),
            "selling_price": Decimal("310.00"),
            "low_stock_threshold": Decimal("5.000")
        }
    ]

    created_products = []
    for item in catalog:
        prod = Product(
            business_id=business.id,
            category_id=item["category_id"],
            name=item["name"],
            telugu_name=item["telugu_name"],
            aliases=json.dumps(item["aliases"]),
            sku=item["sku"],
            current_stock=item["current_stock"],
            unit=item["unit"],
            cost_price=item["cost_price"],
            selling_price=item["selling_price"],
            low_stock_threshold=item["low_stock_threshold"],
            is_active=True
        )
        db.add(prod)
        await db.flush()
        created_products.append(prod)

        # Record Initial Stock Ledger Entry
        tx = InventoryTransaction(
            business_id=business.id,
            product_id=prod.id,
            type="IN",
            quantity=item["current_stock"],
            balance_after=item["current_stock"],
            unit_price=item["cost_price"],
            reference_type="initial_inventory",
            notes="Opening stock balance for store initiation"
        )
        db.add(tx)

    # 5. Create Demo Customers
    customers_data = [
        ("Ramesh Naidu", "9848022338", "ramesh.naidu@example.com", "Main Road, Kakinada"),
        ("Sita Raman", "9440156789", "sita.raman@example.com", "Bhavani Nagar, Kakinada"),
        ("Venkatesh Rao", "9988776655", "venkat.rao@example.com", "Collectorate Road, Kakinada")
    ]
    created_custs = []
    for c_name, c_phone, c_email, c_addr in customers_data:
        cust = Customer(
            business_id=business.id,
            name=c_name,
            phone=c_phone,
            email=c_email,
            address=c_addr
        )
        db.add(cust)
        await db.flush()
        created_custs.append(cust)

    # 6. Create Historical Sales for Realistic Analytics
    now = datetime.now(timezone.utc)
    for days_ago in range(5, 0, -1):
        sale_dt = now - timedelta(days=days_ago, hours=3)
        sale_invoice_num = f"INV-2026110{7-days_ago}-00{days_ago}A"
        sale = Sale(
            business_id=business.id,
            customer_id=created_custs[days_ago % len(created_custs)].id,
            invoice_number=sale_invoice_num,
            subtotal=Decimal("1120.00"),
            tax_amount=Decimal("0.00"),
            discount_amount=Decimal("20.00"),
            total_amount=Decimal("1100.00"),
            payment_method="upi",
            status="completed",
            notes="Daily counter sale",
            created_at=sale_dt
        )
        db.add(sale)
        await db.flush()

        # Sale Items
        si1 = SaleItem(
            sale_id=sale.id,
            product_id=created_products[0].id,  # Rice
            quantity=Decimal("10.000"),
            unit_price=Decimal("56.00"),
            total_price=Decimal("560.00"),
            created_at=sale_dt
        )
        si2 = SaleItem(
            sale_id=sale.id,
            product_id=created_products[2].id,  # Oil
            quantity=Decimal("4.000"),
            unit_price=Decimal("135.00"),
            total_price=Decimal("540.00"),
            created_at=sale_dt
        )
        db.add(si1)
        db.add(si2)

        inv = Invoice(
            sale_id=sale.id,
            invoice_number=sale_invoice_num,
            qr_payload=f"upi://pay?pa=vyaparimitra@upi&pn=SriLakshmiStores&am=1100.00&cu=INR&tr={sale_invoice_num}",
            created_at=sale_dt
        )
        db.add(inv)

    # 7. Low Stock Notification
    notif = Notification(
        business_id=business.id,
        title="Critical Stock Warning: Tata Salt",
        message="Only 4 packets of Tata Salt remaining (Threshold: 10 packets). Please restock soon.",
        type="warning"
    )
    db.add(notif)

    await db.commit()

