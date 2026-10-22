import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Eye, MoreVertical, ReceiptText, Route } from "lucide-react"

import { CategoryBadge, SeverityBadge, StatusBadge } from "@/shared/components/incident"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import type { PaginationMeta } from "@/shared/types"

import { incidentRoutes } from "../constants"
import { useIncidentViewer } from "../hooks/useViewer"
import type { IncidentListItem, IncidentListParams } from "../types"
import { formatDate, formatTime, placeLine, roleLabel } from "../utils"
import { IncidentFilters } from "./IncidentFilters"

interface RowActionsProps {
  item: IncidentListItem
  canReroute: boolean
  canReviewCost: boolean
}

function RowActions({ item, canReroute, canReviewCost }: RowActionsProps) {
  const navigate = useNavigate()
  const open = item.status === "REPORTED" || item.status === "PENDING"
  const itemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${item.incidentCode}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-44 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className={itemClass} onSelect={() => navigate(incidentRoutes.adminDetail(item.incidentReportId))}>
          <Eye className="size-3.5 text-slate-600" />
          View details
        </DropdownMenuItem>
        {canReroute && open ? (
          <DropdownMenuItem className={itemClass} onSelect={() => navigate(incidentRoutes.reroute(item.incidentReportId))}>
            <Route className="size-3.5 text-amber-600" />
            Route decision
          </DropdownMenuItem>
        ) : null}
        {canReviewCost && item.pendingCostCount > 0 ? (
          <DropdownMenuItem className={itemClass} onSelect={() => navigate(`${incidentRoutes.adminDetail(item.incidentReportId)}#emergency-costs`)}>
            <ReceiptText className="size-3.5 text-amber-600" />
            Review cost ({item.pendingCostCount})
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface IncidentTableProps {
  items: IncidentListItem[]
  params: IncidentListParams
  meta: PaginationMeta
  isLoading?: boolean
  onFilterChange: (patch: Partial<IncidentListParams>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function IncidentTable({ items, params, meta, isLoading, onFilterChange, onPageChange, onPageSizeChange }: IncidentTableProps) {
  const { isManager, isCoordinator } = useIncidentViewer()

  const columns = useMemo<ColumnDef<IncidentListItem>[]>(
    () => [
      {
        accessorKey: "incidentCode",
        enableHiding: false,
        enableSorting: false,
        header: "INCIDENT CODE",
        cell: ({ row }) => (
          <Link to={incidentRoutes.adminDetail(row.original.incidentReportId)} className="font-semibold text-slate-900 underline-offset-2 hover:text-amber-700 hover:underline">
            {row.original.incidentCode}
          </Link>
        ),
      },
      {
        id: "transport",
        enableSorting: false,
        header: "TRANSPORT",
        cell: ({ row }) => <span className="text-slate-700">{row.original.transport.transportCode}</span>,
      },
      {
        id: "reportedBy",
        enableSorting: false,
        header: "REPORTED BY",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-slate-900">{row.original.reportedBy.fullName}</span>
            <span className="mt-1 block text-[0.68rem] text-slate-400">{roleLabel(row.original.reportedBy.role)}</span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        enableSorting: false,
        header: "CATEGORY",
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        accessorKey: "severity",
        enableSorting: false,
        header: () => <span className="block w-full text-center">SEVERITY</span>,
        cell: ({ row }) => <div className="flex justify-center"><SeverityBadge severity={row.original.severity} /></div>,
      },
      {
        accessorKey: "status",
        enableSorting: false,
        header: () => <span className="block w-full text-center">STATUS</span>,
        cell: ({ row }) => <div className="flex justify-center"><StatusBadge status={row.original.status} /></div>,
      },
      {
        accessorKey: "occurredAt",
        enableSorting: false,
        header: "OCCURRED AT",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-slate-900">{formatDate(row.original.occurredAt)}</span>
            <span className="mt-1 block text-[0.68rem] text-slate-400">{formatTime(row.original.occurredAt)}</span>
          </div>
        ),
      },
      {
        id: "location",
        enableSorting: false,
        header: "LOCATION",
        cell: ({ row }) => <span className="block max-w-48 truncate text-slate-700" title={placeLine(row.original.location)}>{placeLine(row.original.location)}</span>,
      },
      {
        id: "costRequests",
        enableSorting: false,
        header: () => <span className="block w-full text-center">COST REQUESTS</span>,
        cell: ({ row }) => (
          <div className="text-center leading-tight">
            <span className="block font-semibold text-slate-900">{row.original.costRequestCount}</span>
            {row.original.pendingCostCount > 0 ? <span className="mt-1 block text-[0.68rem] font-medium text-amber-700">{row.original.pendingCostCount} pending</span> : null}
          </div>
        ),
      },
      {
        accessorKey: "emergencySettlementRequired",
        enableSorting: false,
        header: () => <span className="block w-full text-center">SETTLEMENT</span>,
        cell: ({ row }) => (
          <span className={`block text-center font-medium ${row.original.emergencySettlementRequired ? "text-amber-700" : "text-slate-400"}`}>
            {row.original.emergencySettlementRequired ? "Yes" : "No"}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <RowActions item={row.original} canReroute={isManager || isCoordinator} canReviewCost={isManager} />
          </div>
        ),
      },
    ],
    [isCoordinator, isManager],
  )

  const table = useReactTable({
    data: items,
    columns,
    getRowId: (row) => row.incidentReportId,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
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
        emptyMessage="No incidents match the current filters."
        footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
      >
        <IncidentFilters params={params} onChange={onFilterChange} viewOptions={<DataTableViewOptions table={table} />} />
      </DataTable>
    </div>
  )
}
