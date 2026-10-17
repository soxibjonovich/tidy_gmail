from sqlalchemy import ColumnElement
from sqlalchemy.ext.asyncio import AsyncSession

from src import schemas
from src.database import models
from src.repository import users as users_repo


async def create_user(db: AsyncSession, user: schemas.UserCreate):
    result = await users_repo.create_user(db, user)
    return result


async def update_last_login(db: AsyncSession, user: models.User) -> models.User:
    return await users_repo.update_last_login(db, user)


async def get_user(
    db: AsyncSession,
    email: str | None = None,
    user_id: int | None = None,
    google_sub: str | None = None,
    **kwargs,
) -> models.User | None:
    conditions: list[ColumnElement[bool]] = []
    if google_sub is not None:
        conditions.append(models.User.google_sub == google_sub)
    if email is not None:
        conditions.append(models.User.email == email)
    if user_id is not None:
        conditions.append(models.User.id == user_id)
    if not conditions:
        raise ValueError("get_user requires at least one identificator")

    result = await users_repo.get_user(db, conditions)
    return result
