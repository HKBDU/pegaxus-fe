import { useMemo, type ReactNode } from "react"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Eye, MoreVertical, Play } from "lucide-react"

import { PriceListFilters } from "@/features/price-list/components/PriceListFilters"
import { PriceListStatusBadge } from "@/features/price-list/components/PriceListStatusBadge"
import type { PriceListSortBy, PriceListSummary } from "@/features/price-list/list.schemas"
import { DateTimeUtc } from "@/shared/components/DateTimeUtc"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import type { PaginationMeta } from "@/shared/types"

interface PriceListTableProps {
  items: PriceListSummary[]
  meta: PaginationMeta
  isLoading: boolean
  /** True while a search or status filter is on, so an empty page can say "no match" instead of "none yet". */
  isFiltered: boolean
  search: string
  isActive?: boolean
  sortBy: PriceListSortBy
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSortChange: (value: PriceListSortBy) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onCreate?: () => void
  onView: (item: PriceListSummary) => void
  /** The Clone item of a row's menu. It owns its request, so the table only gives it a place. */
  renderClone?: (item: PriceListSummary) => ReactNode
  onActivate?: (item: PriceListSummary) => void
}

interface PriceListRowActionsProps {
  item: PriceListSummary
  onView: (item: PriceListSummary) => void
  renderClone?: (item: PriceListSummary) => ReactNode
  onActivate?: (item: PriceListSummary) => void
}

/** The three-dot menu of a row, same look as the transport request row menu. */
function PriceListRowActions({ item, onView, renderClone, onActivate }: PriceListRowActionsProps) {
  const itemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${item.name}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-44 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className={itemClass} onSelect={() => onView(item)}>
          <Eye className="size-3.5 text-slate-600" />
          View details
        </DropdownMenuItem>
        {renderClone?.(item)}
        {!item.isActive && onActivate ? (
          // An empty list cannot be activated, so say what is missing instead of only greying the item out.
          <DropdownMenuItem className={itemClass} disabled={item.itemCount === 0} onSelect={() => onActivate(item)}>
            <Play className="size-3.5 text-emerald-600" />
            {item.itemCount === 0 ? "Add lines to activate" : "Activate"}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The price lists, built like the transport request table: shared DataTable, a toolbar above and the shared pagination below.
 * Sorting and paging are done by the server (the sort filter and the pagination), so the column headers do not sort.
 */
export function PriceListTable({
  items,
  meta,
  isLoading,
  isFiltered,
  search,
  isActive,
  sortBy,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onView,
  renderClone,
  onActivate,
}: PriceListTableProps) {
  const columns = useMemo<ColumnDef<PriceListSummary>[]>(
    () => [
      {
        accessorKey: "name",
        enableHiding: false,
        enableSorting: false,
        header: "NAME",
        cell: ({ row }) => <span className="block min-w-40 font-semibold text-slate-900">{row.original.name}</span>,
      },
      { accessorKey: "currency", enableSorting: false, header: "CURRENCY", cell: ({ row }) => <span className="text-slate-700">{row.original.currency}</span> },
      {
        accessorKey: "taxRate",
        enableSorting: false,
        header: "VAT",
        meta: { align: "right" },
        cell: ({ row }) => <span className="block tabular-nums text-slate-900">{row.original.taxRate}%</span>,
      },
      {
        accessorKey: "depositRate",
        enableSorting: false,
        header: "DEPOSIT",
        meta: { align: "right" },
        cell: ({ row }) => <span className="block tabular-nums text-slate-900">{row.original.depositRate}%</span>,
      },
      {
        accessorKey: "itemCount",
        enableSorting: false,
        header: "ITEMS",
        meta: { align: "right" },
        cell: ({ row }) => <span className="block tabular-nums text-slate-900">{row.original.itemCount}</span>,
      },
      {
        accessorKey: "isActive",
        enableSorting: false,
        header: "STATUS",
        cell: ({ row }) => <PriceListStatusBadge isActive={row.original.isActive} />,
      },
      {
        accessorKey: "createdAt",
        enableSorting: false,
        header: "CREATED (UTC)",
        cell: ({ row }) => <DateTimeUtc value={row.original.createdAt} compact />,
      },
      {
        accessorKey: "updatedAt",
        enableSorting: false,
        header: "UPDATED (UTC)",
        cell: ({ row }) => <DateTimeUtc value={row.original.updatedAt} compact />,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: "ACTIONS",
        cell: ({ row }) => (
          // The row opens the detail page on click, so the menu must not bubble.
          <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
            <PriceListRowActions item={row.original} onView={onView} renderClone={renderClone} onActivate={onActivate} />
          </div>
        ),
      },
    ],
    [onView, renderClone, onActivate],
  )

  const table = useReactTable({
    data: items,
    columns,
    getRowId: (row) => row.priceListId,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="booking-page-enter [animation-delay:100ms]" aria-busy={isLoading}>
      <DataTable
        table={table}
        isLoading={isLoading}
        className="gap-2.5"
        containerClassName="booking-panel overflow-x-auto"
        headerClassName="bg-[#e9e6de]"
        headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
        rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
        cellClassName="h-11 px-2.5 py-1.5 text-xs"
        emptyMessage={isFiltered ? "No price lists match the current filters." : "No price lists found."}
        onRowClick={(row) => onView(row.original)}
        footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} pageSizeAriaLabel="Price lists per page" />}
      >
        <PriceListFilters
          search={search}
          isActive={isActive}
          sortBy={sortBy}
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
          onSortChange={onSortChange}
          onCreate={onCreate}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </DataTable>
    </div>
  )
}
