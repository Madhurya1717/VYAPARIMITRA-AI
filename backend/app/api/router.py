from fastapi import APIRouter
from backend.app.api.auth import router as auth_router
from backend.app.api.products import router as products_router
from backend.app.api.sales import router as sales_router
from backend.app.api.orders import router as orders_router
from backend.app.api.customers import router as customers_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.voice import router as voice_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(sales_router)
api_router.include_router(orders_router)
api_router.include_router(customers_router)
api_router.include_router(analytics_router)
api_router.include_router(notifications_router)
api_router.include_router(voice_router)
