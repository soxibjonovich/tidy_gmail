import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Ban,
  Bell,
  Bookmark,
  FileText,
  Inbox,
  Mail,
  MessagesSquare,
  RefreshCw,
  Send,
  Star,
  Tag,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { cn } from "cn"
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { type GmailMessage, useGmailMessages } from "../queries"

/**
 * @tanstack/react-table v8 (shadcn-admin pattern). Backend caps at 10 rows
 * (maxResults=10, no pagination) so client-side pagination stands in until the
 * backend pages larger result sets.
 */

function headerValue(message: Record<string, unknown>, name: string): string {
  const payload = message.payload
  if (typeof payload !== "object" || payload === null) return "—"
  const headers = (payload as { headers?: unknown }).headers
  if (!Array.isArray(headers)) return "—"
  for (const header of headers) {
    if (typeof header !== "object" || header === null) continue
    const { name: key, value } = header as { name?: unknown; value?: unknown }
    if (key === name && typeof value === "string" && value.length > 0) {
      return value
    }
  }
  return "—"
}

function messageDate(message: Record<string, unknown>): string {
  const internalDate = message.internalDate
  if (typeof internalDate === "string" && /^\d+$/.test(internalDate)) {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(Number(internalDate)))
  }
  return headerValue(message, "Date")
}

function internalDateMs(message: GmailMessage): number {
  const raw = message.internalDate
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw)
  return 0
}

function snippetValue(message: GmailMessage): string {
  return typeof message.snippet === "string" && message.snippet.length > 0
    ? message.snippet
    : "—"
}

function labelList(message: GmailMessage): string[] {
  const labels = message.labelIds
  if (!Array.isArray(labels)) return []
  return labels.filter((label): label is string => typeof label === "string")
}

function isUnread(message: GmailMessage): boolean {
  return labelList(message).includes("UNREAD")
}

/** Gmail label → display text + icon + outline-badge color (shadcn-admin roles pattern). */
const labelMeta: Record<
  string,
  { label: string; icon: LucideIcon; className: string }
> = {
  INBOX: {
    label: "Inbox",
    icon: Inbox,
    className: "bg-teal-100/30 text-teal-900 border-teal-200 dark:text-teal-200",
  },
  UNREAD: {
    label: "Unread",
    icon: Mail,
    className: "bg-sky-200/40 text-sky-900 border-sky-300 dark:text-sky-100",
  },
  STARRED: {
    label: "Starred",
    icon: Star,
    className:
      "bg-amber-200/40 text-amber-900 border-amber-300 dark:text-amber-100",
  },
  IMPORTANT: {
    label: "Important",
    icon: Bookmark,
    className:
      "bg-orange-200/40 text-orange-900 border-orange-300 dark:text-orange-100",
  },
  SENT: {
    label: "Sent",
    icon: Send,
    className:
      "bg-emerald-100/30 text-emerald-900 border-emerald-200 dark:text-emerald-200",
  },
  DRAFT: {
    label: "Draft",
    icon: FileText,
    className: "bg-neutral-300/40 border-neutral-300",
  },
  SPAM: {
    label: "Spam",
    icon: Ban,
    className:
      "bg-destructive/10 text-destructive border-destructive/10 dark:bg-destructive/50 dark:text-primary",
  },
  TRASH: {
    label: "Trash",
    icon: Trash2,
    className:
      "bg-destructive/10 text-destructive border-destructive/10 dark:bg-destructive/50 dark:text-primary",
  },
  CATEGORY_PERSONAL: {
    label: "Personal",
    icon: User,
    className: "bg-violet-200/40 text-violet-900 border-violet-300 dark:text-violet-100",
  },
  CATEGORY_SOCIAL: {
    label: "Social",
    icon: Users,
    className: "bg-fuchsia-200/40 text-fuchsia-900 border-fuchsia-300 dark:text-fuchsia-100",
  },
  CATEGORY_PROMOTIONS: {
    label: "Promotions",
    icon: Tag,
    className: "bg-cyan-200/40 text-cyan-900 border-cyan-300 dark:text-cyan-100",
  },
  CATEGORY_UPDATES: {
    label: "Updates",
    icon: Bell,
    className: "bg-lime-200/40 text-lime-900 border-lime-300 dark:text-lime-100",
  },
  CATEGORY_FORUMS: {
    label: "Forums",
    icon: MessagesSquare,
    className: "bg-sky-200/40 text-sky-900 border-sky-300 dark:text-sky-100",
  },
}

const fallbackPalette = [
  "bg-sky-200/40 text-sky-900 border-sky-300 dark:text-sky-100",
  "bg-violet-200/40 text-violet-900 border-violet-300 dark:text-violet-100",
  "bg-emerald-100/30 text-emerald-900 border-emerald-200 dark:text-emerald-200",
  "bg-fuchsia-200/40 text-fuchsia-900 border-fuchsia-300 dark:text-fuchsia-100",
  "bg-cyan-200/40 text-cyan-900 border-cyan-300 dark:text-cyan-100",
  "bg-lime-200/40 text-lime-900 border-lime-300 dark:text-lime-100",
]

function labelText(label: string): string {
  const core = label.startsWith("CATEGORY_")
    ? label.slice("CATEGORY_".length)
    : label
  const lower = core.toLowerCase().replace(/_/g, " ")
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function fallbackLabelColor(label: string): string {
  let hash = 0
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) | 0
  }
  return fallbackPalette[Math.abs(hash) % fallbackPalette.length]
}

const MAX_VISIBLE_LABELS = 3

function LabelBadges({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  const visible = labels.slice(0, MAX_VISIBLE_LABELS)
  const hidden = labels.length - visible.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((label) => {
        const meta = labelMeta[label]
        const Icon = meta?.icon
        return (
          <Badge
            key={label}
            variant="outline"
            className={cn(meta?.className ?? fallbackLabelColor(label))}
          >
            {Icon ? <Icon /> : null}
            {meta?.label ?? labelText(label)}
          </Badge>
        )
      })}
      {hidden > 0 && (
        <span className="text-xs text-muted-foreground">+{hidden}</span>
      )}
    </div>
  )
}

/** Compact widths + responsive column hiding (keeps table usable on phones). */
const columnClass: Record<string, { cell: string; head: string }> = {
  from: { cell: "max-w-[10rem] truncate ps-3", head: "" },
  subject: {
    cell: "max-w-[14rem] truncate sm:max-w-[18rem] lg:max-w-[28rem]",
    head: "",
  },
  date: { cell: "max-w-[7rem] truncate", head: "" },
  snippet: {
    cell: "hidden max-w-[22rem] truncate sm:table-cell",
    head: "hidden sm:table-cell",
  },
  labels: { cell: "hidden md:table-cell", head: "hidden md:table-cell" },
}

const columns: ColumnDef<GmailMessage>[] = [
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
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "from",
    accessorFn: (row) => headerValue(row, "From"),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="From" />
    ),
    cell: ({ getValue }) => String(getValue()),
  },
  {
    id: "subject",
    accessorFn: (row) => headerValue(row, "Subject"),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subject" />
    ),
    cell: ({ row, getValue }) => (
      <span className={cn(isUnread(row.original) && "font-semibold")}>
        {String(getValue())}
      </span>
    ),
  },
  {
    id: "date",
    accessorFn: (row) => internalDateMs(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    enableGlobalFilter: false,
    cell: ({ row }) => messageDate(row.original),
  },
  {
    id: "snippet",
    accessorFn: (row) => snippetValue(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Snippet" />
    ),
    cell: ({ getValue }) => String(getValue()),
  },
  {
    id: "labels",
    accessorFn: (row) => labelList(row),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Labels" />
    ),
    enableGlobalFilter: false,
    enableSorting: false,
    filterFn: (row, id, value: string[]) => {
      const labels = row.getValue(id) as string[]
      return value.some((label) => labels.includes(label))
    },
    cell: ({ row }) => <LabelBadges labels={labelList(row.original)} />,
  },
]

function labelFilterOptions(
  messages: GmailMessage[],
): { label: string; value: string; icon?: LucideIcon }[] {
  const seen = new Set<string>()
  for (const message of messages) {
    for (const label of labelList(message)) seen.add(label)
  }
  return Array.from(seen)
    .sort()
    .map((value) => ({
      value,
      label: labelMeta[value]?.label ?? labelText(value),
      icon: labelMeta[value]?.icon,
    }))
}

function MessageTable() {
  const { data, isPending, isError, error, isFetching, refetch } =
    useGmailMessages(true)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    id: false,
  })
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [globalFilter, setGlobalFilter] = useState("")

  const messages = data ?? []

  const table = useReactTable({
    data: messages,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      rowSelection,
      pagination,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

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

  if (isError && messages.length === 0) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 p-6 text-center"
      >
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchPlaceholder="Filter messages…"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            aria-label="Refresh messages"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw
              className={cn(isFetching && "motion-safe:animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
        filters={[
          {
            columnId: "labels",
            title: "Labels",
            options: labelFilterOptions(messages),
          },
        ]}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      "bg-background group-hover/row:bg-muted",
                      columnClass[header.column.id]?.head,
                    )}
                  >
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
                  className="group/row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "bg-background group-hover/row:bg-muted",
                        columnClass[cell.column.id]?.cell,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className="mt-auto" />
    </div>
  )
}

export { MessageTable }
