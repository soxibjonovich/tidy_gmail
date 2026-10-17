from fastapi import APIRouter, Depends
from pydantic import HttpUrl

from src import schemas
from src.router.deps import get_current_user
from src.service import gmail as service

router = APIRouter(prefix="/gmail", dependencies=[Depends(get_current_user)])


# FEATURE: adding pagination
@router.get("/messages")
async def get_all_messages(access_token: str, q: str | None = None):
    ids = await service.get_all_emails(access_token, q)
    result: list[schemas.GmailMessage] = []
    for message_ref in ids.messages:
        result.append(await service.get_email(message_ref.id, access_token))

    return result


@router.get("/messages/{id}")
async def get_message_details(id: str, access_token: str):
    return await service.get_email(id, access_token=access_token)


@router.get("/senders")
async def get_senders(access_token: str):
    return await service.get_senders(access_token)

@router.post("/messages/unsubscribe")
async def unsubscribe(links: list[HttpUrl]):
    return await service.unsubscribe(links)