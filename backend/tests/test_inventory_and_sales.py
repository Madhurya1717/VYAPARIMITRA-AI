import pytest
from httpx import AsyncClient
from backend.tests.conftest import get_demo_auth_token

@pytest.mark.asyncio
async def test_inventory_and_sales_flow(client: AsyncClient):
    # 1. Login with demo user via 2FA
    token = await get_demo_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify Rice has 50 kg initial stock
    prods_resp = await client.get("/api/v1/products?search=Rice", headers=headers)
    assert prods_resp.status_code == 200
    prods = prods_resp.json()
    assert len(prods) > 0
    rice = prods[0]
    assert rice["name"] == "Sona Masoori Rice"
    assert rice["current_stock"] == 50.0
    rice_id = rice["id"]

    # 3. Create a Sale of 10 kg Rice
    sale_payload = {
        "items": [
            {
                "product_id": rice_id,
                "quantity": 10.0,
                "unit_price": 56.0
            }
        ],
        "payment_method": "cash",
        "notes": "Direct counter sale",
        "idempotency_key": "unique-idemp-key-001"
    }
    sale_resp = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert sale_resp.status_code == 200
    sale_data = sale_resp.json()
    assert sale_data["total_amount"] == 560.0
    assert sale_data["invoice"] is not None
    assert "upi://pay" in sale_data["invoice"]["qr_payload"]

    # 4. Check that stock is now exactly 40.0 kg
    updated_rice_resp = await client.get(f"/api/v1/products/{rice_id}", headers=headers)
    assert updated_rice_resp.status_code == 200
    updated_rice = updated_rice_resp.json()
    assert updated_rice["current_stock"] == 40.0

    # 5. Test Idempotency: Re-submitting the exact same payload must NOT deduct stock again
    dup_sale_resp = await client.post("/api/v1/sales", json=sale_payload, headers=headers)
    assert dup_sale_resp.status_code == 200

    # Verify stock remains 40.0 kg
    check_rice = await client.get(f"/api/v1/products/{rice_id}", headers=headers)
    assert check_rice.json()["current_stock"] == 40.0

    # 6. Test Insufficient Stock: Attempting to sell 100 kg when only 40 kg left must fail
    fail_payload = {
        "items": [
            {
                "product_id": rice_id,
                "quantity": 100.0
            }
        ]
    }
    fail_resp = await client.post("/api/v1/sales", json=fail_payload, headers=headers)
    assert fail_resp.status_code == 400
    assert "Insufficient stock" in fail_resp.json()["detail"]

