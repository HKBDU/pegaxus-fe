import { useMemo, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { getCoreRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table"
import { approvedBookingDetail } from "@/app/route-config"
import { formatBookingDate } from "@/features/booking/utils"
import type { PaginationMeta } from "@/shared/types"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { EmptyState } from "@/shared/components/common"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { hasApprovedBookingFilters } from "../constants"
import { approvedBookingSortSchema } from "../schemas"
import type { ApprovedBookingListItem, ApprovedBookingsQueryParams } from "../types"
import { ApprovedBookingBadge } from "./ApprovedBookingBadge"
import { ApprovedBookingActionMenu } from "./ApprovedBookingActionMenu"
import { TransportPlanStatusBadge } from "./TransportPlanStatusBadge"

interface Props {
  bookings: ApprovedBookingListItem[]
  params: ApprovedBookingsQueryParams
  meta: PaginationMeta
  isLoading: boolean
  onChange: (patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>) => void
  onPageChange: (page: number) => void
  filters?: ReactNode
}

export function ApprovedBookingsTable({ bookings, params, meta, isLoading, onChange, onPageChange, filters }: Props) {
  const columns = useMemo<ColumnDef<ApprovedBookingListItem>[]>(() => [
    { accessorKey: "bookingCode", header: "Booking", enableHiding: false, cell: ({ row }) => <Link className="font-semibold text-primary underline-offset-2 hover:underline" to={approvedBookingDetail(row.original.bookingId)}>{row.original.bookingCode}</Link> },
    { accessorKey: "customerName", header: "Customer", cell: ({ row }) => <div className="min-w-32 whitespace-normal"><p className="font-medium">{row.original.customerName}</p>{row.original.customerCode && <p className="mt-1 text-[10px] text-slate-500">{row.original.customerCode}</p>}</div> },
    { id: "route", header: "Requested route", cell: ({ row: { original: booking } }) => <div className="min-w-44 max-w-64 space-y-1 whitespace-normal"><p><span className="text-slate-500">From:</span> {booking.originAddress} ({booking.originCountry})</p><p><span className="text-slate-500">To:</span> {booking.destinationAddress} ({booking.destinationCountry})</p></div> },
    { accessorKey: "isInternational", header: "Scope", cell: ({ row }) => <ApprovedBookingBadge value={row.original.isInternational ? "INTERNATIONAL" : "DOMESTIC"} /> },
    { accessorKey: "totalHorses", header: "Horses" },
    { accessorKey: "requestedDepartureDate", header: "Departure", enableSorting: true, cell: ({ row }) => formatBookingDate(row.original.requestedDepartureDate) },
    { accessorKey: "approvedAt", header: "Approved", enableSorting: true, cell: ({ row }) => formatBookingDate(row.original.approvedAt, true) },
    { id: "transportPlan", header: "Transport plan", cell: ({ row }) => row.original.transportPlan ? <TransportPlanStatusBadge status={row.original.transportPlan.status} /> : "Not created" },
    { id: "routePlan", header: "Primary route", cell: ({ row }) => row.original.routePlan ? <ApprovedBookingBadge value={row.original.routePlan.status} /> : "Not created" },
    { id: "complianceDossier", header: "Dossier", cell: ({ row }) => row.original.complianceDossier ? <ApprovedBookingBadge value={row.original.complianceDossier.status} /> : "Not created" },
    { id: "actions", header: "Actions", enableHiding: false, cell: ({ row }) => <ApprovedBookingActionMenu booking={row.original} /> },
  ], [])
  const [sortId, direction] = params.sortBy.split(":")
  const sorting: SortingState = [{ id: sortId, desc: direction === "desc" }]
  const table = useReactTable({
    data: bookings, columns, getCoreRowModel: getCoreRowModel(),
    defaultColumn: { enableSorting: false },
    initialState: { columnVisibility: { approvedAt: false, isInternational: false, complianceDossier: false } },
    state: { sorting }, manualSorting: true, manualPagination: true,
    enableSortingRemoval: false, enableMultiSort: false,
    getRowId: (row) => String(row.bookingId),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const sort = next[0]
      const parsed = approvedBookingSortSchema.safeParse(sort ? `${sort.id}:${sort.desc ? "desc" : "asc"}` : "requestedDepartureDate:asc")
      if (parsed.success) onChange({ sortBy: parsed.data })
    },
  })
  return <DataTable table={table} isLoading={isLoading} aria-busy={isLoading}
    containerClassName="booking-panel overflow-x-auto" headerClassName="bg-[#e9e6de]"
    headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
    rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
    cellClassName="h-11 px-2.5 py-2 text-xs"
    emptyMessage={<EmptyState message={hasApprovedBookingFilters(params) ? "No approved bookings match your filters. Adjust your filters." : "No approved bookings yet. Bookings appear here after approval."} />}
    footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={(pageSize) => onChange({ pageSize })} pageSizeAriaLabel="Approved bookings per page" />}>
    <div role="group" aria-label="Approved bookings toolbar" className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-start">
      {filters && <div className="min-w-0 flex-1">{filters}</div>}
      <div className="flex shrink-0 justify-end"><DataTableViewOptions table={table} /></div>
    </div>
  </DataTable>
}
