import { Navigate, useNavigate } from "react-router-dom"
import { SignedInPanel } from "@/features/auth/components/SignedInPanel"
import { clearSession, getSession } from "@/features/auth/queries"

function ProfilePage() {
  const navigate = useNavigate()
  const user = getSession()

  if (!user) return <Navigate to="/auth" replace />

  const handleSignOut = () => {
    clearSession()
    navigate("/auth", { replace: true })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Session and Google account details.
        </p>
      </div>
      <SignedInPanel user={user} onSignOut={handleSignOut} />
    </div>
  )
}

export { ProfilePage }
