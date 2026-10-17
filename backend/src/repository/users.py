from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src import schemas
from src.database import models


async def create_user(db: AsyncSession, data: schemas.UserCreate) -> models.User:
    user = models.User(**data.model_dump(mode="json"))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, conditions: list) -> models.User | None:
    if not conditions:
        raise ValueError("get_user requires at least one identificator")

    result = await db.execute(select(models.User).where(*conditions))
    return result.scalar_one_or_none()


async def update_last_login(db: AsyncSession, user: models.User) -> models.User:
    user.last_login_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return user
