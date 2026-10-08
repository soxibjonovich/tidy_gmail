from typing import Annotated

from fastapi import APIRouter, Body
from fastapi.responses import RedirectResponse

from src.service import auth as service
from src.service import gmail as gmail_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/google/url")
async def redirect_to_google():
    return RedirectResponse(service.generate_google_auth())

@router.post("/google/callback")
async def handle_code(
    code: Annotated[str, Body()]
):
    res = await service.exchange_code(code)
    
    user_info = await service.decode_token(res.id_token)
    emails = await gmail_service.get_all_emails(res.access_token)
    print(res.access_token)
    return {"user_info": user_info, "messages": emails, "access_token": res.access_token}