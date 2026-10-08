from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, Field


def _normalize_scope(text: str) -> list[str]:
    return text.split(" ")

class MessageInfo(BaseModel):
    id: str
    threadId: str
    
class GetMessagesRaw(BaseModel):
    messages: list[MessageInfo]
    nextPageToken: str
    resultSizeEstimate: int | str | None

class GoogleSignInResponse(BaseModel):
    access_token: Annotated[str, "Access Token"]
    expires_in: Annotated[int, "Expire date in seconds"]
    scope: Annotated[list, BeforeValidator(_normalize_scope)]
    token_type: Annotated[str, "Token Type"]
    id_token: Annotated[str, "Id Token"]


class UserJWTInfo(BaseModel):
    iss: str
    azp: str
    aud: str
    sub: str
    email: str
    email_verified: bool
    at_hash: str
    name: str
    picture: str
    given_name: str
    iat: int
    exp: int

class HeaderItem(BaseModel):
    name: Literal["List-Unsubscribe", "List-Unsubscribe-Post", "To", "From", "Date"] | str
    value: str

class Payload(BaseModel):
    mime_type: str = Field(alias="mimeType")
    headers: list[HeaderItem]

class GmailMessageModel(BaseModel):
    id: str
    thread_id: str = Field(alias="threadId")
    label_ids: list[str] = Field(alias="labelIds")
    snippet: str
    payload: Payload
    size_estimate: int = Field(alias="sizeEstimate")
    history_id: str = Field(alias="historyId")
    internal_date: str = Field(alias="internalDate")

    class Config:
        # Allows you to instantiate using camelCase or snake_case fields
        populate_by_name = True
