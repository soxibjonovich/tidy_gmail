# Tidy Gmail — project memory

Gmail inbox cleanup: scan senders → bulk unsubscribe. Backend human-written, frontend agent-built.

## Layout

```
backend/   FastAPI, uv, Python 3.13. main.py (app+CORS+register_routers), config.py (root; reads backend/.env). src/schemas.py; src/router/{auth,gmail,deps}.py; src/service/{auth,gmail,user,token}.py; src/repository/{users,tokens}.py; src/database/{models,engine}.py (SQLAlchemy async + Postgres).
frontend/  Vite+React19+TS strict+Tailwind v4+shadcn base-nova. See frontend/AGENTS.md for full rules.
  src/api/           openapi-fetch client + schema.ts (generated: pnpm gen:api; never hand-edit)
  src/features/auth/ Google sign-in, session, signed-in panel
  src/features/messages/ gmail messages query + MessageTable (react-table v8: sort/global-search/column-visibility/faceted label filter/client pagination)
  src/components/data-table/ shadcn-admin port to base-ui: column-header, toolbar, view-options, faceted-filter, pagination, index
  src/pages/ AuthPage, ProfilePage, MessagesPage (all lazy)
  src/components/layout/AppShell.tsx (sidebar nav /messages /profile, session guard), src/components/ui/, src/App.tsx (router+providers)
```

## Auth flow (dev)

1. Button → `GET {VITE_API_URL}/auth/google/url` (302 → Google)
2. Google → `http://localhost:5173/auth?code=…`
3. Frontend `POST /auth/google/callback`, body = **bare JSON string** code (FastAPI `Body()` scalar, not `{"code":…}`)
4. Backend returns Google ID-token claims → session stored → redirect `/messages` (AppShell: sidebar nav Messages/Profile; Profile page shows claims + masked token)
- Routes: `/auth` outside shell; `/messages`, `/profile` inside AppShell (getSession guard → `/auth`); `/` → `/messages`; `*` → ErrorPage(404)
- HTTP errors: `ApiError` in `src/lib/api-error.ts` (status-aware). Global 401 → `QueryErrorListener` clears session + redirects `/auth` + toast. 500/network → per-view `errorMessage()` (table retry; callback shows raw body)
- Session: `sessionStorage "tidy_gmail_session"` — temporary stand-in, human-approved. Replace with httpOnly JWT cookie. Never keep Google tokens client-side.
- `VITE_API_URL=http://localhost:8000` in `frontend/.env` (gitignored).

## Backend gaps (human owns backend; agents do NOT edit it)

- Callback returns `{"user_info":…, "messages":GmailMessageList(ids-only), "access_token":…}` (frontend stores token, ignores callback messages); `GET /gmail/messages?access_token&q=` returns **bare array** of enriched rows `{id,threadId,labelIds,snippet,payload{mimeType,headers[]},internalDate}` — table reads From/Subject from headers, date from internalDate; backend does serial N+1 get_email (slow, maxResults 10, no pagination)
- `GET /gmail/messages/{id}?access_token` → single `GmailMessage` (row detail view, unused yet)
- `GET /gmail/messages?access_token=…` — human chose browser-side token (dev shortcut, AGENTS rule consciously overridden): callback must also return `access_token`; frontend stores it in sessionStorage, sends as query param; supersede with session JWT cookie ASAP. Frontend already JWT-ready: `credentials: "include"` on every request; `?access_token` sent only when a stored token exists — delete that branch when backend issues the httpOnly cookie
- httpOnly JWT cookie in callback (claims currently returned raw)
- `state`/PKCE on `/auth/google/url` (CSRF)
- Scope now includes `https://mail.google.com/`; CORS `allow_origins=["*"]` (Starlette reflects origin — preflight OK)
- Unhandled 500s lose CORS headers → frontend shows generic network error, not body
- `GET /gmail/*` routers carry `Depends(get_current_user)` (`src/router/deps.py`) but it's a no-op stub (prints credentials, decode commented out) → Gmail routes are unauthenticated in practice; the `access_token` query param is the real credential

### Backend schema names (renamed 2026-10-11)

`GmailMessageRef` (id+threadId) · `GmailMessageList` · `GoogleTokenResponse` · `GoogleIdTokenClaims` (`sub`→`google_sub` alias) · `GmailHeader` · `GmailMessagePayload` · `GmailMessage` · `UserCreate` (`from_claims`) · `OauthTokenCreate`.
Convention: noun-first + role suffix (`XxxCreate`/`XxxRead`); domain prefix (`Gmail*`/`Google*`); no `Info`/`Model`/`Raw` filler.

### Backend DB state — NOT bootable yet (app import fails → callback 500)

Done: `engine.py` = `create_async_engine` + `async_sessionmaker` + `get_db`; `config.py` has `FERNET_KEY` + `JWT_SECRET_KEY`/`JWT_ALGORITHM`; `sqlalchemy[asyncio]` in pyproject. Still missing: `psycopg` + `cryptography` deps (`service/token.py` imports `Fernet` → ImportError at import); DSN must be `postgresql+psycopg://`. Flow: callback → `UserCreate.from_claims` → `User` (get-or-create via `service/user.py`) → `token.save_refresh_token` (Fernet) → `OauthToken`; then `service.create_token(user)` mints an app JWT set as `Authorization: Bearer` response header (frontend ignores it — still uses raw claims + `access_token`).

## Commands

- `cd frontend && pnpm typecheck && pnpm lint && pnpm build`
- `pnpm gen:api` — backend must run on :8000
- Backend: `cd backend && uv run uvicorn main:app --reload`
- No test suite configured anywhere (no pytest/vitest) — verification is the frontend gate above; backend is manual

## Gotchas (cost debugging time)

- shadcn CLI writes literal `@/` dir at repo root — move into `src/`
- TS 6: no `baseUrl`; path `paths` resolve from tsconfig location
- React 19 dev warning "Encountered a script tag" = next-themes bootstrap — benign, ignore
- oxlint warning in shadcn `button.tsx` (cva export) — benign
- React-compiler warning on `useReactTable` — benign (informational, same class as old `useVirtualizer` note)
- Backend callback returns 500 while human iterates — frontend shows error card + body, by design
- `from config import settings` resolves only from `backend/` cwd; `.env` via `SettingsConfigDict(env_file=<abs Path>)` — never cwd-relative
- Dependency is `httpx2`, not `httpx` (pyproject + venv match)
- `AttributeError: 'X' object has no attribute 'foo'` (truncated name) = code mid-autocomplete save; source already fixed → restart `--reload`, reload misses fast save cycles
- base-ui (not Radix): menu parts must be inside a group — ungrouped `DropdownMenuLabel`/`CheckboxItem`/`RadioItem` throw `Base UI error #31` and crash the render tree. Wrap in `DropdownMenuGroup`/`DropdownMenuRadioGroup`. Radix shadcn-admin examples omit this.
- base-ui triggers use `render={<Button/>}` (not `asChild`), set `aria-haspopup` + `data-popup-open`/`data-pressed` (no `data-state`); base-nova `buttonVariants` `active:not-aria-[haspopup]:translate-y-px` therefore skips trigger press-down.
- `cn` here is tailwind-merge-like (drops conflicting utilities) — `cn("inline-flex", "hidden lg:flex")` keeps only `lg:flex`.
- shadcn `command` pulls in `cmdk` + scaffolds `dialog`/`input-group`/`textarea`; adds ~35 KB gz to the lazy messages chunk.

## Progress / review backlog

See `PROGRESS.md` — dated done-list + open findings (secrets committed, schema defaults, N+1, token prints). Update both files when milestone lands.

## Conventions

- New UI elements follow shadcn-admin patterns: https://github.com/satnaing/shadcn-admin (reference only). TanStack Table pinned to **v8** (`@tanstack/react-table@8.21.3`) — v9 changed API (`useTable`/features/Subscribe); shadcn-admin examples are v8. Revisit TanStack Virtual when backend paginates (current maxResults=10, no virtualization needed)
- `src/components/data-table/` = local base-ui port of shadcn-admin's data-table (`components/data-table/*`): Radix icons → lucide, `asChild` → `render`, `data-[state=open]` → `data-popup-open`. Gmail `labelIds` badges reuse the shadcn-admin role/status badge look (icon + tinted outline `Badge`, `callTypes`-style colors + hashed fallback palette, max 3 + `+n`).
- Server data only in `features/*/queries.ts`; components never call `fetch` directly
- Missing endpoint → Backend request note in code, never mock it
- Optimistic updates for unsubscribe; skeletons for loading; loading/empty/error always
