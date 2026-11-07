from pydantic import BaseModel
from typing import List, Optional

class DailySalesMetric(BaseModel):
    date: str
    day_name: str
    sales_count: int
    revenue: float

class TopProductItem(BaseModel):
    product_id: str
    product_name: str
    telugu_name: Optional[str] = None
    quantity_sold: float
    unit: str
    revenue: float

class RestockAlertItem(BaseModel):
    product_id: str
    product_name: str
    telugu_name: Optional[str] = None
    current_stock: float
    unit: str
    low_stock_threshold: float
    deficit: float
    suggested_reorder_qty: float

class CategoryBreakdownItem(BaseModel):
    category_name: str
    product_count: int
    stock_value: float

class DashboardSummaryResponse(BaseModel):
    today_sales: float
    today_orders: int
    total_revenue: float
    total_orders_count: int
    inventory_total_value: float
    active_products_count: int
    low_stock_count: int
    low_stock_items: List[RestockAlertItem]
    top_selling_products: List[TopProductItem]
    recent_sales_trend: List[DailySalesMetric]
    category_distribution: List[CategoryBreakdownItem]
    voice_assistant_status: str = "ONLINE"
