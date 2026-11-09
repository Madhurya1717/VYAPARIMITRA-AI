import pytest
import asyncio
from httpx import AsyncClient
from backend.app.services.simulation_service import simulation_service
from backend.tests.conftest import TestingSessionLocal

@pytest.mark.asyncio
async def test_live_grocery_simulation_lifecycle(client: AsyncClient):
    simulation_service.session_factory = TestingSessionLocal
    # 1. Login demo merchant via 2-step verification
    step1_res = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": "demo@vyaparimitra.ai",
        "password": "Vyapari@123"
    })
    assert step1_res.status_code == 200
    step1_data = step1_res.json()
    session_token = step1_data["session_token"]
    otp = step1_data["dev_otp"]

    verify_res = await client.post("/api/v1/auth/verify-otp", json={
        "session_token": session_token,
        "otp": otp
    })
    assert verify_res.status_code == 200
    token = verify_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check initial simulation status
    status_res = await client.get("/api/v1/demo/simulation/status")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert "is_running" in status_data
    assert "total_simulated_sales" in status_data

    # 3. Start live sales simulation (1 second interval for test)
    start_res = await client.post(
        "/api/v1/demo/simulation/start",
        json={"interval_seconds": 1},
        headers=headers
    )
    assert start_res.status_code == 200
    assert start_res.json()["is_running"] is True

    # 4. Allow simulation to execute at least 1-2 transactions
    await asyncio.sleep(2.5)

    # 5. Check transactions stream
    tx_res = await client.get("/api/v1/demo/simulation/transactions?limit=10")
    assert tx_res.status_code == 200
    txs = tx_res.json()
    assert len(txs) >= 1
    first_tx = txs[0]
    assert "invoice_number" in first_tx
    assert "total_amount" in first_tx
    assert first_tx["total_amount"] > 0

    # 6. Stop simulation
    stop_res = await client.post("/api/v1/demo/simulation/stop", headers=headers)
    assert stop_res.status_code == 200
    assert stop_res.json()["is_running"] is False

    # 7. Reset simulation data
    reset_res = await client.post("/api/v1/demo/simulation/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True
    assert reset_res.json()["deleted_sales_count"] >= 1
