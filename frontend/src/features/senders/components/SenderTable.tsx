import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ExternalLink, RefreshCw, ShieldOff } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "cn"
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { errorMessage } from "@/lib/api-error"
import { type Sender, useSenders, useUnsubscribe } from "../queries"

/**
 * @tanstack/react-table v8 (shadcn-admin pattern). Client-side pagination stands
 * in until `/gmail/senders` paginates — the sender list must be virtualized once
 * it can exceed ~100 rows (TanStack Virtual).
 */

function displayName(sender: Sender): string {
  return sender.name && sender.name.trim().length > 0
    ? sender.name
    : sender.email
}

function SenderTable() {
  const { data, isPending, isError, error, isFetching, refetch } = useSenders()
  const unsubscribe = useUnsubscribe()
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([
    { id: "count", desc: true },
  ])
  const [columnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState("")
  const [pending, setPending] = useState<Sender[] | null>(null)

  const senders = data ?? []

  const columns: ColumnDef<Sender>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={
            table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-0.5"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.email}`}
          className="translate-y-0.5"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "sender",
      accessorFn: (row) => displayName(row),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sender" />
      ),
      cell: ({ row }) => (
        <div className="flex max-w-[16rem] flex-col">
          <span className="truncate font-medium">{displayName(row.original)}</span>
          <span className="truncate text-xs text-muted-foreground">
            {row.original.email}
          </span>
        </div>
      ),
    },
    {
      id: "count",
      accessorFn: (row) => row.count,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Messages" />
      ),
      cell: ({ getValue }) => (
        <span className="tabular-nums">{Number(getValue())}</span>
      ),
    },
    {
      id: "method",
      accessorFn: (row) =>
        row.oneClick
          ? "automatic"
          : row.unsubscribeLinks.length > 0
            ? "link"
            : "manual",
      header: "Method",
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      cell: ({ row }) => {
        const { oneClick, unsubscribeLinks } = row.original
        if (oneClick) {
          return (
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-100/30 text-emerald-900 dark:text-emerald-200"
            >
              Automatic
            </Badge>
          )
        }
        if (unsubscribeLinks.length > 0) {
          return (
            <Badge
              variant="outline"
              className="border-sky-300 bg-sky-100/30 text-sky-900 dark:text-sky-200"
            >
              Opens link
            </Badge>
          )
        }
        return (
          <Badge
            variant="outline"
            className="border-neutral-300 bg-neutral-300/40"
          >
            Manual only
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      cell: ({ row }) => {
        const sender = row.original
        const link = sender.unsubscribeLinks[0]
        return (
          <div className="flex justify-end">
            {sender.oneClick ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={unsubscribe.isPending}
                onClick={() => setPending([sender])}
              >
                <ShieldOff aria-hidden="true" />
                Unsubscribe
              </Button>
            ) : link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8",
                )}
              >
                <ExternalLink aria-hidden="true" />
                Open link
              </a>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled
              >
                <ShieldOff aria-hidden="true" />
                Unsubscribe
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: senders,
    columns,
    state: { sorting, columnVisibility, rowSelection, globalFilter },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getRowId: (row) => row.email,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const selectedSenders = table
    .getSelectedRowModel()
    .rows.map((row) => row.original)
    .filter((sender) => sender.oneClick)

  const confirmUnsubscribe = () => {
    if (!pending || pending.length === 0) return
    const targets = pending
    unsubscribe.mutate(targets, {
      onSuccess: () => {
        toast.success(
          `Unsubscribed from ${targets.length} sender${targets.length > 1 ? "s" : ""}`,
        )
        setRowSelection({})
      },
      onError: (err) =>
        toast.error("Unsubscribe failed", { description: errorMessage(err) }),
    })
    setPending(null)
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <Skeleton className="h-8 w-full max-w-xs" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (isError && senders.length === 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchPlaceholder="Filter senders…"
        actions={
          <>
            {selectedSenders.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8"
                disabled={unsubscribe.isPending}
                onClick={() => setPending(selectedSenders)}
              >
                <ShieldOff aria-hidden="true" />
                Unsubscribe ({selectedSenders.length})
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              aria-label="Refresh senders"
              disabled={isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw
                className={cn(isFetching && "motion-safe:animate-spin")}
                aria-hidden="true"
              />
              Refresh
            </Button>
          </>
        }
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  {senders.length === 0
                    ? "No senders yet. Scan your inbox to populate this list."
                    : "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className="mt-auto" />

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Unsubscribe from {pending?.length ?? 0}{" "}
              {pending?.length === 1 ? "sender" : "senders"}?
            </DialogTitle>
            <DialogDescription>
              Sends an unsubscribe request to each sender using their
              List-Unsubscribe link. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmUnsubscribe}>
              Unsubscribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { SenderTable }
