import { codeLinkClassName } from "@/shared/components/ui/code-link";
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Ban, CircleCheck, Clock, Eye, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2, Truck, X, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ProviderDeleteDialog, ProviderStatusDialog } from "@/features/fleet/components/ProviderActionDialogs"
import { ProviderModeBadge, ProviderStatusBadge } from "@/features/fleet/components/ProviderBadges"
import { PROVIDER_MODE_LABEL, PROVIDER_STATUS_LABEL, providerDetailPath, providerEditPath } from "@/features/fleet/constants/fleet.constants"
import { TRANSPORT_MODES, PROVIDER_STATUSES, type Provider, type ProviderCounts, type ProviderListParams, type ProviderStatus, type TransportMode } from "@/features/fleet/types"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useDebounce } from "@/shared/hooks"
import type { PaginationMeta } from "@/shared/types"

interface StatSpec {
  key: keyof ProviderCounts
  label: string
  hint: string
  icon: LucideIcon
  frame: string
  value: string
  iconClass: string
}

const STATS: StatSpec[] = [
  { key: "total", label: "Total providers", hint: "All registered partners", icon: Truck, frame: "border-slate-200 border-l-slate-400", value: "text-slate-900", iconClass: "text-slate-700" },
  { key: "active", label: "Active", hint: "Available for route segments", icon: CircleCheck, frame: "border-emerald-200 border-l-emerald-600", value: "text-emerald-800", iconClass: "text-emerald-600" },
  { key: "inactive", label: "Inactive", hint: "Hidden from new selections", icon: Clock, frame: "border-amber-200 border-l-amber-700", value: "text-amber-800", iconClass: "text-amber-700" },
  { key: "suspended", label: "Suspended", hint: "Blocked until reviewed", icon: Ban, frame: "border-red-300 border-l-red-600", value: "text-red-700", iconClass: "text-red-600" },
]

/** The four provider counters, built like the dossier dashboard cards so every card keeps its size while loading. */
export function ProviderStatCards({ counts }: { counts: ProviderCounts | undefined }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
      {STATS.map(({ key, label, hint, icon: Icon, frame, value, iconClass }) => (
        <li key={key} className={cn("booking-panel min-h-28 border border-l-4 bg-white p-4", frame)}>
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 font-heading text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
            <Icon className={cn("size-4 shrink-0", iconClass)} aria-hidden="true" />
          </div>
          {counts ? <p className={cn("m-0 mt-1 text-4xl font-bold leading-10", value)}>{counts[key]}</p> : <Skeleton className="mt-2 h-9 w-14 rounded-none bg-slate-100" />}
          <p className="m-0 mt-1 text-xs text-slate-500">{hint}</p>
        </li>
      ))}
    </ul>
  )
}

interface ProviderTableProps {
  providers: Provider[]
  filters: ProviderListParams
  meta: PaginationMeta
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onPatch: (patch: Partial<ProviderListParams>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onAdd: () => void
}

const MODE_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All service types" },
  ...TRANSPORT_MODES.map((mode) => ({ value: mode, label: PROVIDER_MODE_LABEL[mode] })),
]
const STATUS_OPTIONS: DataTableRadioOption[] = [
  { value: "ALL", label: "All statuses" },
  ...PROVIDER_STATUSES.map((status) => ({ value: status, label: PROVIDER_STATUS_LABEL[status] })),
]

const menuItemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"

export function ProviderTable({ providers, filters, meta, isLoading, onSearchChange, onPatch, onPageChange, onPageSizeChange, onAdd }: ProviderTableProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)
  const navigate = useNavigate()
  const [statusTarget, setStatusTarget] = useState<Provider | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null)

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  const columns = useMemo<ColumnDef<Provider>[]>(
    () => [
      {
        accessorKey: "providerCode",
        header: "PROVIDER CODE",
        enableHiding: false,
        cell: ({ row }) => (
          <button
            type="button"
            title="View provider details"
            onClick={() => navigate(providerDetailPath(row.original.transportProviderId))}
            className={codeLinkClassName}
          >
            {row.original.providerCode}
          </button>
        ),
      },
      { accessorKey: "providerName", header: "PROVIDER NAME", cell: ({ row }) => <span className="block min-w-36 whitespace-normal font-semibold text-slate-900">{row.original.providerName}</span> },
      {
        id: "serviceType",
        header: "SERVICE TYPE",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.supportedModes.map((mode) => <ProviderModeBadge key={mode} mode={mode} />)}
          </div>
        ),
      },
      {
        id: "location",
        header: "COUNTRY / ADDRESS",
        cell: ({ row }) => (
          <div className="min-w-32 whitespace-normal leading-tight">
            <span className="block text-slate-900">{row.original.country ?? "—"}</span>
            {row.original.address ? <span className="mt-1 block text-[0.68rem] text-slate-400">{row.original.address}</span> : null}
          </div>
        ),
      },
      {
        id: "contact",
        header: "CONTACT",
        cell: ({ row }) => (
          <div className="min-w-44 leading-tight">
            <span className="block text-slate-900">{row.original.contactName ?? row.original.email ?? "—"}</span>
            {row.original.contactName && row.original.email ? <span className="mt-1 block text-slate-700">{row.original.email}</span> : null}
            <span className="mt-1 block text-[0.68rem] text-slate-400">{row.original.phone ?? "—"}</span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => <span className="block w-full text-center">STATUS</span>,
        cell: ({ row }) => <div className="flex justify-center"><ProviderStatusBadge status={row.original.status} /></div>,
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${row.original.providerCode}`}>
                  <MoreVertical className="size-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(providerDetailPath(row.original.transportProviderId))}>
                  <Eye className="size-3.5 text-slate-600" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(providerEditPath(row.original.transportProviderId))}>
                  <Pencil className="size-3.5 text-amber-600" />
                  Edit provider
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => setStatusTarget(row.original)}>
                  <RefreshCw className="size-3.5 text-slate-600" />
                  Change status
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-0.5" />
                <DropdownMenuItem
                  variant="destructive"
                  className={cn(menuItemClass, "data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!")}
                  onSelect={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [navigate],
  )

  const table = useReactTable({ data: providers, columns, getRowId: (row) => row.transportProviderId, getCoreRowModel: getCoreRowModel() })

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
          cellClassName="px-2.5 py-1.5 text-xs"
          emptyMessage="No transport providers match the current filters."
          footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
        >
          <div role="toolbar" aria-label="Provider filters" className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(17rem,1fr)_10rem_9.5rem_auto]">
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                aria-label="Search providers"
                placeholder="Search code, name or tax code"
                spellCheck={false}
                className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
              />
              {localSearch ? (
                <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <DataTableRadioFilter title="Service type" value={filters.supportedMode} options={MODE_OPTIONS} onValueChange={(value) => onPatch({ supportedMode: value as TransportMode | "ALL" })} />
            <DataTableRadioFilter title="Status" value={filters.status} options={STATUS_OPTIONS} onValueChange={(value) => onPatch({ status: value as ProviderStatus | "ALL" })} />
            <div className="col-span-2 flex items-center justify-end gap-1.5 max-lg:[&_button]:w-full lg:col-span-1">
              <DataTableViewOptions table={table} />
              <Button type="button" size="sm" className="h-8 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" onClick={onAdd}>
                <Plus className="size-3.5" />
                New provider
              </Button>
            </div>
          </div>
        </DataTable>
      </div>

      <ProviderStatusDialog provider={statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)} />
      <ProviderDeleteDialog provider={deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} />
    </>
  )
}
