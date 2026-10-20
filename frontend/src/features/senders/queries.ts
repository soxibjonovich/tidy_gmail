import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getAccessToken, getAppToken } from "@/features/auth/queries"
import { ApiError } from "@/lib/api-error"

/**
 * Backend request (backend/src/router/gmail.py — human-owned):
 *   GET  /gmail/senders?access_token -> bare array of Sender
 *        { email, name, count, unsubscribeLinks: string[], oneClick: boolean }
 *        unsubscribeLinks parsed from List-Unsubscribe; oneClick = List-Unsubscribe-Post
 *        says `List-Unsubscribe=One-Click` (RFC 8058).
 *   POST /gmail/messages/unsubscribe   body: string[]  (one-click https URLs only)
 */

export type Sender = {
  email: string
  name: string | null
  count: number
  unsubscribeLinks: string[]
  oneClick: boolean
}

export const sendersKey = ["gmail", "senders"] as const

const apiBaseUrl: string | undefined = import.meta.env.VITE_API_URL

// Safety net: backend aggregates ~100 messages (a serial regression ~50s).
// Past this, fail into the error card with Retry instead of a stuck skeleton.
const SENDERS_TIMEOUT_MS = 60_000

function appAuthHeader(): Record<string, string> {
  const appToken = getAppToken()
  return appToken ? { Authorization: `Bearer ${appToken}` } : {}
}

async function toApiError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => null)
  const detail = (body as { detail?: unknown } | null)?.detail
  return new ApiError(
    typeof detail === "string" ? detail : res.statusText || `HTTP ${res.status}`,
    res.status,
  )
}

export function useSenders() {
  return useQuery({
    queryKey: sendersKey,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const url = new URL(`${apiBaseUrl}/gmail/senders`)
      const token = getAccessToken()
      if (token) url.searchParams.set("access_token", token)
      let res: Response
      try {
        res = await fetch(url, {
          credentials: "include",
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(SENDERS_TIMEOUT_MS),
          ]),
          headers: appAuthHeader(),
        })
      } catch (e) {
        if (e instanceof DOMException && e.name === "TimeoutError") {
          throw new ApiError(
            `Scan timed out after ${SENDERS_TIMEOUT_MS / 1000}s — the backend did not answer. Retry, or check its logs.`,
            504,
          )
        }
        throw e
      }
      if (!res.ok) {
        throw await toApiError(res)
      }
      const json: unknown = await res.json()
      return Array.isArray(json) ? (json as Sender[]) : []
    },
  })
}

export function useUnsubscribe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (senders: Sender[]) => {
      const links = senders.flatMap((sender) => sender.unsubscribeLinks)
      if (links.length === 0) {
        throw new ApiError("No unsubscribe link available for these senders.")
      }
      const res = await fetch(`${apiBaseUrl}/gmail/messages/unsubscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...appAuthHeader() },
        body: JSON.stringify(links),
      })
      if (!res.ok) {
        throw new ApiError(res.statusText || `HTTP ${res.status}`, res.status)
      }
      return senders
    },
    onMutate: async (senders) => {
      await queryClient.cancelQueries({ queryKey: sendersKey })
      const previous = queryClient.getQueryData<Sender[]>(sendersKey)
      const emails = new Set(senders.map((sender) => sender.email))
      queryClient.setQueryData<Sender[]>(sendersKey, (old) =>
        old ? old.filter((sender) => !emails.has(sender.email)) : old,
      )
      return { previous }
    },
    onError: (_error, _senders, context) => {
      if (context?.previous) {
        queryClient.setQueryData(sendersKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: sendersKey })
    },
  })
}
