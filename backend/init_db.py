import asyncio

from src.database import models  # noqa: F401 — import registers tables on Base.metadata
from src.database.engine import engine
from src.database.models import Base


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


if __name__ == "__main__":
    asyncio.run(init_db())
