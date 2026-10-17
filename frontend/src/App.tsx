import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { Suspense, lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { PageSkeleton } from "@/components/PageSkeleton"
import { QueryErrorListener } from "@/components/QueryErrorListener"
import { AppShell } from "@/components/layout/AppShell"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"

const AuthPage = lazy(() =>
  import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage })),
)

const ErrorPage = lazy(() =>
  import("@/pages/ErrorPage").then((m) => ({ default: m.ErrorPage })),
)

const ProfilePage = lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
)

const MessagesPage = lazy(() =>
  import("@/pages/MessagesPage").then((m) => ({ default: m.MessagesPage })),
)

const SendersPage = lazy(() =>
  import("@/pages/SendersPage").then((m) => ({ default: m.SendersPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <QueryErrorListener />
          <Routes>
            <Route path="/" element={<Navigate to="/messages" replace />} />
            <Route
              path="/auth"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <AuthPage />
                </Suspense>
              }
            />
            <Route element={<AppShell />}>
              <Route
                path="/messages"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <MessagesPage />
                  </Suspense>
                }
              />
              <Route
                path="/senders"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <SendersPage />
                  </Suspense>
                }
              />
              <Route
                path="/profile"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
            </Route>
            <Route
              path="*"
              element={
                <Suspense fallback={<PageSkeleton />}>
                  <ErrorPage
                    code="404"
                    title="Page not found"
                    message="That route does not exist in Tidy Gmail."
                    showRetry={false}
                  />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export { App }
