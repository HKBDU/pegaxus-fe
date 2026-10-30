import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table"
import { ArrowRight, Eye, MoreVertical } from "lucide-react"

import { OngoingTransportStatusBadge } from "@/features/ongoing-transport/components/OngoingTransportStatusBadge"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import type { PaginationMeta } from "@/shared/types"
import { formatUtcDate, formatUtcTime } from "@/shared/utils/datetime"

import { HORSE_HEALTH_ROUTES } from "../constants"
import type { AssignedTransport } from "../types"
import {
  AssignedTransportFilters,
  DEFAULT_ASSIGNED_SORT,
  type AssignedSort,
  type AssignedStatusFilter,
} from "./AssignedTransportFilters"

const KNOWN_STATUSES = ["READY", "IN_TRANSIT", "COMPLETED"]

function legLabel(transport: AssignedTransport) {
  const leg = transport.currentSegment
  return leg ? `${leg.fromLocationName} → ${leg.toLocationName}` : "Not started"
}

function DateCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>
  return (
    <div className="leading-tight">
      <span className="block text-slate-900">{formatUtcDate(value)}</span>
      <span className="mt-1 block text-[0.68rem] text-slate-400">{formatUtcTime(value)}</span>
    </div>
  )
}

function RowActions({ transport, onView }: { transport: AssignedTransport; onView: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${transport.transportCode}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={onView}>
          <Eye className="size-3.5 text-slate-600" />
          View transport
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function compare(sortBy: AssignedSort, a: AssignedTransport, b: AssignedTransport) {
  if (sortBy === "transportCode:asc") return a.transportCode.localeCompare(b.transportCode)
  // A missing departure sorts last in both directions.
  if (!a.departureAt || !b.departureAt) return Number(!a.departureAt) - Number(!b.departureAt)
  const diff = Date.parse(a.departureAt) - Date.parse(b.departureAt)
  return sortBy === "departureAt:asc" ? diff : -diff
}

/** Desktop list of the transports assigned to the Driver or Escort, with the same toolbar, columns and footer as the booking list. */
export function AssignedTransportsTable({ transports }: { transports: AssignedTransport[] }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<AssignedStatusFilter>("ALL")
  const [sortBy, setSortBy] = useState<AssignedSort>(DEFAULT_ASSIGNED_SORT)
  const [pageIndex, setPageIndex] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPageIndex(1)
  }, [])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return transports
      .filter((transport) => status === "ALL" || transport.status === status)
      .filter((transport) => !needle || [transport.transportCode, transport.bookingCode, legLabel(transport), transport.myRole].some((value) => value.toLowerCase().includes(needle)))
      .toSorted((a, b) => compare(sortBy, a, b))
  }, [transports, search, status, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(pageIndex, totalPages)
  const rows = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage, pageSize])
  const meta: PaginationMeta = {
    totalItems: filtered.length,
    totalPages,
    itemsPerPage: pageSize,
    currentPage,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  }

  const columns = useMemo<ColumnDef<AssignedTransport>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
              aria-label="Select all transports on this page"
              className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white"
            />
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
              aria-label={`Select ${row.original.transportCode}`}
              className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"
            />
          </div>
        ),
      },
      {
        accessorKey: "transportCode",
        enableHiding: false,
        header: "TRANSPORT CODE",
        cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.transportCode}</span>,
      },
      {
        accessorKey: "bookingCode",
        header: "BOOKING CODE",
        cell: ({ row }) => <span className="text-slate-700">{row.original.bookingCode}</span>,
      },
      {
        accessorKey: "myRole",
        header: "MY ROLE",
        enableSorting: false,
        cell: ({ row }) => <span className="capitalize text-slate-700">{row.original.myRole.toLowerCase()}</span>,
      },
      {
        id: "currentLeg",
        accessorFn: legLabel,
        header: "CURRENT LEG",
        enableSorting: false,
        cell: ({ row }) => {
          const leg = row.original.currentSegment
          if (!leg) return <span className="text-slate-400">Not started</span>
          return (
            <div className="grid min-w-64 grid-cols-[minmax(6.5rem,1fr)_1.25rem_minmax(7.5rem,1fr)] items-center text-slate-700">
              <span className="truncate">{leg.fromLocationName}</span>
              <ArrowRight className="mx-auto size-3 shrink-0 text-amber-500" />
              <span className="truncate pl-1.5">{leg.toLocationName}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "horseCount",
        header: () => <span className="block w-full text-center">HORSES</span>,
        enableSorting: false,
        cell: ({ row }) => <span className="block text-center font-semibold text-slate-900">{row.original.horseCount}</span>,
      },
      {
        accessorKey: "status",
        header: () => <span className="block w-full text-center">STATUS</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            {KNOWN_STATUSES.includes(row.original.status)
              ? <OngoingTransportStatusBadge status={row.original.status as "READY" | "IN_TRANSIT" | "COMPLETED"} className="rounded-full" />
              : <span className="text-slate-700">{row.original.status.replaceAll("_", " ")}</span>}
          </div>
        ),
      },
      {
        accessorKey: "departureAt",
        header: "DEPARTURE",
        cell: ({ row }) => <DateCell value={row.original.departureAt} />,
      },
      {
        accessorKey: "etaAt",
        header: "ETA",
        cell: ({ row }) => <DateCell value={row.original.etaAt} />,
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
            <RowActions transport={row.original} onView={() => navigate(HORSE_HEALTH_ROUTES.transportDetail(row.original.transportId))} />
          </div>
        ),
      },
    ],
    [navigate],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => row.transportId,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="booking-page-enter [animation-delay:100ms]">
      <DataTable
        table={table}
        className="gap-2.5"
        containerClassName="booking-panel overflow-x-auto"
        headerClassName="bg-[#e9e6de]"
        headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
        rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
        cellClassName="h-11 px-2.5 py-1.5 text-xs"
        emptyMessage="No assigned transports match the current filters."
        onRowClick={(row) => navigate(HORSE_HEALTH_ROUTES.transportDetail(row.original.transportId))}
        footer={<TablePagination meta={meta} onPageChange={setPageIndex} onPageSizeChange={(size) => { setPageSize(size); setPageIndex(1) }} />}
      >
        <AssignedTransportFilters
          search={search}
          status={status}
          sortBy={sortBy}
          onSearchChange={handleSearchChange}
          onStatusChange={(value) => { setStatus(value); setPageIndex(1) }}
          onSortChange={(value) => { setSortBy(value); setPageIndex(1) }}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </DataTable>
    </div>
  )
}
