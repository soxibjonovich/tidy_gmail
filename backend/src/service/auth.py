import urllib.parse

import httpx2
import jwt

from config import settings
from src import schemas


def generate_google_auth() -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": "http://localhost:5173/auth",
        "response_type": "code",
        "scope": "openid email profile https://mail.google.com/"
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
                "code": code
            }
        )
        print(response.status_code)
        if response.status_code != 200:
            print(response.content)
        return schemas.GoogleSignInResponse.model_validate(response.json())


async def decode_token(token: str) -> dict:
    user_data = jwt.decode(
        token,
        algorithms=["RS256"],
        options={"verify_signature": False},
    )
    
    return user_data

    
# if __name__ == "__main__":
#     import asyncio
