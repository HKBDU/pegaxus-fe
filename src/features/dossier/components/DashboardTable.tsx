import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table"
import { ArrowRight, MoreVertical } from "lucide-react"

import { DashboardFilters } from "@/features/dossier/components/DashboardFilters"
import { DossierProgressBar } from "@/features/dossier/components/DossierProgressBar"
import { DossierStatusBadge } from "@/features/dossier/components/DossierStatusBadge"
import type { DashboardItem, DashboardParams, DashboardSort, DossierRisk, DossierRouteType, DossierStatus } from "@/features/dossier/types"
import { formatDossierDate } from "@/features/dossier/utils"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import type { PaginationMeta } from "@/shared/types"

const menuItemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"

interface DashboardTableProps {
  items: DashboardItem[]
  filters: DashboardParams
  meta: PaginationMeta
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onRouteChange: (value: DossierRouteType | "ALL") => void
  onStatusChange: (value: DossierStatus | "ALL") => void
  onRiskChange: (value: DossierRisk | "ALL") => void
  onSortChange: (value: DashboardSort) => void
  onReset: () => void
  onPageChange: (value: number) => void
  onPageSizeChange: (value: number) => void
}

export function DashboardTable({ items, filters, meta, isLoading, onSearchChange, onRouteChange, onStatusChange, onRiskChange, onSortChange, onReset, onPageChange, onPageSizeChange }: DashboardTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo<ColumnDef<DashboardItem>[]>(
    () => [
      {
        accessorKey: "dossierCode",
        header: "DOSSIER CODE",
        enableHiding: false,
        cell: ({ row }) => (
          <span className="inline-block whitespace-nowrap rounded-[2px] border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[0.7rem] font-semibold text-slate-900">
            {row.original.dossierCode ?? `#${row.original.complianceDossierId}`}
          </span>
        ),
      },
      { accessorKey: "bookingCode", header: "BOOKING REF", cell: ({ row }) => <span className="whitespace-nowrap text-slate-600">{row.original.bookingCode}</span> },
      { accessorKey: "customerName", header: "CLIENT", cell: ({ row }) => <span className="block min-w-32 max-w-48 whitespace-normal font-semibold leading-snug text-slate-900">{row.original.customerName}</span> },
      {
        id: "route",
        header: "ROUTE",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap text-slate-800">
            <span className="rounded-[2px] bg-slate-900 px-1 py-0.5 text-[0.65rem] font-bold leading-none text-white">{row.original.originCountry}</span>
            <ArrowRight className="size-3 text-amber-500" aria-hidden="true" />
            <span className="rounded-[2px] bg-slate-900 px-1 py-0.5 text-[0.65rem] font-bold leading-none text-white">{row.original.destinationCountry}</span>
          </div>
        ),
      },
      {
        accessorKey: "requestedDepartureDate",
        header: "DEPARTURE",
        cell: ({ row }) => <span className="whitespace-nowrap text-slate-700">{formatDossierDate(row.original.requestedDepartureDate)}</span>,
      },
      { accessorKey: "progressPercent", header: "PROGRESS", cell: ({ row }) => <DossierProgressBar percent={row.original.progressPercent} /> },
      {
        accessorKey: "status",
        header: "STATUS",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <DossierStatusBadge status={row.original.status} />
            {row.original.isUrgentRisk ? <span className="rounded-[2px] border border-red-300 bg-red-50 px-1.5 py-1 font-heading text-[0.6rem] font-semibold uppercase leading-none tracking-[0.06em] text-red-700">Urgent</span> : null}
          </div>
        ),
      },
      {
        id: "actions",
        header: "ACTIONS",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${row.original.bookingCode}`}>
                  <MoreVertical className="size-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-44 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(`/compliance-dossiers/${row.original.complianceDossierId}`)}>
                  <ArrowRight className="size-3.5 text-slate-700" />
                  View dossier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [navigate],
  )

  // The shared table only styles a row through its "selected" state, so urgent-risk rows are flagged that way (red tint).
  const urgentRows = useMemo<RowSelectionState>(
    () => Object.fromEntries(items.filter((item) => item.isUrgentRisk).map((item) => [String(item.complianceDossierId), true])),
    [items],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, rowSelection: urgentRows },
    onSortingChange: setSorting,
    enableRowSelection: false,
    getRowId: (row) => String(row.complianceDossierId),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const hasFilters = Boolean(filters.search) || filters.routeType !== "ALL" || filters.status !== "ALL" || filters.risk !== "ALL"

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      className="gap-2.5"
      containerClassName="booking-panel overflow-x-auto"
      headerClassName="bg-[#e9e6de]"
      headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
      rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60 data-[state=selected]:bg-red-50/70"
      cellClassName="px-2.5 py-2.5 text-xs"
      emptyMessage={
        <div className="grid justify-items-center gap-2 py-4">
          <p className="m-0">No ComplianceDossiers match the selected filter criteria.</p>
          {hasFilters ? (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] shadow-none" onClick={onReset}>
              Reset filters
            </Button>
          ) : null}
        </div>
      }
      footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
    >
      <DashboardFilters
        filters={filters}
        onSearchChange={onSearchChange}
        onRouteChange={onRouteChange}
        onStatusChange={onStatusChange}
        onRiskChange={onRiskChange}
        onSortChange={onSortChange}
        onReset={onReset}
        viewOptions={<DataTableViewOptions table={table} />}
      />
    </DataTable>
  )
}
