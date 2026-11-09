import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.services.seed_data import seed_demo_data_if_empty

TEST_DB_URL = "sqlite+aiosqlite:///./test_vyaparimitra.db"

test_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    future=True
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        await seed_demo_data_if_empty(session)
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c

    app.dependency_overrides.clear()

async def get_demo_auth_token(client: AsyncClient, email: str = "demo@vyaparimitra.ai", password: str = "Vyapari@123") -> str:
    res = await client.post("/api/v1/auth/login-json", json={
        "phone_or_email": email,
        "password": password
    })
    data = res.json()
    verify = await client.post("/api/v1/auth/verify-otp", json={
        "session_token": data["session_token"],
        "otp": data["dev_otp"]
    })
    return verify.json()["access_token"]
