from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, EmailStr, Field, HttpUrl


def _normalize_scope(text: str) -> list[str]:
    return text.split(" ")


class GmailMessageRef(BaseModel):
    id: str
    threadId: str


class GmailMessageList(BaseModel):
    messages: list[GmailMessageRef]
    nextPageToken: str | None = None
    resultSizeEstimate: int | str | None = None


class GoogleTokenResponse(BaseModel):
    access_token: Annotated[str, "Access Token"]
    refresh_token: Annotated[
        str | None, "Refresh Token — absent unless first consent / prompt=consent"
    ] = None
    expires_in: Annotated[int, "Expire date in seconds"]
    scope: Annotated[list, BeforeValidator(_normalize_scope)]
    token_type: Annotated[str, "Token Type"]
    id_token: Annotated[str, "Id Token"]


class GoogleIdTokenClaims(BaseModel):
    iss: str
    azp: str
    aud: str
    google_sub: Annotated[str, Field(alias="sub")]
    email: str
    email_verified: bool
    at_hash: str
    name: str
    picture: str
    given_name: str
    iat: int
    exp: int


class GmailHeader(BaseModel):
    name: str
    value: str


class GmailMessagePayload(BaseModel):
    mime_type: str = Field(alias="mimeType")
    headers: list[GmailHeader]


class GmailMessage(BaseModel):
    id: str
    thread_id: str = Field(alias="threadId")
    label_ids: list[str] = Field(alias="labelIds")
    snippet: str
    payload: GmailMessagePayload
    size_estimate: int = Field(alias="sizeEstimate")
    history_id: str = Field(alias="historyId")
    internal_date: str = Field(alias="internalDate")

    class Config:
        # Allows you to instantiate using camelCase or snake_case fields
        populate_by_name = True


class GmailSender(BaseModel):
    email: str
    name: str | None = None
    count: int
    unsubscribe_links: list[str] = Field(default_factory=list, alias="unsubscribeLinks")
    one_click: bool = Field(default=False, alias="oneClick")

    class Config:
        populate_by_name = True


class UserCreate(BaseModel):
    google_sub: str
    email: EmailStr
    name: str | None
    profile_pic_url: HttpUrl | None

    @classmethod
    def from_claims(cls, claims: dict) -> "UserCreate":
        return cls(
            google_sub=claims["google_sub"],
            email=claims["email"],
            name=claims.get("name"),
            profile_pic_url=claims.get("picture"),
        )


class OauthTokenCreate(BaseModel):
    user_id: int
    refresh_token_enc: bytes
    scopes: str
    revoked_at: datetime | None = None
