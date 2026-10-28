import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table"
import { ArrowRight, Ban, Eye, MoreVertical, Pencil } from "lucide-react"

import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import { CancelBookingDialog } from "@/features/booking/components/CancelBookingDialog"
import { BookingFilters } from "@/features/booking/components/BookingFilters"
import type { BookingAudience, BookingListParams, BookingSort, BookingStatus, BookingSummary } from "@/features/booking/types"
import { formatBookingDate } from "@/features/booking/utils"
import { formatUtcDate, formatUtcTime } from "@/shared/utils/datetime"
import type { EntityId, PaginationMeta } from "@/shared/types"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface BookingRowActionsProps {
  booking: BookingSummary
  audience: BookingAudience
  onView: () => void
  onEdit: () => void
  onCancel: () => void
}

function BookingRowActions({ booking, audience, onView, onEdit, onCancel }: BookingRowActionsProps) {
  const canEdit = booking.status === "PENDING" || booking.status === "DRAFT"
  const canCancel = booking.status === "PENDING" // the BE only cancels PENDING bookings

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${booking.bookingCode}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={onView}>
          <Eye className="size-3.5 text-slate-600" />
          View details
        </DropdownMenuItem>
        {audience === "customer" ? (
          <>
            <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" disabled={!canEdit} onSelect={onEdit}>
              <Pencil className="size-3.5 text-amber-600" />
              Edit booking
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-0.5" />
            <DropdownMenuItem
              variant="destructive"
              className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!"
              disabled={!canCancel}
              onSelect={onCancel}
            >
              <Ban className="size-3.5" />
              Cancel booking
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface BookingTableProps {
  bookings: BookingSummary[]
  audience: BookingAudience
  filters: BookingListParams
  meta: PaginationMeta
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: BookingStatus | "ALL") => void
  onSortChange: (value: BookingSort) => void
  onPageChange: (value: number) => void
  onPageSizeChange: (value: number) => void
  onCreate?: () => void
}

export function BookingTable({
  bookings,
  audience,
  filters,
  meta,
  isLoading,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onCreate,
}: BookingTableProps) {
  const navigate = useNavigate()
  const [cancelBookingId, setCancelBookingId] = useState<EntityId>()
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const detailsPath = useCallback(
    (bookingId: EntityId) => audience === "manager" ? `/admin/transport-requests/${bookingId}` : `/bookings/${bookingId}`,
    [audience],
  )

  const columns = useMemo<ColumnDef<BookingSummary>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
              aria-label="Select all bookings on this page"
              className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white"
            />
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
              aria-label={`Select ${row.original.bookingCode}`}
              className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"
            />
          </div>
        ),
      },
      {
        accessorKey: "bookingCode",
        enableHiding: false,
        header: "REQUEST CODE",
        cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.bookingCode}</span>,
      },
      ...(audience === "manager"
        ? [{ accessorKey: "customerName", header: "CUSTOMER" } satisfies ColumnDef<BookingSummary>]
        : []),
      {
        id: "route",
        accessorFn: (booking) => `${booking.originCountry} ${booking.destinationCountry}`,
        header: "PICKUP → DESTINATION",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="grid min-w-64 grid-cols-[minmax(6.5rem,1fr)_1.25rem_minmax(7.5rem,1fr)] items-center text-slate-700">
            <span className="truncate">{row.original.originCountry}</span>
            <ArrowRight className="mx-auto size-3 shrink-0 text-amber-500" />
            <span className="truncate pl-1.5">{row.original.destinationCountry}</span>
          </div>
        ),
      },
      {
        accessorKey: "requestedDepartureDate",
        header: "EXPECTED DEPARTURE",
        cell: ({ row }) => (
          <span className="block text-slate-900">{formatBookingDate(row.original.requestedDepartureDate)}</span>
        ),
      },
      {
        accessorKey: "totalHorses",
        header: () => <span className="block w-full text-center">HORSES</span>,
        enableSorting: false,
        cell: ({ row }) => <span className="block text-center font-semibold text-slate-900">{row.original.totalHorses}</span>,
      },
      {
        accessorKey: "status",
        header: () => <span className="block w-full text-center">STATUS</span>,
        enableSorting: false,
        cell: ({ row }) => <div className="flex justify-center"><BookingStatusBadge status={row.original.status} audience={audience} /></div>,
      },
      {
        accessorKey: "createdAt",
        header: "CREATED AT",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-slate-900">{formatUtcDate(row.original.createdAt)}</span>
            <span className="mt-1 block text-[0.68rem] text-slate-400">{formatUtcTime(row.original.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <BookingRowActions
              booking={row.original}
              audience={audience}
              onView={() => navigate(detailsPath(row.original.bookingId))}
              onEdit={() => navigate(`/bookings/${row.original.bookingId}/edit`)}
              onCancel={() => setCancelBookingId(row.original.bookingId)}
            />
          </div>
        ),
      },
    ],
    [audience, detailsPath, navigate],
  )

  const table = useReactTable({
    data: bookings,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => String(row.bookingId),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="booking-page-enter [animation-delay:100ms]">
        <DataTable
          table={table}
          isLoading={isLoading}
          className="gap-2.5"
          containerClassName="booking-panel overflow-x-auto"
          headerClassName="bg-[#e9e6de]"
          headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
          cellClassName="h-11 px-2.5 py-1.5 text-xs"
          footer={
            <TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
          }
        >
          <BookingFilters
            audience={audience}
            search={filters.search}
            status={filters.status}
            sortBy={filters.sortBy}
            onSearchChange={onSearchChange}
            onStatusChange={onStatusChange}
            onSortChange={onSortChange}
            onCreate={onCreate}
            viewOptions={<DataTableViewOptions table={table} />}
          />
        </DataTable>
      </div>

      <CancelBookingDialog
        bookingId={cancelBookingId}
        open={Boolean(cancelBookingId)}
        onOpenChange={(open) => !open && setCancelBookingId(undefined)}
      />
    </>
  )
}
