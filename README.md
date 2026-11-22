# Tidy Gmail

A web app that helps you clean up a Gmail inbox: sign in with Google, see which senders fill your inbox, and unsubscribe from them. It is a personal learning project and is still work in progress.

## Demo

<!-- TODO: add a screenshot or GIF -->

## Features

- Sign in with Google (OAuth 2.0 authorization-code flow).
- Table of recent Gmail messages with search, sorting, column visibility and a label filter.
- Senders page that groups messages by sender and collects their unsubscribe links (from the `List-Unsubscribe` header).
- Bulk unsubscribe endpoint that sends one-click (RFC 8058) unsubscribe requests and does not follow redirects.
- Users and their Google refresh tokens are saved in PostgreSQL. Refresh tokens are encrypted with Fernet. The backend issues its own JWT after login.

## Status and known limits

- Only the 100 most recent messages are scanned for senders. There is no pagination yet.
- Authentication is still being finished. The frontend keeps the Google access token in `sessionStorage` and sends it as a query parameter. This is a temporary shortcut, not a safe design for production.
- CORS currently allows all origins, and there is no `state`/PKCE check on the Google login URL.
- There are no automated tests. The frontend is checked with `typecheck`, `lint` and `build`.

`PROGRESS.md` in the repo keeps a dated list of what is done and what is still open.

## Tech stack

- Backend: Python 3.13, FastAPI, SQLAlchemy (async) with PostgreSQL (`psycopg`), Pydantic, PyJWT, `cryptography`, `httpx2`, uvicorn. Managed with `uv`.
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Base UI), TanStack Query and Table, React Router, `openapi-fetch`. Managed with `pnpm`.

## How to run

You need a Google Cloud OAuth client with `http://localhost:5173/auth` as an authorized redirect URI, and a PostgreSQL database.

Backend (`backend/.env`, never commit it):

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/tidy_gmail
FERNET_KEY=your-generated-fernet-key
JWT_SECRET_KEY=your-random-secret
JWT_ALGORITHM=HS256
```

```bash
cd backend
uv sync
uv run uvicorn main:app --reload     # http://localhost:8000
```

Tables are created automatically on startup.

Frontend (`frontend/.env`):

```env
VITE_API_URL=http://localhost:8000
```

```bash
cd frontend
pnpm install
pnpm dev                             # http://localhost:5173
```

Useful frontend commands: `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm gen:api` (regenerates API types from the running backend).

## Project structure

```
backend/    FastAPI app: router/ -> service/ -> repository/ -> database/
frontend/   React app: pages/, features/ (auth, messages, senders), components/
PROGRESS.md dated progress log and open issues
```

## What I learned

<!-- TODO: write 2-4 sentences in your own words -->
