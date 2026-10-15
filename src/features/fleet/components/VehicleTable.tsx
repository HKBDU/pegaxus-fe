import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Eye, MoreVertical, Pencil, RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { CapacityChip, ExpiryLine, VehicleModeBadge, VehicleStatusBadge } from "@/features/fleet/components/VehicleBadges"
import { VehicleFilters } from "@/features/fleet/components/VehicleFilters"
import { VehicleStatusDialog } from "@/features/fleet/components/VehicleStatusDialog"
import { VEHICLE_SORT_OPTIONS, vehicleDetailPath, vehicleEditPath } from "@/features/fleet/constants/fleet.constants"
import type { Vehicle, VehicleListParams, VehicleSort } from "@/features/fleet/types"
import { equipmentSummary, formatMonthYear } from "@/features/fleet/utils"
import { Pagination } from "@/shared/components/common"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import type { PaginationMeta } from "@/shared/types"

const menuItemClass = "gap-1.5 rounded-[2px] px-2 py-1.5 text-[0.72rem]"

interface VehicleTableProps {
  vehicles: Vehicle[]
  filters: VehicleListParams
  meta: PaginationMeta
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onPatch: (patch: Partial<VehicleListParams>) => void
  onReset: () => void
  onPageChange: (page: number) => void
}

export function VehicleTable({ vehicles, filters, meta, isLoading, onSearchChange, onPatch, onReset, onPageChange }: VehicleTableProps) {
  const navigate = useNavigate()
  const [statusTarget, setStatusTarget] = useState<Vehicle | null>(null)

  const columns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        accessorKey: "vehicleCode",
        header: "VEHICLE CODE",
        enableSorting: false,
        cell: ({ row }) => <span className="font-heading text-sm font-bold uppercase text-slate-900">{row.original.vehicleCode}</span>,
      },
      {
        accessorKey: "vehicleName",
        header: "VEHICLE NAME",
        enableSorting: false,
        cell: ({ row }) => <span className="block min-w-36 max-w-52 whitespace-normal font-semibold leading-snug text-slate-900">{row.original.vehicleName ?? "—"}</span>,
      },
      {
        accessorKey: "transportMode",
        header: "MODE",
        enableSorting: false,
        cell: ({ row }) => <VehicleModeBadge mode={row.original.transportMode} />,
      },
      {
        accessorKey: "licensePlate",
        header: "PLATE / REGISTRATION",
        enableSorting: false,
        cell: ({ row }) => <span className="font-mono text-xs font-semibold text-slate-800">{row.original.licensePlate ?? "—"}</span>,
      },
      {
        id: "type",
        header: "TYPE & SPECIFICATION",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40 max-w-56 whitespace-normal leading-tight">
            <span className="block text-slate-900">
              {[row.original.vehicleType, row.original.manufacturer].filter(Boolean).join(" • ") || "—"}
            </span>
            {row.original.model ? <span className="mt-0.5 block text-[0.68rem] text-slate-400">{row.original.model}</span> : null}
          </div>
        ),
      },
      {
        accessorKey: "capacityHorses",
        header: "CAPACITY",
        enableSorting: false,
        cell: ({ row }) => <CapacityChip capacity={row.original.capacityHorses} />,
      },
      {
        id: "inspection",
        header: "INSPECTION & INSURANCE",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="grid min-w-36 gap-1 text-[0.7rem]">
            <ExpiryLine label="INSP" status={row.original.registrationStatus} date={row.original.registrationExpiryDate} shortDate={formatMonthYear(row.original.registrationExpiryDate)} />
            <ExpiryLine label="INS" status={row.original.insuranceStatus} date={row.original.insuranceExpiryDate} shortDate={formatMonthYear(row.original.insuranceExpiryDate)} />
          </div>
        ),
      },
      {
        accessorKey: "specialEquipment",
        header: "SPECIAL EQUIPMENT",
        enableSorting: false,
        cell: ({ row }) => (
          <span title={equipmentSummary(row.original.specialEquipment)} className="block max-w-52 truncate text-slate-600">
            {equipmentSummary(row.original.specialEquipment)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => <span className="block w-full text-center">STATUS</span>,
        enableSorting: false,
        cell: ({ row }) => <div className="flex justify-center"><VehicleStatusBadge status={row.original.status} /></div>,
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-7 rounded-[2px] p-0" variant="ghost" aria-label={`Actions for ${row.original.vehicleCode}`}>
                  <MoreVertical className="size-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-44 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(vehicleDetailPath(row.original.vehicleId))}>
                  <Eye className="size-3.5 text-slate-600" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(vehicleEditPath(row.original.vehicleId))}>
                  <Pencil className="size-3.5 text-amber-600" />
                  Edit Information
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => setStatusTarget(row.original)}>
                  <RefreshCw className="size-3.5 text-slate-600" />
                  Update Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [navigate],
  )

  const table = useReactTable({
    data: vehicles,
    columns,
    getRowId: (row) => row.vehicleId,
    getCoreRowModel: getCoreRowModel(),
  })

  const first = meta.totalItems === 0 ? 0 : (meta.currentPage - 1) * meta.itemsPerPage + 1
  const last = Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)

  return (
    <>
      <div className="booking-page-enter grid gap-3 [animation-delay:100ms]">
        <VehicleFilters filters={filters} onSearchChange={onSearchChange} onPatch={onPatch} onReset={onReset} />

        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <p role="status" className="m-0 flex items-center gap-1.5 font-heading text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
            <span className="inline-block size-1.5 bg-[#ef8f00]" aria-hidden="true" />
            Showing {first}-{last} of {meta.totalItems} vehicles
          </p>
          <label className="flex items-center gap-1.5 font-heading text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
            Sort by:
            <Select value={filters.sortBy} onValueChange={(value) => onPatch({ sortBy: value as VehicleSort })}>
              <SelectTrigger aria-label="Sort vehicles" className="h-7 w-auto gap-1 rounded-[2px] border-0 bg-transparent px-1 font-heading text-[10px] font-bold uppercase tracking-[0.08em] text-slate-900 shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-[2px]">
                {VEHICLE_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>

        <DataTable
          table={table}
          isLoading={isLoading}
          className="gap-2.5"
          containerClassName="booking-panel overflow-x-auto"
          headerClassName="bg-[#e9e6de]"
          headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          rowClassName={cn("booking-table-row border-slate-200 hover:bg-amber-50/60")}
          cellClassName="h-14 px-2.5 py-2 text-xs"
          emptyMessage="No available vehicles matching the search criteria."
          footer={
            <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p role="status" className="m-0">
                Showing {first} to {last} of {meta.totalItems} vehicles
              </p>
              <Pagination meta={meta} onPageChange={onPageChange} />
            </div>
          }
        />
      </div>

      <VehicleStatusDialog vehicle={statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)} />
    </>
  )
}
