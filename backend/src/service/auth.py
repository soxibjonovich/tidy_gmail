import urllib.parse
from datetime import UTC, datetime, timedelta

import httpx2
import jwt
from config import settings
from src import schemas
from src.database import models


def generate_google_auth() -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": "http://localhost:5173/auth",
        "response_type": "code",
        "scope": "openid email profile https://mail.google.com/",
        "access_type": "offline",
        "prompt": "consent",
    }

    query_string = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    base_url = "https://accounts.google.com/o/oauth2/v2/auth"
    return f"{base_url}?{query_string}"


async def exchange_code(code: str):
    async with httpx2.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": "http://localhost:5173/auth",
                "code": code,
            },
        )
        if response.status_code != 200:
            print(response.content)
        return schemas.GoogleTokenResponse.model_validate(response.json())


async def refresh_access_token(refresh_token: str) -> str:
    async with httpx2.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        return response.json().get("access_token")
    

async def decode_google_token(token: str) -> schemas.GoogleIdTokenClaims:
    user_data = jwt.decode(
        token,
        algorithms=["RS256"],
        options={"verify_signature": False},
    )

    return schemas.GoogleIdTokenClaims.model_validate(user_data)


def create_token(user: models.User, expiration_hours: int = 24) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user.id),
        "gsub": user.google_sub,
        "email": user.email,
        "iat": now,
        "exp": now + timedelta(hours=expiration_hours),
    }
    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def _decode_jwt(token: str) -> dict | None:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError as e:
        print(e)
        return None


def decode_token(token: str) -> dict | None:
    return _decode_jwt(token)
