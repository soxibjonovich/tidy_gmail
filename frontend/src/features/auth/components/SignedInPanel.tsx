import { LogOut, Mail } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { type AuthUser, getAccessToken } from "../queries"

type SignedInPanelProps = {
  user: AuthUser
  onSignOut: () => void
}

function tokenSummary(): string {
  const token = getAccessToken()
  if (!token) return "not stored"
  return `••••${token.slice(-4)}`
}

function tokenExpiry(user: AuthUser): string {
  const exp = user.exp
  if (typeof exp === "number" && Number.isFinite(exp)) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(exp * 1000))
  }
  return "—"
}

function SignedInPanel({ user, onSignOut }: SignedInPanelProps) {
  const navigate = useNavigate()
  const picture = typeof user.picture === "string" ? user.picture : undefined
  const fields = Object.entries(user).filter(([key]) => key !== "picture")

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="items-center justify-items-center text-center">
        {picture ? (
          <img
            src={picture}
            alt={user.name}
            className="size-16 rounded-full object-cover ring-1 ring-foreground/10"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-medium"
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <CardTitle className="text-lg">{user.name}</CardTitle>
        <CardDescription>Signed in with Google.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-1 gap-1.5 text-left text-xs sm:grid-cols-2">
          {fields.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="shrink-0 text-muted-foreground">{key}</dt>
              <dd className="truncate text-foreground">
                {typeof value === "object" && value !== null
                  ? JSON.stringify(value)
                  : String(value)}
              </dd>
            </div>
          ))}
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">access_token</dt>
            <dd className="truncate text-foreground">{tokenSummary()}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0 text-muted-foreground">token_expires</dt>
            <dd className="truncate text-foreground">{tokenExpiry(user)}</dd>
          </div>
        </dl>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onSignOut}>
            <LogOut />
            Sign out
          </Button>
          <Button type="button" onClick={() => navigate("/messages")}>
            <Mail />
            Open messages
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { SignedInPanel }
