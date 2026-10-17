import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ErrorPageProps = {
  code: string
  title: string
  message: string
  showRetry?: boolean
}

function ErrorPage({ code, title, message, showRetry = true }: ErrorPageProps) {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center justify-items-center text-center">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {code}
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {showRetry && (
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          )}
          <Button type="button" onClick={() => navigate("/messages")}>
            Go to messages
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

export { ErrorPage }
