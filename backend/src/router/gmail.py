from fastapi import APIRouter

from src import schemas
from src.service import gmail as service

router = APIRouter(prefix="/gmail")


# FEATURE: adding limit, pagination
@router.get("/messages")
async def get_all_messages(access_token: str, q: str | None = None):
    ids = await service.get_all_emails(access_token, q)
    result: list[schemas.GmailMessageModel] = []
    for id in ids.messages:
        message = await service.get_email(id.id, access_token)
        result.append(message)

    return result
@router.get("/messages/{id}")
async def get_message_details(
    id: str,
    access_token: str
):
    return await service.get_email(id, access_token=access_token)
    
    