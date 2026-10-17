import { MessageTable } from "@/features/messages/components/MessageTable"

function MessagesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Latest Gmail messages from your inbox.
        </p>
      </div>
      <MessageTable />
    </div>
  )
}

export { MessagesPage }
