# Tidy Gmail — project memory

Gmail inbox cleanup: scan senders → bulk unsubscribe. Backend human-written, frontend agent-built.

## Layout

```
backend/   FastAPI, uv, Python 3.13. main.py (app+CORS+register_routers), config.py (root), src/router/auth.py, src/service/auth.py. No DB.
frontend/  Vite+React19+TS strict+Tailwind v4+shadcn base-nova. See frontend/AGENTS.md for full rules.
  src/api/           openapi-fetch client + schema.ts (generated: pnpm gen:api; never hand-edit)
  src/features/auth/ Google sign-in, session, signed-in panel
  src/features/messages/ gmail messages query + virtualized table
  src/pages/, src/components/ui/, src/App.tsx (router+providers)
```

## Auth flow (dev)

1. Button → `GET {VITE_API_URL}/auth/google/url` (302 → Google)
2. Google → `http://localhost:5173/auth?code=…`
3. Frontend `POST /auth/google/callback`, body = **bare JSON string** code (FastAPI `Body()` scalar, not `{"code":…}`)
4. Backend returns Google ID-token claims → UI shows avatar+name+claim rows
- Session: `sessionStorage "tidy_gmail_session"` — temporary stand-in, human-approved. Replace with httpOnly JWT cookie. Never keep Google tokens client-side.
- `VITE_API_URL=http://localhost:8000` in `frontend/.env` (gitignored).

## Backend gaps (human owns backend; agents do NOT edit it)

- Callback returns `{"user_info":…, "messages":GmailListJson}` (frontend seeds query cache, table shows instantly on button click); rows still `{id, threadId}` — enrich with from/subject/date before table columns fill (`format=metadata` + `metadataHeaders`, Authorization Bearer missing in `get_email`)
- `GET /gmail/messages?access_token=…` — human chose browser-side token (dev shortcut, AGENTS rule consciously overridden): callback must also return `access_token`; frontend stores it in sessionStorage, sends as query param; supersede with session JWT cookie ASAP
- httpOnly JWT cookie in callback (claims currently returned raw)
- `state`/PKCE on `/auth/google/url` (CSRF)
- Scope now includes `https://mail.google.com/`; CORS `allow_origins=["*"]` (Starlette reflects origin — preflight OK)
- Unhandled 500s lose CORS headers → frontend shows generic network error, not body

## Commands

- `cd frontend && pnpm typecheck && pnpm lint && pnpm build`
- `pnpm gen:api` — backend must run on :8000
- Backend: `cd backend && uv run uvicorn main:app --reload`

## Gotchas (cost debugging time)

- shadcn CLI writes literal `@/` dir at repo root — move into `src/`
- TS 6: no `baseUrl`; path `paths` resolve from tsconfig location
- React 19 dev warning "Encountered a script tag" = next-themes bootstrap — benign, ignore
- oxlint warning in shadcn `button.tsx` (cva export) — benign
- React-compiler warning on `useVirtualizer` — benign (informational)
- Backend callback returns 500 while human iterates — frontend shows error card + body, by design

## Conventions

- New UI elements follow shadcn-admin patterns: https://github.com/satnaing/shadcn-admin (reference only; lists >100 rows still virtualize with TanStack Virtual)
- Server data only in `features/*/queries.ts`; components never call `fetch` directly
- Missing endpoint → Backend request note in code, never mock it
- Optimistic updates for unsubscribe; skeletons for loading; loading/empty/error always
