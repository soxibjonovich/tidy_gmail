from typing import Annotated

from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src import schemas
from src.database import models
from src.database.engine import get_db
from src.router.deps import get_current_user
from src.service import auth as service
from src.service import gmail as gmail_service
from src.service import token as token_service
from src.service import user as user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/google/url")
async def redirect_to_google():
    return RedirectResponse(service.generate_google_auth())


@router.post("/google/callback")
async def handle_code(
    code: Annotated[str, Body()], db: Annotated[AsyncSession, Depends(get_db)]
):
    res: schemas.GoogleTokenResponse | None = await service.exchange_code(code)

    user_info: schemas.GoogleIdTokenClaims | None = await service.decode_google_token(
        res.id_token
    )
    user = await user_service.get_user(
        db, google_sub=user_info.google_sub, email=user_info.email
    )
    if not user:
        user = await user_service.create_user(
            db,
            schemas.UserCreate.from_claims(user_info.model_dump()),
        )
    user = await user_service.update_last_login(db, user)
    await token_service.save_refresh_token(
        db,
        user_id=user.id,
        refresh_token=res.refresh_token,
        scopes=" ".join(res.scope),
    )
    jwt_token = service.create_token(user)
    emails = await gmail_service.get_all_emails(res.access_token)
    response = JSONResponse(
        content={
            "user_info": user_info.model_dump(),
            "messages": emails.model_dump(),
            "access_token": res.access_token,
        }
    )
    response.headers["Authorization"] = f"Bearer {jwt_token}"
    return response


@router.post("/refresh")
async def refresh_access_token(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    access_token = await token_service.refresh_access_token(db, current_user.id)
    return {"access_token": access_token}
