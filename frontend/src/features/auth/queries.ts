import { useMutation } from "@tanstack/react-query"
import { api } from "@/api/client"

/**
 * Backend contract (backend/src/router/auth.py):
 * GET  /auth/google/url      -> 302 Google consent (redirect_uri=http://localhost:5173/auth)
 *                              scope incl. https://mail.google.com/
 * POST /auth/google/callback body: bare JSON string code ->
 *   { user_info, messages: GmailListJson, access_token }
 *
 * Backend request: add access_token to callback response (human chose
 * browser-side transport for it — dev-only, supersede with httpOnly JWT
 * cookie + server-side token storage later). Gmail messages = access_token
 * query param on GET /gmail/messages. httpOnly JWT cookie; state/PKCE (CSRF).
 * CORS done.
 */

export type AuthUser = { name: string } & Record<string, unknown>

const apiBaseUrl: string | undefined = import.meta.env.VITE_API_URL
const SESSION_KEY = "tidy_gmail_session"
// Google access token in JS-readable storage: human-approved dev shortcut
// (AGENTS forbids it long-term) — remove when backend holds it server-side.
const TOKEN_KEY = "tidy_gmail_access_token"
// App JWT minted by the backend, returned as the `Authorization: Bearer` response
// header on callback. Readable cross-origin only because CORS exposes it.
const APP_TOKEN_KEY = "tidy_gmail_app_token"

export function isApiConfigured(): boolean {
  return Boolean(apiBaseUrl)
}

export function googleSignInUrl(): string {
  if (!apiBaseUrl) {
    throw new Error("VITE_API_URL is not set")
  }
  return `${apiBaseUrl}/auth/google/url`
}

/**
 * sessionStorage stand-in for a session cookie — human-approved, temporary,
 * tab-scoped. Swap for httpOnly JWT cookie once backend issues one.
 */
export function getSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { name?: unknown }).name === "string"
    ) {
      return parsed as AuthUser
    }
    return null
  } catch {
    return null
  }
}

export function setSession(user: AuthUser): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAppToken(token: string): void {
  sessionStorage.setItem(APP_TOKEN_KEY, token)
}

export function getAppToken(): string | null {
  return sessionStorage.getItem(APP_TOKEN_KEY)
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(APP_TOKEN_KEY)
}

/**
 * Callback response is untyped in the OpenAPI schema (backend has no
 * response_model) and currently JSON-stringifies `user_info`/`messages`
 * (model_dump_json) — tolerate both stringified and object forms. Regenerate
 * with `pnpm gen:api` once the backend adds a response_model.
 */
export type GoogleCallbackResult = {
  user: AuthUser | null
  accessToken: string | null
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function parseCallbackResponse(raw: unknown): GoogleCallbackResult {
  if (typeof raw !== "object" || raw === null) {
    return { user: null, accessToken: null }
  }
  const { user_info, access_token } = raw as {
    user_info?: unknown
    access_token?: unknown
  }
  const info = parseMaybeJson(user_info)
  const user =
    typeof info === "object" &&
    info !== null &&
    typeof (info as { name?: unknown }).name === "string"
      ? (info as AuthUser)
      : null
  return {
    user,
    accessToken:
      typeof access_token === "string" && access_token ? access_token : null,
  }
}

export function useGoogleCallback() {
  return useMutation({
    mutationFn: async (code: string) => {
      try {
        const { data, error, response } = await api.POST(
          "/auth/google/callback",
          { body: code },
        )
        if (!response.ok) {
          throw error ?? { message: `HTTP ${response.status}` }
        }
        // Backend returns its app JWT as `Authorization: Bearer <jwt>`.
        const authHeader = response.headers.get("Authorization")
        if (authHeader?.startsWith("Bearer ")) {
          setAppToken(authHeader.slice("Bearer ".length))
        }
        return data
      } catch (e) {
        if (e instanceof TypeError) {
          throw {
            message: `${e.message} — backend unreachable or missing CORS middleware`,
          }
        }
        throw e
      }
    },
  })
}
