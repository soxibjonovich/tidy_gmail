import { SenderTable } from "@/features/senders/components/SenderTable"

function SendersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Senders</h1>
        <p className="text-sm text-muted-foreground">
          Bulk-unsubscribe from senders cluttering your inbox.
        </p>
      </div>
      <SenderTable />
    </div>
  )
}

export { SendersPage }
