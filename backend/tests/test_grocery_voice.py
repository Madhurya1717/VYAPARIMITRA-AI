import pytest
from httpx import AsyncClient
from backend.tests.conftest import get_demo_auth_token

@pytest.mark.asyncio
async def test_grocery_voice_queries(client: AsyncClient):
    token = await get_demo_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Add a sample grocery item from the catalogue
    prod_res = await client.post(
        "/api/v1/products",
        json={
            "name": "Organic Bananas",
            "unit": "kg",
            "cost_price": 30.0,
            "selling_price": 45.0,
            "current_stock": 75.0,
            "low_stock_threshold": 10.0,
            "aliases": ["banana", "bananas", "arati pandu", "అరటిపండు"]
        },
        headers=headers
    )
    assert prod_res.status_code == 200

    # 2. Query: Price Inquiry on grocery item
    resp_price = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "What is the price of Banana?",
            "language_code": "en-IN",
            "execute_transaction": "false"
        },
        headers=headers
    )
    assert resp_price.status_code == 200
    p_data = resp_price.json()
    assert p_data["intent"]["intent"] == "price_inquiry"
    assert "Banana" in p_data["intent"]["product_name"]
    assert p_data["action_status"] == "EXECUTED"

    # 3. Query: Stock Inquiry on newly added grocery item
    resp_stock = await client.post(
        "/api/v1/voice/process-command",
        data={
            "transcription_text": "Check stock of Banana",
            "language_code": "en-IN",
            "execute_transaction": "false"
        },
        headers=headers
    )
    assert resp_stock.status_code == 200
    s_data = resp_stock.json()
    assert s_data["intent"]["intent"] == "check_stock"
    assert "Banana" in s_data["intent"]["product_name"]
    assert s_data["action_status"] == "EXECUTED"
