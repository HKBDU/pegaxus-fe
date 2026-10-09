import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Eye } from "lucide-react"
import { createTable, getCoreRowModel, type ColumnDef, type SortingState, type VisibilityState } from "@tanstack/react-table"
import { transportPlanDetail } from "@/app/route-config"
import type { PaginationMeta } from "@/shared/types"
import { EmptyState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { formatPlanDate } from "../format"
import { hasTransportPlanFilters } from "../transport-plan.constants"
import { transportPlanSortSchema } from "../transport-plan.schemas"
import type { TransportPlanListItem, TransportPlansQueryParams } from "../transport-plan.types"
import { TransportPlanStatusBadge } from "./TransportPlanStatusBadge"

export function TransportPlansTable({ plans, params, meta, isLoading, onChange, onPageChange, filters }: {
  plans: TransportPlanListItem[]; params: TransportPlansQueryParams; meta: PaginationMeta; isLoading: boolean
  filters?: ReactNode
  onChange: (patch: Partial<Omit<TransportPlansQueryParams, "pageIndex">>) => void
  onPageChange: (page: number) => void
}) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ plannedEndAt: false })
  const columns = useMemo<ColumnDef<TransportPlanListItem>[]>(() => [
    { accessorKey: "planCode", header: "Plan", enableHiding: false, cell: ({ row }) => <Link to={transportPlanDetail(row.original.transportPlanId)} className="font-semibold text-primary underline-offset-2 hover:underline">{row.original.planCode}</Link> },
    { accessorKey: "bookingCode", header: "Booking" },
    { accessorKey: "customerName", header: "Customer", cell: ({ row }) => <span className="block min-w-32 max-w-48 whitespace-normal">{row.original.customerName}</span> },
    { accessorKey: "plannedStartAt", header: "Planned start", enableSorting: true, cell: ({ row }) => formatPlanDate(row.original.plannedStartAt) },
    { accessorKey: "plannedEndAt", header: "Planned end", cell: ({ row }) => formatPlanDate(row.original.plannedEndAt) },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <TransportPlanStatusBadge status={row.original.status} /> },
    { id: "actions", header: "Actions", enableHiding: false, cell: ({ row }) => <Button asChild variant="ghost" size="icon" className="size-7 rounded-[2px]"><Link to={transportPlanDetail(row.original.transportPlanId)} aria-label={`View ${row.original.planCode}`}><Eye className="size-3.5" /></Link></Button> },
  ], [])
  const [sortId, direction] = params.sortBy.split(":")
  const sorting: SortingState = [{ id: sortId, desc: direction === "desc" }]
  // A fully controlled instance: React owns visibility and the server owns sorting/pagination.
  const table = createTable<TransportPlanListItem>({
    data: plans, columns, getCoreRowModel: getCoreRowModel(), getRowId: (row) => String(row.transportPlanId),
    defaultColumn: { enableSorting: false },
    state: {
      sorting, columnVisibility, columnOrder: [], columnPinning: {}, rowPinning: {},
      columnFilters: [], globalFilter: undefined, grouping: [], expanded: {}, rowSelection: {},
      pagination: { pageIndex: params.pageIndex - 1, pageSize: params.pageSize },
      columnSizing: {}, columnSizingInfo: {
        startOffset: null, startSize: null, deltaOffset: null, deltaPercentage: null,
        isResizingColumn: false, columnSizingStart: [],
      },
    },
    onStateChange: () => {}, renderFallbackValue: null, onColumnVisibilityChange: setColumnVisibility,
    manualSorting: true, manualPagination: true, enableSortingRemoval: false, enableMultiSort: false,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const sort = next[0]
      const parsed = transportPlanSortSchema.safeParse(sort ? `${sort.id}:${sort.desc ? "desc" : "asc"}` : "createdAt:desc")
      if (parsed.success) onChange({ sortBy: parsed.data })
    },
  })
  return <DataTable table={table} isLoading={isLoading} aria-busy={isLoading}
    containerClassName="booking-panel overflow-x-auto" headerClassName="bg-[#e9e6de]"
    headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
    rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60" cellClassName="h-11 px-2.5 py-2 text-xs"
    emptyMessage={<EmptyState message={hasTransportPlanFilters(params) ? "No transport plans match your search or filters. Adjust your selections." : "No transport plans are available yet."} />}
    footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={(pageSize) => onChange({ pageSize })} pageSizeAriaLabel="Transport plans per page" />}>
    <div role="group" aria-label="Transport plans toolbar" className="flex min-w-0 items-start gap-2">
      {filters && <div className="min-w-0 flex-1">{filters}</div>}
      <div className="ml-auto flex shrink-0 justify-end"><DataTableViewOptions table={table} /></div>
    </div>
  </DataTable>
}
