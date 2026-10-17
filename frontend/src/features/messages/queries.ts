import { useQuery } from "@tanstack/react-query"
import { getAccessToken, getAppToken } from "@/features/auth/queries"
import { ApiError } from "@/lib/api-error"

/**
 * Endpoints now (backend/src/router/gmail.py):
 * - POST /auth/google/callback -> { user_info, messages: GetMessagesRaw
 *   (ids-only), access_token }. Frontend stores token, ignores callback
 *   messages (not display-ready).
 * - GET /gmail/messages?access_token&q= -> bare array enriched per row:
 *   { id, threadId, labelIds, snippet, payload: { mimeType, headers[] },
 *   internalDate } — backend does N+1 get_email per id (slow, maxResults 10).
 *   Table reads From/Subject from payload.headers, date from internalDate.
 *
 * access_token in sessionStorage + URL query = human-approved dev shortcut;
 * supersede with httpOnly JWT cookie + server-side token. GET
 * /gmail/messages/{id} available for future row detail view.
 */

export type GmailMessage = { id: string } & Record<string, unknown>

export const gmailMessagesKey = ["gmail", "messages"] as const

/** Accepts bare array, Gmail list JSON, or null — returns rows or null. */
export function extractMessages(value: unknown): GmailMessage[] | null {
  if (Array.isArray(value)) return value as GmailMessage[]
  if (typeof value === "object" && value !== null) {
    const rows = (value as { messages?: unknown }).messages
    if (Array.isArray(rows)) return rows as GmailMessage[]
  }
  return null
}

const apiBaseUrl: string | undefined = import.meta.env.VITE_API_URL

export function useGmailMessages(enabled: boolean) {
  return useQuery({
    queryKey: gmailMessagesKey,
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async ({ signal }) => {
      const url = new URL(`${apiBaseUrl}/gmail/messages`)
      // Dev shortcut: token as query param. Once the backend issues its httpOnly
      // JWT cookie, drop this branch — `credentials: "include"` already sends it.
      const token = getAccessToken()
      if (token) url.searchParams.set("access_token", token)
      const appToken = getAppToken()
      const res = await fetch(url, {
        credentials: "include",
        signal,
        headers: appToken ? { Authorization: `Bearer ${appToken}` } : undefined,
      })
      if (!res.ok) {
        throw new ApiError(res.statusText || `HTTP ${res.status}`, res.status)
      }
      const json: unknown = await res.json()
      const messages = extractMessages(json)
      if (!messages) throw new ApiError("Unexpected response shape")
      return messages
    },
  })
}
