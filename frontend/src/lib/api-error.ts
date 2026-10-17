/**
 * Frontend-side API error so views can branch on HTTP status. Thrown by the
 * feature query modules; consumed globally by QueryErrorListener (401) and
 * per-view for 500 / network failures.
 */
export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

/** User-facing text. 500 = backend exception; null status = fetch never landed. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Session expired. Sign in again."
    if (error.status === 500) {
      return "Server error (500). The backend hit an unhandled exception — check its logs."
    }
    if (error.status === null) {
      return `${error.message} — backend unreachable (or CORS headers missing on the error response).`
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return "Unexpected error."
}
