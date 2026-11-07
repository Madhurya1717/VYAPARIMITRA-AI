from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_

from backend.app.models.sales import Sale, SaleItem
from backend.app.models.inventory import Product, Category
from backend.app.models.orders import Order
from backend.app.schemas.analytics import (
    DashboardSummaryResponse, DailySalesMetric,
    TopProductItem, RestockAlertItem, CategoryBreakdownItem
)

class AnalyticsService:
    async def get_dashboard_summary(self, db: AsyncSession, business_id: str) -> DashboardSummaryResponse:
        now = datetime.now(timezone.utc)
        start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

        # 1. Today's sales & revenue
        today_sales_q = select(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.created_at >= start_of_today,
            Sale.status == "completed"
        )
        today_res = await db.execute(today_sales_q)
        today_revenue, today_orders = today_res.one()

        # 2. Lifetime Revenue & Total Completed Sales
        lifetime_q = select(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed"
        )
        lifetime_res = await db.execute(lifetime_q)
        total_revenue, total_orders = lifetime_res.one()

        # 3. Inventory valuation & counts
        prod_q = select(Product).filter(Product.business_id == business_id, Product.is_active == True)
        prod_res = await db.execute(prod_q)
        products = prod_res.scalars().all()

        inventory_val = Decimal("0.0")
        low_stock_items = []

        for p in products:
            inventory_val += (p.current_stock * p.cost_price)
            if p.current_stock <= p.low_stock_threshold:
                deficit = float(p.low_stock_threshold - p.current_stock)
                suggested_reorder = max(deficit + 20.0, 10.0)
                low_stock_items.append(RestockAlertItem(
                    product_id=p.id,
                    product_name=p.name,
                    telugu_name=p.telugu_name,
                    current_stock=float(p.current_stock),
                    unit=p.unit,
                    low_stock_threshold=float(p.low_stock_threshold),
                    deficit=deficit if deficit > 0 else 0.0,
                    suggested_reorder_qty=suggested_reorder
                ))

        # 4. Top selling products
        top_selling_q = select(
            SaleItem.product_id,
            Product.name,
            Product.telugu_name,
            Product.unit,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.total_price).label("total_revenue")
        ).join(
            Product, SaleItem.product_id == Product.id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed"
        ).group_by(
            SaleItem.product_id, Product.name, Product.telugu_name, Product.unit
        ).order_by(
            func.sum(SaleItem.total_price).desc()
        ).limit(5)

        top_res = await db.execute(top_selling_q)
        top_rows = top_res.all()

        top_products = [
            TopProductItem(
                product_id=row[0],
                product_name=row[1],
                telugu_name=row[2],
                unit=row[3],
                quantity_sold=float(row[4] or 0),
                revenue=float(row[5] or 0)
            ) for row in top_rows
        ]

        # 5. Last 7 Days Sales Trend
        sales_trend = []
        for i in range(6, -1, -1):
            day_target = now - timedelta(days=i)
            day_start = datetime(day_target.year, day_target.month, day_target.day, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)

            day_q = select(
                func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
                func.count(Sale.id)
            ).filter(
                Sale.business_id == business_id,
                Sale.created_at >= day_start,
                Sale.created_at < day_end,
                Sale.status == "completed"
            )
            day_res = await db.execute(day_q)
            d_rev, d_cnt = day_res.one()

            sales_trend.append(DailySalesMetric(
                date=day_start.strftime("%Y-%m-%d"),
                day_name=day_start.strftime("%a"),
                sales_count=d_cnt,
                revenue=float(d_rev)
            ))

        # 6. Category Distribution
        cat_q = select(
            func.coalesce(Category.name, "General"),
            func.count(Product.id),
            func.sum(Product.current_stock * Product.cost_price)
        ).outerjoin(
            Category, Product.category_id == Category.id
        ).filter(
            Product.business_id == business_id,
            Product.is_active == True
        ).group_by(
            Category.name
        )
        cat_res = await db.execute(cat_q)
        cat_rows = cat_res.all()

        category_distribution = [
            CategoryBreakdownItem(
                category_name=row[0],
                product_count=row[1],
                stock_value=float(row[2] or 0.0)
            ) for row in cat_rows
        ]

        return DashboardSummaryResponse(
            today_sales=float(today_revenue),
            today_orders=today_orders,
            total_revenue=float(total_revenue),
            total_orders_count=total_orders,
            inventory_total_value=float(inventory_val),
            active_products_count=len(products),
            low_stock_count=len(low_stock_items),
            low_stock_items=low_stock_items,
            top_selling_products=top_products,
            recent_sales_trend=sales_trend,
            category_distribution=category_distribution,
            voice_assistant_status="ONLINE"
        )

analytics_service = AnalyticsService()
