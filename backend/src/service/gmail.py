import httpx2

from .. import schemas


async def get_all_emails(access_token: str, q: str | None = None):
    async with httpx2.AsyncClient() as client:
        response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            params={
                "q": q if q else "",
                "maxResults": 10
            },
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )
        print(response.status_code)
        print(response.content)
        return schemas.GetMessagesRaw.model_validate(response.json())

# FIXME: implementing new function for dispose of some sensitive information from messages' json
# async def format_messages(messages: ):
    

async def get_email(id: str, access_token: str, threadId: str | None = None):
    async with httpx2.AsyncClient() as client:
        response = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=metadata",
            headers={
                "Authorization": f"Bearer {access_token}"
            }
        )
        return schemas.GmailMessageModel.model_validate(response.json())

# category:updates 
# 
#     
async def main(access_token: str):
    res = await get_all_emails(access_token, "category:updates")
    for message in res.messages:
        ok = await get_email(message.id, access_token)
        for result in ok.payload.headers:
            if result.name == "List-Unsubscribe-Post" or result.name == "List-Unsubscribe":
                print(result)
    
if __name__ == "__main__":
    import asyncio
    asyncio.run(main(access_token))