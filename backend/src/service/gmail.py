import asyncio
import email.utils
import ipaddress
import re
import socket

import httpx2
from fastapi import HTTPException
from pydantic import HttpUrl

from src import schemas

_UNSUBSCRIBE_TIMEOUT = 10.0
_UNSUBSCRIBE_HEADERS = ["From", "List-Unsubscribe", "List-Unsubscribe-Post"]
_ANGLE_LINK_RE = re.compile(r"<([^>]+)>")


async def get_all_emails(access_token: str, q: str | None = None, max_results: int = 10):
    async with httpx2.AsyncClient() as client:
        response = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages",
            params={"q": q if q else "", "maxResults": max_results},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code != 200:
            raise HTTPException(response.status_code, response.json())
        return schemas.GmailMessageList.model_validate(response.json())


# FIXME: implementing new function for dispose of some sensitive information from messages' json
# async def format_messages(messages: ):


async def get_email(
    id: str,
    access_token: str,
    threadId: str | None = None,
    metadata_headers: list[str] | None = None,
):
    params: dict[str, object] = {"format": "metadata"}
    if metadata_headers:
        params["metadataHeaders"] = metadata_headers
    async with httpx2.AsyncClient() as client:
        response = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}",
            params=params,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if response.status_code != 200:
            raise HTTPException(response.status_code, response.text)
        return schemas.GmailMessage.model_validate(response.json())


async def _is_public_host(host: str) -> bool:
    """SSRF guard: only allow hosts that resolve exclusively to public IPs."""
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None)
    except socket.gaierror:
        return False
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
    return True


async def unsubscribe(links: list[HttpUrl]) -> list[dict]:
    """RFC 8058 one-click unsubscribe. Redirects are NOT followed on purpose."""
    results: list[dict] = []
    async with httpx2.AsyncClient(
        timeout=_UNSUBSCRIBE_TIMEOUT, follow_redirects=False
    ) as client:
        for link in links:
            url = str(link)
            if link.scheme not in ("http", "https") or not await _is_public_host(
                link.host
            ):
                results.append(
                    {"link": url, "ok": False, "status": None, "error": "blocked host"}
                )
                continue
            try:
                response = await client.post(
                    url,
                    content="List-Unsubscribe=One-Click",
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                results.append(
                    {
                        "link": url,
                        "ok": response.is_success,
                        "status": response.status_code,
                    }
                )
            except httpx2.HTTPError as exc:
                results.append(
                    {"link": url, "ok": False, "status": None, "error": str(exc)}
                )
    return results


def _header_value(headers: list[schemas.GmailHeader], name: str) -> str | None:
    target = name.lower()
    for header in headers:
        if header.name.lower() == target:
            return header.value
    return None


def _parse_from(value: str) -> tuple[str | None, str]:
    name, address = email.utils.parseaddr(value)
    return name.strip() or None, (address or value).strip().lower()


def _http_links(value: str) -> list[str]:
    candidates = _ANGLE_LINK_RE.findall(value) or value.split(",")
    links: list[str] = []
    for candidate in candidates:
        link = candidate.strip().strip("<>")
        if link.lower().startswith(("http://", "https://")) and link not in links:
            links.append(link)
    return links


def _is_one_click(value: str | None) -> bool:
    return value is not None and "one-click" in value.lower()


_SENDERS_CONCURRENCY = 20  # Gmail quota: 250 units/s, messages.get = 5 units


async def get_senders(access_token: str) -> list[schemas.GmailSender]:
    """Aggregate inbox senders. Metadata headers are fetched with bounded
    concurrency — a serial pass over 100 messages took ~50s and made the UI
    look hung."""
    ids = await get_all_emails(access_token, max_results=100)
    semaphore = asyncio.Semaphore(_SENDERS_CONCURRENCY)

    async def fetch(
        message_ref: schemas.GmailMessageRef,
    ) -> schemas.GmailMessage | BaseException:
        async with semaphore:
            try:
                return await get_email(
                    message_ref.id,
                    access_token,
                    metadata_headers=_UNSUBSCRIBE_HEADERS,
                )
            except Exception as exc:  # one bad message must not sink the scan
                return exc

    results = await asyncio.gather(*(fetch(ref) for ref in ids.messages))
    messages = [r for r in results if isinstance(r, schemas.GmailMessage)]
    failures = [r for r in results if isinstance(r, BaseException)]
    if not messages and failures:
        raise failures[0]

    aggregated: dict[str, schemas.GmailSender] = {}
    for message in messages:
        headers = message.payload.headers
        from_raw = _header_value(headers, "From")
        if not from_raw:
            continue
        name, address = _parse_from(from_raw)
        sender = aggregated.get(address)
        if sender is None:
            sender = schemas.GmailSender(email=address, name=name, count=0)
            aggregated[address] = sender
        elif sender.name is None and name:
            sender.name = name
        sender.count += 1
        for link in _http_links(_header_value(headers, "List-Unsubscribe") or ""):
            if link not in sender.unsubscribe_links:
                sender.unsubscribe_links.append(link)
        if _is_one_click(_header_value(headers, "List-Unsubscribe-Post")):
            sender.one_click = True
    return list(aggregated.values())
