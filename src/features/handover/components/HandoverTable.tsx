import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table"
import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { DataTable } from "@/shared/components/ui/data-table"
import type { HandoverListItem } from "../types"
import { formatDateTime, typeLabel } from "../utils"
import { HandoverActionMenu } from "./HandoverActionMenu"
import { StatusBadge } from "./StatusBadge"

interface Props {
  items: HandoverListItem[]
  isLoading: boolean
  hasFilters: boolean
  hrefFor: (item: HandoverListItem) => string
  filters: ReactNode
  /** Rendered in the empty state (e.g. a "create" button). */
  emptyAction?: ReactNode
}

const dim = (item: HandoverListItem) => item.status === "CANCELLED"
const dash = <span className="text-gray-400">—</span>

/**
 * Same table at every width: on narrow screens it scrolls sideways instead of turning into cards. Sorting, paging and search run on the loaded
 * records: one transport has a handful of handover points, so HO1 returns them all in one page.
 */
export function HandoverTable({ items, isLoading, hasFilters, hrefFor, filters, emptyAction }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "sequenceNo", desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const columns = useMemo<ColumnDef<HandoverListItem>[]>(
    () => [
      {
        accessorKey: "handoverCode",
        header: "Handover code",
        enableSorting: false,
        cell: ({ row }) => (
          <Link to={hrefFor(row.original)} className={cn("font-semibold whitespace-nowrap underline-offset-2 hover:underline", dim(row.original) ? "text-gray-400" : "text-slate-900")}>
            {row.original.handoverCode}
          </Link>
        ),
      },
      { accessorKey: "sequenceNo", header: "SEQ", cell: ({ row }) => <span className="text-gray-500 tabular-nums">{row.original.sequenceNo}</span> },
      { accessorKey: "handoverType", header: "Type", enableSorting: false, cell: ({ row }) => <span className={cn("font-semibold uppercase", dim(row.original) && "text-gray-400")}>{typeLabel(row.original.handoverType)}</span> },
      { accessorKey: "fromPartyName", header: "From party", enableSorting: false, cell: ({ row }) => <span className={cn("block min-w-28 whitespace-normal", dim(row.original) && "text-gray-400")}>{row.original.fromPartyName || dash}</span> },
      { accessorKey: "toPartyName", header: "To party", enableSorting: false, cell: ({ row }) => <span className={cn("block min-w-28 whitespace-normal", dim(row.original) && "text-gray-400")}>{row.original.toPartyName || dash}</span> },
      { accessorKey: "locationName", header: "Location", enableSorting: false, cell: ({ row }) => <span className={cn("block min-w-28 whitespace-normal", dim(row.original) && "text-gray-400")}>{row.original.locationName || dash}</span> },
      { accessorKey: "plannedHandoverAt", header: "PLANNED AT", cell: ({ row }) => <span className="whitespace-nowrap text-gray-500 tabular-nums">{formatDateTime(row.original.plannedHandoverAt)}</span> },
      { accessorKey: "actualHandoverAt", header: "HANDOVER TIME", cell: ({ row }) => <span className={cn("whitespace-nowrap tabular-nums", dim(row.original) && "text-gray-400")}>{row.original.actualHandoverAt ? formatDateTime(row.original.actualHandoverAt) : dash}</span> },
      { accessorKey: "status", header: "Status", enableSorting: false, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => <HandoverActionMenu code={row.original.handoverCode} href={hrefFor(row.original)} />,
      },
    ],
    [hrefFor],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.handoverRecordId,
    enableSortingRemoval: false,
    autoResetPageIndex: true,
  })

  const total = items.length
  const meta = {
    totalItems: total,
    totalPages: Math.max(1, table.getPageCount()),
    itemsPerPage: pagination.pageSize,
    currentPage: pagination.pageIndex + 1,
    hasPreviousPage: table.getCanPreviousPage(),
    hasNextPage: table.getCanNextPage(),
  }
  const empty = (
    <div className="space-y-3 text-center">
      <EmptyState message={hasFilters ? "No handover records match your filters." : "There are no handover records for this transport yet."} />
      {!hasFilters && emptyAction ? <div className="flex justify-center">{emptyAction}</div> : null}
    </div>
  )

  return (
    <div className="space-y-2.5">
      <div role="group" aria-label="Handover toolbar" className="min-w-0">{filters}</div>

      <div className="min-w-0">
        <DataTable
          table={table}
          isLoading={isLoading}
          aria-busy={isLoading}
          containerClassName="booking-panel overflow-x-auto"
          headerClassName="bg-[#e9e6de]"
          tableClassName="min-w-250 [&_[data-column-id=sequenceNo]]:text-center"
          headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          rowClassName="border-slate-200 transition-colors duration-200 hover:bg-primary/5 motion-reduce:transition-none"
          cellClassName="h-11 px-2.5 py-1.5 text-xs"
          emptyMessage={empty}
        />
      </div>

      {total > 0 ? (
        <TablePagination
          meta={meta}
          onPageChange={(page) => table.setPageIndex(page - 1)}
          onPageSizeChange={(pageSize) => table.setPageSize(pageSize)}
          pageSizeAriaLabel="Handover records per page"
        />
      ) : null}
    </div>
  )
}
