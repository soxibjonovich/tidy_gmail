import { Skeleton } from "@/components/ui/skeleton"

function PageSkeleton() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="mx-auto h-5 w-32" />
        <Skeleton className="mx-auto h-4 w-48" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  )
}

export { PageSkeleton }
