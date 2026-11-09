"""
VyapariMitra AI — Simulation API Endpoints
Provides control endpoints to start, stop, check status, inspect transactions,
and reset the realistic grocery merchant sales simulation.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.business import User, Business
from backend.app.services.simulation_service import simulation_service

router = APIRouter(prefix="/demo/simulation", tags=["Live Merchant Simulation"])

class SimulationStartRequest(BaseModel):
    interval_seconds: int = 3

@router.post("/start")
async def start_simulation(
    data: Optional[SimulationStartRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    interval = data.interval_seconds if data else 3
    result = await simulation_service.start(
        business_id=current_user.business_id,
        interval_seconds=interval
    )
    return result

@router.post("/stop")
async def stop_simulation(
    current_user: User = Depends(get_current_user)
):
    result = await simulation_service.stop()
    return result

@router.get("/status")
async def get_simulation_status():
    return simulation_service.get_status()

@router.get("/transactions")
async def get_simulation_transactions(
    limit: int = Query(20, ge=1, le=100)
):
    return simulation_service.get_transactions(limit=limit)

@router.post("/reset")
async def reset_simulation(
    current_user: User = Depends(get_current_user)
):
    result = await simulation_service.reset(business_id=current_user.business_id)
    return result

