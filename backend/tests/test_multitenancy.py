import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_business_data_isolation(client: AsyncClient):
    # Register Business Alpha
    reg_a = await client.post("/api/v1/auth/register", json={
        "full_name": "Alpha Owner",
        "phone_or_email": "owner@alpha.com",
        "password": "AlphaPassword123",
        "business_name": "Alpha Kirana",
        "preferred_language": "te-IN"
    })
    token_a = reg_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register Business Beta
    reg_b = await client.post("/api/v1/auth/register", json={
        "full_name": "Beta Owner",
        "phone_or_email": "owner@beta.com",
        "password": "BetaPassword123",
        "business_name": "Beta Kirana",
        "preferred_language": "en-IN"
    })
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Business Alpha creates a private product
    prod_a = await client.post("/api/v1/products", json={
        "name": "Alpha Secret Garam Masala",
        "telugu_name": "ఆల్ఫా మసాలా",
        "current_stock": 25.0,
        "unit": "packet",
        "cost_price": 50.0,
        "selling_price": 75.0,
        "low_stock_threshold": 5.0
    }, headers=headers_a)
    assert prod_a.status_code == 200
    prod_a_id = prod_a.json()["id"]

    # Business Beta lists products: Alpha's product MUST NOT appear
    beta_prods = await client.get("/api/v1/products", headers=headers_b)
    assert beta_prods.status_code == 200
    beta_prod_names = [p["name"] for p in beta_prods.json()]
    assert "Alpha Secret Garam Masala" not in beta_prod_names

    # Business Beta attempts to fetch Alpha's product by ID: MUST RETURN 404
    cross_tenant_resp = await client.get(f"/api/v1/products/{prod_a_id}", headers=headers_b)
    assert cross_tenant_resp.status_code == 404

