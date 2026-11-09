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
    DashboardSummaryResponse,
    DailySalesMetric,
    TopProductItem,
    RestockAlertItem,
    CategoryBreakdownItem
)


class AnalyticsService:

    async def get_dashboard_summary(
        self,
        db: AsyncSession,
        business_id: str,
        date_range: str = "7d"
    ) -> DashboardSummaryResponse:

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        start_of_today = datetime(now.year, now.month, now.day)
        start_of_month = datetime(now.year, now.month, 1)

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

        aov = float(today_revenue / today_orders) if today_orders > 0 else 0.0

        # 2. Monthly sales & revenue
        monthly_sales_q = select(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.created_at >= start_of_month,
            Sale.status == "completed"
        )
        monthly_res = await db.execute(monthly_sales_q)
        monthly_revenue, monthly_orders = monthly_res.one()

        # 3. Lifetime Revenue & Total Completed Sales
        lifetime_q = select(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed"
        )
        lifetime_res = await db.execute(lifetime_q)
        total_revenue, total_orders = lifetime_res.one()

        # 4. COGS & Profit calculations
        total_cogs_q = select(
            func.coalesce(
                func.sum(SaleItem.quantity * Product.cost_price),
                Decimal("0.0")
            )
        ).join(
            Product, SaleItem.product_id == Product.id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed"
        )
        total_cogs_res = await db.execute(total_cogs_q)
        total_cogs = total_cogs_res.scalar() or Decimal("0.0")

        today_cogs_q = select(
            func.coalesce(
                func.sum(SaleItem.quantity * Product.cost_price),
                Decimal("0.0")
            )
        ).join(
            Product, SaleItem.product_id == Product.id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            Sale.business_id == business_id,
            Sale.created_at >= start_of_today,
            Sale.status == "completed"
        )
        today_cogs_res = await db.execute(today_cogs_q)
        today_cogs = today_cogs_res.scalar() or Decimal("0.0")

        today_profit = max(Decimal("0.0"), today_revenue - today_cogs)
        total_profit = max(Decimal("0.0"), total_revenue - total_cogs)
        profit_margin = float((total_profit / total_revenue) * 100) if total_revenue > 0 else 0.0

        # 5. Inventory valuation & counts
        prod_q = select(Product).filter(
            Product.business_id == business_id,
            Product.is_active == True
        )
        prod_res = await db.execute(prod_q)
        products = prod_res.scalars().all()

        inventory_val = Decimal("0.0")
        low_stock_items = []

        for p in products:
            inventory_val += p.current_stock * p.cost_price
            if p.current_stock <= p.low_stock_threshold:
                deficit = float(p.low_stock_threshold - p.current_stock)
                suggested_reorder = max(deficit + 20.0, 10.0)
                low_stock_items.append(
                    RestockAlertItem(
                        product_id=p.id,
                        product_name=p.name,
                        telugu_name=p.telugu_name,
                        current_stock=float(p.current_stock),
                        unit=p.unit,
                        low_stock_threshold=float(p.low_stock_threshold),
                        deficit=deficit if deficit > 0 else 0.0,
                        suggested_reorder_qty=suggested_reorder
                    )
                )

        # 6. Top selling products
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
            SaleItem.product_id,
            Product.name,
            Product.telugu_name,
            Product.unit
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
            )
            for row in top_rows
        ]

        # 7. Sales Trend based on date_range filter
        sales_trend = []
        clean_range = (date_range or "7d").lower()

        if clean_range == "today":
            # Hourly breakdown for today (8 AM to 8 PM)
            hours = [8, 10, 12, 14, 16, 18, 20]
            for h in hours:
                h_start = start_of_today + timedelta(hours=h)
                h_end = h_start + timedelta(hours=2)
                h_q = select(
                    func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
                    func.count(Sale.id)
                ).filter(
                    Sale.business_id == business_id,
                    Sale.created_at >= h_start,
                    Sale.created_at < h_end,
                    Sale.status == "completed"
                )
                h_res = await db.execute(h_q)
                h_rev, h_cnt = h_res.one()
                sales_trend.append(
                    DailySalesMetric(
                        date=h_start.strftime("%Y-%m-%d %H:%M"),
                        day_name=h_start.strftime("%I %p"),
                        sales_count=h_cnt,
                        revenue=float(h_rev)
                    )
                )

        elif clean_range == "30d":
            # 30 days
            for i in range(29, -1, -1):
                day_target = now - timedelta(days=i)
                day_start = datetime(day_target.year, day_target.month, day_target.day)
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
                sales_trend.append(
                    DailySalesMetric(
                        date=day_start.strftime("%Y-%m-%d"),
                        day_name=day_start.strftime("%d %b"),
                        sales_count=d_cnt,
                        revenue=float(d_rev)
                    )
                )

        elif clean_range in ("3m", "90d"):
            # 12 weeks
            for i in range(11, -1, -1):
                week_start = now - timedelta(weeks=i+1)
                week_end = now - timedelta(weeks=i)
                w_q = select(
                    func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
                    func.count(Sale.id)
                ).filter(
                    Sale.business_id == business_id,
                    Sale.created_at >= week_start,
                    Sale.created_at < week_end,
                    Sale.status == "completed"
                )
                w_res = await db.execute(w_q)
                w_rev, w_cnt = w_res.one()
                sales_trend.append(
                    DailySalesMetric(
                        date=week_start.strftime("%Y-%m-%d"),
                        day_name=f"Wk {12 - i}",
                        sales_count=w_cnt,
                        revenue=float(w_rev)
                    )
                )

        elif clean_range in ("1y", "365d"):
            # 12 months
            for i in range(11, -1, -1):
                m_target = now - timedelta(days=i * 30)
                m_start = datetime(m_target.year, m_target.month, 1)
                # Next month start
                if m_target.month == 12:
                    m_end = datetime(m_target.year + 1, 1, 1)
                else:
                    m_end = datetime(m_target.year, m_target.month + 1, 1)
                m_q = select(
                    func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
                    func.count(Sale.id)
                ).filter(
                    Sale.business_id == business_id,
                    Sale.created_at >= m_start,
                    Sale.created_at < m_end,
                    Sale.status == "completed"
                )
                m_res = await db.execute(m_q)
                m_rev, m_cnt = m_res.one()
                sales_trend.append(
                    DailySalesMetric(
                        date=m_start.strftime("%Y-%m-%d"),
                        day_name=m_start.strftime("%b"),
                        sales_count=m_cnt,
                        revenue=float(m_rev)
                    )
                )

        else:
            # Default: Last 7 Days
            for i in range(6, -1, -1):
                day_target = now - timedelta(days=i)
                day_start = datetime(day_target.year, day_target.month, day_target.day)
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
                sales_trend.append(
                    DailySalesMetric(
                        date=day_start.strftime("%Y-%m-%d"),
                        day_name=day_start.strftime("%a"),
                        sales_count=d_cnt,
                        revenue=float(d_rev)
                    )
                )

        # 8. Category Distribution
        cat_q = select(
            func.coalesce(Category.name, "General"),
            func.count(Product.id),
            func.sum(Product.current_stock * Product.cost_price)
        ).outerjoin(
            Category, Product.category_id == Category.id
        ).filter(
            Product.business_id == business_id,
            Product.is_active == True
        ).group_by(Category.name)

        cat_res = await db.execute(cat_q)
        cat_rows = cat_res.all()
        category_distribution = [
            CategoryBreakdownItem(
                category_name=row[0],
                product_count=row[1],
                stock_value=float(row[2] or 0.0)
            )
            for row in cat_rows
        ]

        # 9. Pending Orders Count
        order_pending_q = select(func.count(Order.id)).filter(
            Order.business_id == business_id,
            Order.status.in_(["pending", "ready"])
        )
        order_pending_res = await db.execute(order_pending_q)
        pending_orders_cnt = order_pending_res.scalar() or 0

        # 10. Final Dashboard Response
        return DashboardSummaryResponse(
            today_sales=float(today_revenue),
            today_orders=today_orders,
            average_order_value=round(aov, 2),
            pending_orders_count=pending_orders_cnt,
            monthly_revenue=float(monthly_revenue),
            monthly_orders=monthly_orders,
            total_revenue=float(total_revenue),
            total_orders_count=total_orders,
            today_gross_profit=float(today_profit),
            total_gross_profit=float(total_profit),
            today_cogs=float(today_cogs),
            total_cogs=float(total_cogs),
            profit_margin_pct=round(profit_margin, 2),
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
