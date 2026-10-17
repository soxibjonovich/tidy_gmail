from cryptography.fernet import Fernet
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from src import schemas
from src.repository import tokens as tokens_repo
from src.service import auth as auth_service

_fernet = Fernet(settings.FERNET_KEY.encode())


def encrypt(value: str) -> bytes:
    return _fernet.encrypt(value.encode())


def decrypt(blob: bytes) -> str:
    return _fernet.decrypt(blob).decode()


async def save_refresh_token(
    db: AsyncSession,
    *,
    user_id: int,
    refresh_token: str | None,
    scopes: str,
) -> None:
    if not refresh_token:
        return
    await tokens_repo.upsert_refresh_token(
        db,
        schemas.OauthTokenCreate(
            user_id=user_id,
            refresh_token_enc=encrypt(refresh_token),
            scopes=scopes,
        ),
    )


async def refresh_access_token(db: AsyncSession, user_id: int) -> str:
    """Exchange the stored refresh token for a fresh Google access token."""
    token = await tokens_repo.get_token(db, user_id)
    if token is None or token.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account not connected — sign in again",
        )
    access_token = await auth_service.refresh_access_token(
        decrypt(token.refresh_token_enc)
    )
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh Google access token — sign in again",
        )
    return access_token
