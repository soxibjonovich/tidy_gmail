import { Inbox, LogOut, Mail, User, Users } from "lucide-react"
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { clearSession, getSession } from "@/features/auth/queries"

const navItems = [
  { to: "/messages", label: "Messages", icon: Mail },
  { to: "/senders", label: "Senders", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
] as const

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
  )

function BrandIcon() {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      aria-hidden="true"
    >
      <Inbox className="size-4" />
    </span>
  )
}

function AppShell() {
  const navigate = useNavigate()
  const user = getSession()

  if (!user) return <Navigate to="/auth" replace />

  const picture = typeof user.picture === "string" ? user.picture : null

  const handleSignOut = () => {
    clearSession()
    navigate("/auth", { replace: true })
  }

  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[15rem_1fr]">
      <aside className="hidden flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <BrandIcon />
          <span className="text-sm font-semibold">Tidy Gmail</span>
        </div>
        <nav className="flex flex-col gap-1 p-2" aria-label="Main">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 border-t border-border p-3">
          {picture ? (
            <img
              src={picture}
              alt=""
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium"
              aria-hidden="true"
            >
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-xs">{user.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            onClick={handleSignOut}
          >
            <LogOut />
          </Button>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="flex items-center gap-1 border-b border-border px-3 py-2 md:hidden">
          <BrandIcon />
          <nav className="flex items-center gap-1" aria-label="Main">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            className="ml-auto"
            onClick={handleSignOut}
          >
            <LogOut />
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export { AppShell }
