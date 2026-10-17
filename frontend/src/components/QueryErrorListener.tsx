import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { clearSession } from "@/features/auth/queries"
import { isUnauthorized } from "@/lib/api-error"

/**
 * Global 401 handler (AGENTS: redirect to login). Lives inside the router so it
 * can navigate; watches every query/mutation error, clears stored auth, and
 * bounces to /auth once. Renders nothing.
 */
function QueryErrorListener() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    const handle = (error: unknown) => {
      if (!isUnauthorized(error)) return
      clearSession()
      toast.error("Session expired", {
        id: "session-expired",
        description: "Sign in again to continue.",
      })
      if (window.location.pathname !== "/auth") {
        navigate("/auth", { replace: true })
      }
    }

    const unsubscribeQuery = queryClient.getQueryCache().subscribe((event) => {
      if ("query" in event && event.query.state.status === "error") {
        handle(event.query.state.error)
      }
    })
    const unsubscribeMutation = queryClient
      .getMutationCache()
      .subscribe((event) => {
        if (event.mutation?.state.status === "error") {
          handle(event.mutation.state.error)
        }
      })

    return () => {
      unsubscribeQuery()
      unsubscribeMutation()
    }
  }, [queryClient, navigate])

  return null
}

export { QueryErrorListener }
