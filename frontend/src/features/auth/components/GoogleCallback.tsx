import { useEffect } from "react"
import { CircleXIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignedInPanel } from "./SignedInPanel"
import {
  type AuthUser,
  parseCallbackResponse,
  setAccessToken,
  setSession,
  useGoogleCallback,
} from "../queries"

type GoogleCallbackProps = {
  code: string
  onSignedIn: (user: AuthUser) => void
  onSignOut: () => void
  onReset: () => void
}

function GoogleCallback({
  code,
  onSignedIn,
  onSignOut,
  onReset,
}: GoogleCallbackProps) {
  const { mutate, isPending, data, error } = useGoogleCallback()

  const { user, accessToken } = parseCallbackResponse(data)

  useEffect(() => {
    mutate(code)
  }, [code, mutate])

  useEffect(() => {
    if (error) {
      toast.error("Sign-in failed", {
        description: String(error.message ?? error),
      })
    }
  }, [error])

  // callback messages = ids-only list; table fetches enriched rows itself.
  useEffect(() => {
    if (accessToken) setAccessToken(accessToken)
    if (user) {
      setSession(user)
      onSignedIn(user)
    }
  }, [accessToken, user, onSignedIn])

  if (isPending) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center justify-items-center text-center">
          <Loader2Icon className="size-5 motion-safe:animate-spin" aria-hidden="true" />
          <CardTitle>Completing sign-in…</CardTitle>
          <CardDescription>Exchanging Google code with the backend.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center justify-items-center text-center">
          <CircleXIcon className="size-5 text-destructive" aria-hidden="true" />
          <CardTitle>Sign-in failed</CardTitle>
          <CardDescription>
            {String(error.message ?? "Check the backend response below.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(error, null, 2)}
          </pre>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onReset}
          >
            Back to sign in
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (user) {
    return <SignedInPanel user={user} onSignOut={onSignOut} />
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center justify-items-center text-center">
        <CardTitle>Backend responded</CardTitle>
        <CardDescription>
          No user in response yet. Raw response from POST /auth/google/callback.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onReset}
        >
          Back to sign in
        </Button>
      </CardContent>
    </Card>
  )
}

export { GoogleCallback }
