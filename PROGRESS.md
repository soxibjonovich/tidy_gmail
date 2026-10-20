# PROGRESS — dated log. Append, never rewrite history. Backlog lives here, not in AGENTS.md.

## Done — 2026-10-08

- OAuth end-to-end: `GET /auth/google/url` → Google consent → `POST /auth/google/callback` (bare JSON string code) → token exchange → id_token claims to frontend. Scope: `openid email profile https://mail.google.com/`.
- Gmail endpoints: `GET /gmail/messages?access_token&q=` → bare array of enriched rows (ids → per-id `format=metadata` fetch); `GET /gmail/messages/{id}?access_token` → single `GmailMessageModel`.
- `src/schemas.py`: `GoogleSignInResponse`, `GetMessagesRaw` (nextPageToken nullable), `GmailMessageModel` (camelCase aliases, `populate_by_name`).
- `config.py` root with `SettingsConfigDict(env_file=<abs>)` — loads `.env` from any cwd.
- CORS middleware on (`allow_origins=["*"]`, credentials). Frontend: auth session, MessagesPage MessageTable, `pnpm gen:api` types synced.

## Open — review 2026-10-08

Blockers:

- 🔴 `backend/.env` committed (GOOGLE_CLIENT_ID/SECRET), root `.gitignore` has no `.env` → rotate keys, add ignore, `git rm --cached backend/.env`.
- 🔴 `schemas.py` `nextPageToken: str | None` and `messages: list[…]` required keys — Gmail omits both when absent → ValidationError. Default `= None`.
- 🔴 `service/gmail.py` `__main__`: live access_token hardcoded + committed → delete, rotate.

Warnings:

- 🟡 `router/auth.py:24` `print(res.access_token)` — token in logs. Remove.
- 🟡 `service/auth.py` non-200 token response still validated → confusing ValidationError instead of Google error body.
- 🟡 N+1 serial `get_email` per list row; `maxResults=10`, no `pageToken` loop → most of inbox never seen. Parallelize + paginate.
- 🟡 `access_token` as query param (browser → URL → access logs). Known dev shortcut; supersede with httpOnly JWT cookie.
- 🟡 Scope = full `https://mail.google.com/` (read+modify+delete). Scan/unsubscribe needs `gmail.readonly` + `gmail.modify` only.
- 🟡 `main.py` CORS `allow_origins=["*"]` + `allow_credentials=True` — invalid per spec. Pin `http://localhost:5173`.
- 🟡 Missing `state`/PKCE on auth URL (CSRF); claims returned raw — no JWT cookie yet.

Nits:

- 🟢 `HeaderItem.name: Literal[…] | str` collapses to `str` — pointless.
- 🟢 `GmailMessageModel` legacy `class Config` → `model_config = ConfigDict(...)`.
- 🟢 `redirect_uri` hardcoded twice in `service/auth.py` → module constant.

## Next milestone

Unsubscribe flow: parse `List-Unsubscribe` / `List-Unsubscribe-Post` (one-click POST), then sender aggregation endpoint. Blocked-by: schema defaults + pagination above (scan must see whole inbox first).

## Done — 2026-10-11

- Replicated shadcn-admin data-table design: ported `frontend/src/components/data-table/` (column-header, toolbar, view-options, faceted-filter, pagination, index) to base-ui; rewrote `MessageTable.tsx` to the users-table structure.
- Gmail `labelIds` rendered with the shadcn-admin role/status badge pattern — icon + colored outline `Badge` (system labels + `CATEGORY_*`, hashed fallback palette), max 3 + `+n`.
- Messages table now: global search, `Labels` faceted filter, per-column sort/hide header dropdowns, `View` column-visibility dropdown, client pagination (pageSize 10).
- Added shadcn (base-nova) UI: badge, separator, popover, command, select, checkbox (+ scaffolds dialog, input-group, textarea). New dep: `cmdk`.
- Fixed crash: base-ui requires menu parts inside `<Menu.Group>` — ungrouped `DropdownMenuLabel`/`CheckboxItem` in `view-options.tsx` threw `Base UI error #31` and blanked the table on `View` click.
- Verified via headless Chrome against the built app (stubbed `/gmail/messages`): menu opens, toggling hides a column, no pageerror.

## Open — review 2026-10-11

- 🟡 Button press inconsistency (pending decision): base-nova `active:not-aria-[haspopup]:translate-y-px` skips triggers (`aria-haspopup`) → `View`/`Labels`/column headers don't depress like `Refresh`/pagination. Choice: unify all-drop vs no-drop in `frontend/src/components/ui/button.tsx`.
- 🟡 Bundle: lazy `MessagesPage` chunk 61→98 KB gz (cmdk + command + popover + select); initial `index` ~96 KB gz + `button` 18.65 KB gz + css 12 KB gz. Under the 200 KB budget but worth watching; consider code-splitting data-table bits if it grows.
- 🟢 Added shadcn components without asking (permitted by `frontend/AGENTS.md` CLI rule); `cmdk` came in transitively via `command`.
- 🟢 `cn` (pkg `cn@0.4.0`) is tailwind-merge-like despite the name.

## Done — 2026-10-11 (backend: user/token persistence + renames)

- Schema renames (approx 9 files): `MessageInfo`→`GmailMessageRef`, `GetMessagesRaw`→`GmailMessageList`, `GoogleSignInResponse`→`GoogleTokenResponse`, `UserJWTInfo`→`GoogleIdTokenClaims`, `HeaderItem`→`GmailHeader`, `Payload`→`GmailMessagePayload`, `GmailMessageModel`→`GmailMessage`, `CreateUser`→`UserCreate`, `CreateToken`→`OauthTokenCreate`. Convention: noun-first + `XxxCreate`/`XxxRead` suffix, domain prefix, no `Info`/`Model`/`Raw`.
- `schemas.py`: `GmailMessageList.nextPageToken`/`resultSizeEstimate` now default `None`; `UserJWTInfo.google_sub` aliased to `sub`; `UserCreate.email: EmailStr`, `profile_pic_url: HttpUrl`; added `OauthTokenCreate` (`refresh_token_enc: bytes`, `revoked_at | None`). Removed Ellipsis-typed `user` field (was crashing schema generation).
- `repository/users.py`: `create_user` + `get_user(db, conditions)` (get-or-create pattern chosen over upsert).
- `repository/tokens.py`: `get_token` + `upsert_refresh_token` (get-or-update on unique `user_id`, revives `revoked_at`).
- `service/token.py` (new): Fernet `encrypt`/`decrypt` + `save_refresh_token(user_id, refresh_token, scopes)` (skips when no refresh token).
- `router/auth.py`: callback wires `UserCreate.from_claims(user_info.model_dump())`, then `token.save_refresh_token(...)` on **every** login; removed stray `...` and the `print(access_token)`.
- `service/auth.py`: `decode_token` returns typed `GoogleIdTokenClaims`; `GoogleTokenResponse` on exchange.

## Open — 2026-10-11 (backend)

Blockers (app won't import):

- 🔴 deps: add `sqlalchemy[asyncio]` (greenlet), `psycopg`, `cryptography` (service/token.py imports Fernet today → ImportError).
- 🔴 `src/database/engine.py`: still sync `create_engine` + module-global `session`; needs `create_async_engine` + `async_sessionmaker` + `get_db` dependency (`router/auth.py` `Depends(get_db)` is undefined → NameError).
- 🔴 `FERNET_KEY` missing from `config.py`/`.env` → `settings.FERNET_KEY` AttributeError; DSN must be `postgresql+psycopg://`.
- 🔴 `backend/.env` still git-tracked (holds GOOGLE_SECRET + DATABASE_URL) → `git rm --cached`, add ignore, rotate.

Warnings:

- 🟡 `service/auth.py` `prompt="select_account"` → refresh_token only on first consent; use `prompt="consent"` (or handle `None`).
- 🟡 token exchange non-200 path prints then still validates → confusing ValidationError.
- 🟡 N+1 serial `get_email`, `maxResults=10`, no `pageToken` loop.
- 🟡 `access_token` as query param (dev shortcut, human-approved); frontend-held, pass as arg. Upgrade path: Bearer header now, httpOnly JWT cookie + server-side mint later. Server-side token storage tiers discussed (memory cache / Redis / DB).
- 🟡 `main.py` CORS `*` + credentials; full `https://mail.google.com/` scope; missing `state`/PKCE.

Nits:

- 🟢 `GmailMessage` legacy `class Config` → `model_config`.
- 🟢 repo `conditions: list` untyped; duplicated `if not conditions` guard in service + repo; `service/user.py` `**kwargs` swallows unknown keys.
- 🟢 commented hardcoded token blocks in `service/auth.py` / `service/gmail.py` — delete.

## Next milestone (unchanged)

Unsubscribe flow + sender aggregation; blocked-by: DB bootable + pagination above.

## Done — 2026-10-20

- `/gmail/senders` "doesn't work" diagnosed in two parts: (a) bare URL without
  `Authorization: Bearer <app JWT>` → 401 from `deps.py` gate (by design — the UI
  sends the header and gets 200); (b) the UI request took **49s** (100 serial
  `get_email` calls) → skeleton looked hung.
- `service/gmail.py` `get_senders`: metadata fetches now run under a 20-wide
  `asyncio.Semaphore` (failed rows skipped; first error raised if none succeed).
  Same 23 senders, **49s → ~3s**. Aggregation/parse logic untouched.
- Frontend `features/senders/queries.ts`: 60s abort timeout → clear 504 error
  card with Retry instead of an infinite skeleton; API error bodies now surface
  `{"detail": ...}` instead of bare `statusText`. `typecheck && lint && build` green.
- Still open: `/gmail/messages` keeps serial N+1 (maxResults=10); senders scan
  capped at 100 messages, no `pageToken` pagination.
