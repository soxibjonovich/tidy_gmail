import { useEffect, useState } from "react"
import { Inbox, ListChecks, LockKeyhole, ShieldCheck } from "lucide-react"
import { Navigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GoogleCallback } from "@/features/auth/components/GoogleCallback"
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton"
import {
  type AuthUser,
  clearSession,
  getSession,
  isApiConfigured,
} from "@/features/auth/queries"

const benefits = [
  { icon: ListChecks, label: "Bulk-unsubscribe from any sender" },
  { icon: ShieldCheck, label: "Read-only Gmail access" },
  { icon: LockKeyhole, label: "Sign in with Google, no passwords stored" },
]

function AuthPage() {
  const [code, setCode] = useState(() =>
    new URLSearchParams(window.location.search).get("code"),
  )
  const [session, setSessionState] = useState<AuthUser | null>(() => getSession())

  // Strip the OAuth code from the URL so a refresh cannot replay it.
  useEffect(() => {
    if (code) {
      window.history.replaceState(window.history.state, "", window.location.pathname)
    }
  }, [code])

  const handleSignOut = () => {
    clearSession()
    setSessionState(null)
  }

  // Session first: once stored, bail out to the app even if the OAuth code is
  // still in state (the GoogleCallback exchange has already finished).
  if (session) {
    return <Navigate to="/messages" replace />
  }

  if (code) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-4">
        <GoogleCallback
          code={code}
          onSignedIn={setSessionState}
          onSignOut={handleSignOut}
          onReset={() => setCode(null)}
        />
      </main>
    )
  }

  if (!isApiConfigured()) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <CardTitle>Cannot sign in</CardTitle>
            <CardDescription>
              VITE_API_URL is not set. Add it to .env and restart the dev server.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Inbox className="size-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-lg">Tidy Gmail</CardTitle>
          <CardDescription>
            Unsubscribe from mailing lists in one pass.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleSignInButton />
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {benefits.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  )
}

export { AuthPage }
