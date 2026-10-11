import { useEffect, useMemo, useState, type ReactNode } from "react"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Ban, CircleCheck, Clock, Eye, MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2, Truck, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { ProviderDeleteDialog, ProviderStatusDialog } from "@/features/fleet/components/ProviderActionDialogs"
import { ProviderDetailDialog } from "@/features/fleet/components/ProviderDetailDialog"
import { ProviderFormDialog } from "@/features/fleet/components/ProviderFormDialog"
import { ProviderModeBadge, ProviderStatusBadge } from "@/features/fleet/components/ProviderBadges"
import { PROVIDER_MODE_LABEL, PROVIDER_PAGE_SIZE_OPTIONS } from "@/features/fleet/constants/fleet.constants"
import { TRANSPORT_MODES, PROVIDER_STATUSES, type Provider, type ProviderCounts, type ProviderListParams, type ProviderStatus, type TransportMode } from "@/features/fleet/types"
import { PageSizeSelect, Pagination } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useDebounce } from "@/shared/hooks"
import type { PaginationMeta } from "@/shared/types"

function StatCard({ icon, tone, value, label }: { icon: ReactNode; tone: string; value: number | undefined; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", tone)} aria-hidden="true">{icon}</span>
      <div>
        <p className="m-0 text-2xl font-bold leading-7 text-slate-900">{value ?? "—"}</p>
        <p className="m-0 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

export function ProviderStatCards({ counts }: { counts: ProviderCounts | undefined }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={<Truck className="size-5 text-sky-600" />} tone="bg-sky-100" value={counts?.total} label="Total Transport Providers" />
      <StatCard icon={<CircleCheck className="size-5 text-emerald-600" />} tone="bg-emerald-100" value={counts?.active} label="Active Providers" />
      <StatCard icon={<Clock className="size-5 text-amber-600" />} tone="bg-amber-100" value={counts?.inactive} label="Inactive Providers" />
      <StatCard icon={<Ban className="size-5 text-red-600" />} tone="bg-red-100" value={counts?.suspended} label="Suspended Providers" />
    </div>
  )
}

interface ProviderTableProps {
  providers: Provider[]
  filters: ProviderListParams
  meta: PaginationMeta
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onPatch: (patch: Partial<ProviderListParams>) => void
  onReset: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onAdd: () => void
}

const selectClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-none"
const menuItemClass = "gap-2 rounded-md px-2 py-1.5 text-xs"

export function ProviderTable({ providers, filters, meta, isLoading, onSearchChange, onPatch, onReset, onPageChange, onPageSizeChange, onAdd }: ProviderTableProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const debouncedSearch = useDebounce(localSearch, 300)
  const [viewTarget, setViewTarget] = useState<Provider | null>(null)
  const [editTarget, setEditTarget] = useState<Provider | null>(null)
  const [statusTarget, setStatusTarget] = useState<Provider | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Provider | null>(null)
  const hasFilters = Boolean(localSearch) || filters.supportedMode !== "ALL" || filters.status !== "ALL"

  useEffect(() => onSearchChange(debouncedSearch), [debouncedSearch, onSearchChange])

  const columns = useMemo<ColumnDef<Provider>[]>(
    () => [
      {
        accessorKey: "providerCode",
        header: "Provider Code",
        cell: ({ row }) => (
          <button
            type="button"
            title="View provider details"
            onClick={() => setViewTarget(row.original)}
            className="font-bold text-slate-900 underline-offset-2 hover:text-[#ef5b0c] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
          >
            {row.original.providerCode}
          </button>
        ),
      },
      { accessorKey: "providerName", header: "Provider Name", cell: ({ row }) => <span className="block min-w-36 whitespace-normal font-semibold text-slate-900">{row.original.providerName}</span> },
      {
        id: "serviceType",
        header: "Service Type",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.supportedModes.map((mode) => <ProviderModeBadge key={mode} mode={mode} />)}
          </div>
        ),
      },
      {
        id: "location",
        header: "Country / Address",
        cell: ({ row }) => (
          <div className="min-w-32 whitespace-normal leading-tight text-slate-700">
            <span className="block">{row.original.country ?? "—"}</span>
            {row.original.address ? <span className="mt-0.5 block text-[11px] text-slate-400">{row.original.address}</span> : null}
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact Information",
        cell: ({ row }) => (
          <div className="min-w-44 leading-tight text-slate-700">
            {row.original.contactName ? <span className="block font-medium text-slate-900">{row.original.contactName}</span> : null}
            <span className="block">{row.original.email ?? "—"}</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">{row.original.phone ?? "—"}</span>
          </div>
        ),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <ProviderStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: () => <span className="block w-full text-center">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1.5">
            <Button type="button" variant="outline" className="h-7 gap-1 rounded-md px-2 text-xs" onClick={() => setViewTarget(row.original)}>
              <Eye className="size-3" />
              View
            </Button>
            <Button type="button" variant="outline" className="h-7 gap-1 rounded-md px-2 text-xs" onClick={() => setEditTarget(row.original)}>
              <Pencil className="size-3" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" aria-label={`More actions for ${row.original.providerCode}`} className="size-7 rounded-md p-0">
                  <MoreHorizontal className="size-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-44 min-w-0 rounded-md p-1 shadow-md">
                <DropdownMenuItem className={menuItemClass} onSelect={() => setStatusTarget(row.original)}>
                  <RefreshCw className="size-3.5 text-slate-600" />
                  Change status
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem variant="destructive" className={cn(menuItemClass, "data-[variant=destructive]:text-red-600")} onSelect={() => setDeleteTarget(row.original)}>
                  <Trash2 className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({ data: providers, columns, getRowId: (row) => row.transportProviderId, getCoreRowModel: getCoreRowModel() })
  const first = meta.totalItems === 0 ? 0 : (meta.currentPage - 1) * meta.itemsPerPage + 1
  const last = Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)

  return (
    <>
      <div className="grid gap-3">
        <div role="toolbar" aria-label="Provider filters" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[12rem_12rem_minmax(14rem,1fr)_auto_auto]">
          <div className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Service Type</span>
            <Select value={filters.supportedMode} onValueChange={(value) => onPatch({ supportedMode: value as TransportMode | "ALL" })}>
              <SelectTrigger aria-label="Service type" className={selectClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-sm">All Service Types</SelectItem>
                {TRANSPORT_MODES.map((mode) => <SelectItem key={mode} value={mode} className="text-sm">{PROVIDER_MODE_LABEL[mode]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Status</span>
            <Select value={filters.status} onValueChange={(value) => onPatch({ status: value as ProviderStatus | "ALL" })}>
              <SelectTrigger aria-label="Status" className={selectClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-sm">All Statuses</SelectItem>
                {PROVIDER_STATUSES.map((status) => <SelectItem key={status} value={status} className="text-sm">{status}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-semibold text-slate-700">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                aria-label="Search providers"
                placeholder="Search by provider code, name or tax code..."
                spellCheck={false}
                className="h-9 rounded-md border-slate-200 bg-white pl-8 pr-8 text-sm shadow-none placeholder:text-slate-400"
              />
              {localSearch ? (
                <button type="button" aria-label="Clear search" onClick={() => setLocalSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="outline" disabled={!hasFilters} className="h-9 gap-1.5 rounded-md px-3 text-sm" onClick={() => { setLocalSearch(""); onReset() }}>
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          </div>
          <div className="flex items-end">
            <Button type="button" className="h-9 gap-1.5 rounded-md bg-[#ef5b0c] px-4 text-sm font-semibold text-white hover:bg-[#d84f08]" onClick={onAdd}>
              <Plus className="size-4" />
              Add New Provider
            </Button>
          </div>
        </div>

        <DataTable
          table={table}
          isLoading={isLoading}
          className="gap-3"
          containerClassName="rounded-xl border border-slate-200 bg-white overflow-x-auto"
          headerClassName="bg-slate-50"
          headerCellClassName="h-11 whitespace-nowrap px-3 text-xs font-semibold text-slate-600"
          rowClassName="border-slate-100 hover:bg-orange-50/40"
          cellClassName="px-3 py-2.5 text-xs"
          emptyMessage="No transport providers match the current filters."
          footer={
            <div className="flex flex-col gap-2 px-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="m-0">Showing {first}-{last} of {meta.totalItems} providers</p>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <PageSizeSelect value={meta.itemsPerPage} options={PROVIDER_PAGE_SIZE_OPTIONS} ariaLabel="Rows per page" onValueChange={onPageSizeChange} />
                <Pagination meta={meta} onPageChange={onPageChange} />
              </div>
            </div>
          }
        />
      </div>

      <ProviderDetailDialog
        provider={viewTarget}
        onOpenChange={(open) => !open && setViewTarget(null)}
        onEdit={(provider) => {
          setViewTarget(null)
          setEditTarget(provider)
        }}
      />
      <ProviderFormDialog target={editTarget} onOpenChange={(open) => !open && setEditTarget(null)} />
      <ProviderStatusDialog provider={statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)} />
      <ProviderDeleteDialog provider={deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} />
    </>
  )
}
