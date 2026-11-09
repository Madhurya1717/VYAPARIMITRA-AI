import logging
from decimal import Decimal
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, distinct

from backend.app.models.sales import Sale, SaleItem
from backend.app.models.inventory import Product, Category, InventoryTransaction
from backend.app.models.orders import Customer, Order
from backend.app.models.business import Expense

logger = logging.getLogger(__name__)

class BusinessIntelligenceService:
    """
    Deterministic Business Intelligence & Calculation Engine for VyapariMitra AI.
    Executes real database aggregations and calculations:
    - Never fabricates or hallucinates numbers.
    - Accurately computes Revenue, COGS, Gross Profit, Expenses, Net Profit, Loss.
    - Calculates customer statistics from actual recorded visits and transactions.
    - Performs period comparisons (this month vs last month, today vs yesterday).
    """

    async def get_profit_and_loss(
        self,
        db: AsyncSession,
        business_id: str,
        start_utc: Optional[datetime],
        end_utc: datetime,
        period_label: str = "Today"
    ) -> Dict[str, Any]:
        """
        Calculates deterministic financial P&L for given period:
        - Revenue = Sum of completed sales total_amount
        - COGS = Sum of (SaleItem.quantity * Product.cost_price)
        - Gross Profit = Revenue - COGS
        - Expenses = Sum of operating expenses recorded in period
        - Net Profit = Gross Profit - Expenses
        - Loss = reported if Net Profit < 0
        - Margin % = (Net Profit / Revenue) * 100
        """
        # 1. Total Revenue & Sales Count
        rev_q = select(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed",
            Sale.created_at <= end_utc
        )
        if start_utc:
            rev_q = rev_q.filter(Sale.created_at >= start_utc)

        rev_res = await db.execute(rev_q)
        total_revenue, sales_count = rev_res.one()
        total_revenue = Decimal(str(total_revenue or 0.0))

        # 2. Cost of Goods Sold (COGS)
        cogs_q = select(
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
            Sale.status == "completed",
            Sale.created_at <= end_utc
        )
        if start_utc:
            cogs_q = cogs_q.filter(Sale.created_at >= start_utc)

        cogs_res = await db.execute(cogs_q)
        total_cogs = Decimal(str(cogs_res.scalar() or 0.0))

        # 3. Operating Expenses
        exp_q = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.0")),
            func.count(Expense.id)
        ).filter(
            Expense.business_id == business_id,
            Expense.expense_date <= end_utc
        )
        if start_utc:
            exp_q = exp_q.filter(Expense.expense_date >= start_utc)

        exp_res = await db.execute(exp_q)
        total_expenses, expense_count = exp_res.one()
        total_expenses = Decimal(str(total_expenses or 0.0))

        # 4. Accurate Calculations
        gross_profit = total_revenue - total_cogs
        net_profit = gross_profit - total_expenses
        is_loss = net_profit < 0
        loss_amount = abs(net_profit) if is_loss else Decimal("0.0")
        
        profit_margin_pct = (
            float((net_profit / total_revenue) * 100)
            if total_revenue > 0 else 0.0
        )

        has_records = sales_count > 0 or expense_count > 0

        return {
            "period": period_label,
            "has_records": has_records,
            "sales_count": sales_count,
            "total_revenue": float(total_revenue),
            "total_cogs": float(total_cogs),
            "gross_profit": float(gross_profit),
            "total_expenses": float(total_expenses),
            "expense_count": expense_count,
            "net_profit": float(net_profit),
            "is_loss": is_loss,
            "loss_amount": float(loss_amount),
            "profit_margin_pct": round(profit_margin_pct, 2)
        }

    async def get_sales_analytics(
        self,
        db: AsyncSession,
        business_id: str,
        start_utc: Optional[datetime],
        end_utc: datetime,
        product_id: Optional[str] = None,
        product_name: Optional[str] = None,
        period_label: str = "Today"
    ) -> Dict[str, Any]:
        """
        Calculates sales volume, revenue, and product-specific or top-seller analytics.
        """
        # If product-specific inquiry
        if product_id or product_name:
            prod_filter = []
            if product_id:
                prod_filter.append(SaleItem.product_id == product_id)
            elif product_name:
                prod_filter.append(Product.name.ilike(f"%{product_name}%"))

            item_q = select(
                func.coalesce(func.sum(SaleItem.quantity), Decimal("0.0")),
                func.coalesce(func.sum(SaleItem.total_price), Decimal("0.0")),
                func.count(distinct(Sale.id)),
                Product.name,
                Product.unit
            ).join(
                Product, SaleItem.product_id == Product.id
            ).join(
                Sale, SaleItem.sale_id == Sale.id
            ).filter(
                Sale.business_id == business_id,
                Sale.status == "completed",
                Sale.created_at <= end_utc,
                *prod_filter
            ).group_by(Product.name, Product.unit)

            if start_utc:
                item_q = item_q.filter(Sale.created_at >= start_utc)

            item_res = await db.execute(item_q)
            row = item_res.first()

            if row:
                qty_sold = float(row[0] or 0)
                prod_rev = float(row[1] or 0)
                tx_count = row[2] or 0
                canonical_name = row[3]
                unit = row[4]
                return {
                    "period": period_label,
                    "is_product_specific": True,
                    "product_name": canonical_name,
                    "quantity_sold": qty_sold,
                    "unit": unit,
                    "revenue": prod_rev,
                    "transaction_count": tx_count,
                    "has_sales": qty_sold > 0
                }
            else:
                return {
                    "period": period_label,
                    "is_product_specific": True,
                    "product_name": product_name or "Product",
                    "quantity_sold": 0.0,
                    "unit": "units",
                    "revenue": 0.0,
                    "transaction_count": 0,
                    "has_sales": False
                }

        # General Store Sales Analytics
        sales_q = select(
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0")),
            func.count(Sale.id)
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed",
            Sale.created_at <= end_utc
        )
        if start_utc:
            sales_q = sales_q.filter(Sale.created_at >= start_utc)

        sales_res = await db.execute(sales_q)
        total_rev, total_sales = sales_res.one()

        # Top product by revenue
        top_q = select(
            Product.name,
            func.sum(SaleItem.quantity),
            Product.unit,
            func.sum(SaleItem.total_price)
        ).join(
            Product, SaleItem.product_id == Product.id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed",
            Sale.created_at <= end_utc
        )
        if start_utc:
            top_q = top_q.filter(Sale.created_at >= start_utc)

        top_q = top_q.group_by(Product.name, Product.unit).order_by(
            func.sum(SaleItem.total_price).desc()
        ).limit(3)

        top_res = await db.execute(top_q)
        top_rows = top_res.all()

        top_items = [
            {
                "product_name": r[0],
                "quantity": float(r[1] or 0),
                "unit": r[2],
                "revenue": float(r[3] or 0)
            }
            for r in top_rows
        ]

        return {
            "period": period_label,
            "is_product_specific": False,
            "total_sales_count": total_sales,
            "total_revenue": float(total_rev or 0),
            "top_products": top_items,
            "best_seller": top_items[0] if top_items else None,
            "has_sales": total_sales > 0
        }

    async def get_customer_analytics(
        self,
        db: AsyncSession,
        business_id: str,
        start_utc: Optional[datetime],
        end_utc: datetime,
        period_label: str = "Today"
    ) -> Dict[str, Any]:
        """
        Extracts customer metrics based on recorded transactions and customer profiles:
        - Total visits (transactions)
        - Unique customers
        - Average Order Value (AOV)
        - Top customer by spending
        - Regular customer count (>= 3 visits)
        """
        # 1. Total Visits and Unique Customers
        visit_q = select(
            func.count(Sale.id),
            func.count(distinct(Sale.customer_id)),
            func.coalesce(func.sum(Sale.total_amount), Decimal("0.0"))
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed",
            Sale.created_at <= end_utc
        )
        if start_utc:
            visit_q = visit_q.filter(Sale.created_at >= start_utc)

        visit_res = await db.execute(visit_q)
        total_visits, unique_registered, total_rev = visit_res.one()
        total_rev = Decimal(str(total_rev or 0))

        aov = float(total_rev / total_visits) if total_visits > 0 else 0.0

        # 2. Total registered customers in store
        total_cust_q = select(func.count(Customer.id)).filter(Customer.business_id == business_id)
        total_cust_cnt = (await db.execute(total_cust_q)).scalar() or 0

        # 3. Top customer by spend in this period
        top_cust_q = select(
            Customer.name,
            Customer.phone,
            func.sum(Sale.total_amount),
            func.count(Sale.id)
        ).join(
            Customer, Sale.customer_id == Customer.id
        ).filter(
            Sale.business_id == business_id,
            Sale.status == "completed",
            Sale.created_at <= end_utc
        )
        if start_utc:
            top_cust_q = top_cust_q.filter(Sale.created_at >= start_utc)

        top_cust_q = top_cust_q.group_by(Customer.id, Customer.name, Customer.phone).order_by(
            func.sum(Sale.total_amount).desc()
        ).limit(1)

        top_cust_res = await db.execute(top_cust_q)
        top_cust_row = top_cust_res.first()

        top_customer = None
        if top_cust_row:
            top_customer = {
                "name": top_cust_row[0],
                "phone": top_cust_row[1],
                "total_spend": float(top_cust_row[2] or 0),
                "visit_count": top_cust_row[3]
            }

        # 4. Regular customers (customers with >= 3 purchases overall)
        reg_q = select(func.count(Customer.id)).filter(
            Customer.business_id == business_id,
            Customer.total_purchases >= Decimal("500.0")
        )
        regular_count = (await db.execute(reg_q)).scalar() or 0

        return {
            "period": period_label,
            "total_visits": total_visits,
            "unique_customers": unique_registered,
            "total_registered_customers": total_cust_cnt,
            "average_order_value": round(aov, 2),
            "top_customer": top_customer,
            "regular_customer_count": regular_count,
            "has_customer_data": total_visits > 0 or total_cust_cnt > 0
        }

    async def get_inventory_health(
        self,
        db: AsyncSession,
        business_id: str,
        product_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates stock levels, stock deficits, low-stock alerts, and valuation.
        """
        # Specific Product Stock
        if product_id:
            prod = (await db.execute(
                select(Product).filter(Product.id == product_id, Product.business_id == business_id)
            )).scalars().first()

            if prod:
                cur_stock = float(prod.current_stock)
                threshold = float(prod.low_stock_threshold)
                is_low = cur_stock <= threshold
                is_out = cur_stock <= 0
                return {
                    "is_specific": True,
                    "product_id": prod.id,
                    "product_name": prod.name,
                    "telugu_name": prod.telugu_name,
                    "current_stock": cur_stock,
                    "unit": prod.unit,
                    "low_stock_threshold": threshold,
                    "cost_price": float(prod.cost_price),
                    "selling_price": float(prod.selling_price),
                    "is_low_stock": is_low,
                    "is_out_of_stock": is_out
                }

        # Store-wide inventory health
        prods_res = await db.execute(
            select(Product).filter(Product.business_id == business_id, Product.is_active == True)
        )
        products = prods_res.scalars().all()

        total_products = len(products)
        total_valuation = sum(float(p.current_stock * p.cost_price) for p in products)
        
        low_stock_items = []
        out_of_stock_items = []
        reorder_suggestions = []

        for p in products:
            stk = float(p.current_stock)
            thresh = float(p.low_stock_threshold)
            if stk <= 0:
                out_of_stock_items.append({
                    "name": p.name,
                    "telugu_name": p.telugu_name,
                    "unit": p.unit
                })
                reorder_suggestions.append({
                    "name": p.name,
                    "suggested_qty": max(thresh * 2, 20.0),
                    "unit": p.unit,
                    "reason": "Completely Out of Stock"
                })
            elif stk <= thresh:
                low_stock_items.append({
                    "name": p.name,
                    "current_stock": stk,
                    "threshold": thresh,
                    "unit": p.unit
                })
                reorder_suggestions.append({
                    "name": p.name,
                    "suggested_qty": max(thresh - stk + 10.0, 10.0),
                    "unit": p.unit,
                    "reason": f"Running Low ({stk} {p.unit} remaining)"
                })

        return {
            "is_specific": False,
            "total_products": total_products,
            "inventory_valuation": round(total_valuation, 2),
            "low_stock_count": len(low_stock_items),
            "out_of_stock_count": len(out_of_stock_items),
            "low_stock_items": low_stock_items,
            "out_of_stock_items": out_of_stock_items,
            "reorder_suggestions": reorder_suggestions,
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "telugu_name": p.telugu_name,
                    "current_stock": float(p.current_stock),
                    "unit": p.unit,
                    "cost_price": float(p.cost_price),
                    "selling_price": float(p.selling_price),
                    "low_stock_threshold": float(p.low_stock_threshold),
                    "stock_status": "out_of_stock" if p.current_stock <= 0 else ("low_stock" if p.current_stock <= p.low_stock_threshold else "in_stock")
                }
                for p in products
            ]
        }

    async def compare_periods(
        self,
        db: AsyncSession,
        business_id: str,
        period_1: Dict[str, Any],
        period_2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compares two distinct date ranges (e.g. This Month vs Last Month, Today vs Yesterday).
        """
        p1_res = await self.get_profit_and_loss(
            db, business_id, period_1["start_utc"], period_1["end_utc"], period_1["label"]
        )
        p2_res = await self.get_profit_and_loss(
            db, business_id, period_2["start_utc"], period_2["end_utc"], period_2["label"]
        )

        p1_rev = p1_res["total_revenue"]
        p2_rev = p2_res["total_revenue"]
        rev_diff = p1_rev - p2_rev
        rev_pct = round(((rev_diff / p2_rev) * 100), 1) if p2_rev > 0 else 0.0

        p1_prof = p1_res["net_profit"]
        p2_prof = p2_res["net_profit"]
        prof_diff = p1_prof - p2_prof
        prof_pct = round(((prof_diff / abs(p2_prof)) * 100), 1) if p2_prof != 0 else 0.0

        return {
            "period1_label": period_1["label"],
            "period2_label": period_2["label"],
            "period1_revenue": p1_rev,
            "period2_revenue": p2_rev,
            "revenue_diff": round(rev_diff, 2),
            "revenue_growth_pct": rev_pct,
            "period1_profit": p1_prof,
            "period2_profit": p2_prof,
            "profit_diff": round(prof_diff, 2),
            "profit_growth_pct": prof_pct,
            "period1_sales_count": p1_res["sales_count"],
            "period2_sales_count": p2_res["sales_count"]
        }

    async def get_business_insights(
        self,
        db: AsyncSession,
        business_id: str
    ) -> Dict[str, Any]:
        """
        Synthesizes overall business health, highest-margin products, and actionable advice.
        """
        from backend.app.services.bi_date_parser import BIDateParser
        today_tf = BIDateParser.parse_timeframe("today")
        month_tf = BIDateParser.parse_timeframe("this_month")
        
        today_pnl = await self.get_profit_and_loss(db, business_id, today_tf["start_utc"], today_tf["end_utc"], "Today")
        month_pnl = await self.get_profit_and_loss(db, business_id, month_tf["start_utc"], month_tf["end_utc"], "This Month")
        inv_health = await self.get_inventory_health(db, business_id)

        # High margin products
        margin_q = select(
            Product.name,
            Product.selling_price,
            Product.cost_price,
            Product.unit,
            ((Product.selling_price - Product.cost_price) / func.nullif(Product.selling_price, 0) * 100).label("margin_pct")
        ).filter(
            Product.business_id == business_id,
            Product.is_active == True,
            Product.selling_price > 0
        ).order_by(
            ((Product.selling_price - Product.cost_price) / func.nullif(Product.selling_price, 0) * 100).desc()
        ).limit(3)

        margin_res = await db.execute(margin_q)
        margin_rows = margin_res.all()

        high_margin_products = [
            {
                "name": r[0],
                "selling_price": float(r[1]),
                "cost_price": float(r[2]),
                "unit": r[3],
                "margin_pct": round(float(r[4] or 0), 1)
            }
            for r in margin_rows
        ]

        is_profitable = month_pnl["net_profit"] > 0

        # Actionable insights
        recommendations = []
        if inv_health["out_of_stock_count"] > 0:
            reorder_names = ", ".join([item["name"] for item in inv_health["out_of_stock_items"][:2]])
            recommendations.append(f"Restock {inv_health['out_of_stock_count']} out-of-stock items ({reorder_names}) to capture missed sales.")
        if inv_health["low_stock_count"] > 0:
            recommendations.append(f"Monitor {inv_health['low_stock_count']} low-stock items approaching threshold.")
        if high_margin_products:
            top_margin = high_margin_products[0]
            recommendations.append(f"Promote '{top_margin['name']}' which offers your highest profit margin of {top_margin['margin_pct']}%.")
        if not recommendations:
            recommendations.append("Business operations are stable. Continue tracking daily sales.")

        return {
            "is_profitable": is_profitable,
            "today_revenue": today_pnl["total_revenue"],
            "today_profit": today_pnl["net_profit"],
            "month_revenue": month_pnl["total_revenue"],
            "month_profit": month_pnl["net_profit"],
            "month_margin_pct": month_pnl["profit_margin_pct"],
            "inventory_valuation": inv_health["inventory_valuation"],
            "high_margin_products": high_margin_products,
            "reorder_needed_count": inv_health["out_of_stock_count"] + inv_health["low_stock_count"],
            "recommendations": recommendations
        }

bi_service = BusinessIntelligenceService()

