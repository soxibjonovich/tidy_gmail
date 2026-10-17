from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src import schemas
from src.database import models


async def get_token(db: AsyncSession, user_id: int) -> models.OauthToken | None:
    result = await db.execute(
        select(models.OauthToken).where(models.OauthToken.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def upsert_refresh_token(
    db: AsyncSession, data: schemas.OauthTokenCreate
) -> models.OauthToken:
    token = await get_token(db, data.user_id)
    if token is None:
        token = models.OauthToken(**data.model_dump())
        db.add(token)
    else:
        token.refresh_token_enc = data.refresh_token_enc
        token.scopes = data.scopes
        token.revoked_at = None
    await db.commit()
    await db.refresh(token)
    return token
