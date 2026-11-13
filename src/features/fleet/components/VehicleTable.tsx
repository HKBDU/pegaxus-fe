import { codeLinkClassName } from "@/shared/components/ui/code-link";
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Eye, MoreVertical, Pencil, Plus, RefreshCw } from "lucide-react"

import { CapacityChip, ExpiryLine, VehicleModeBadge, VehicleStatusBadge } from "@/features/fleet/components/VehicleBadges"
import { VehicleFilters } from "@/features/fleet/components/VehicleFilters"
import { VehicleStatusDialog } from "@/features/fleet/components/VehicleStatusDialog"
import { vehicleDetailPath, vehicleEditPath } from "@/features/fleet/constants/fleet.constants"
import type { Vehicle, VehicleListParams } from "@/features/fleet/types"
import { equipmentSummary, formatMonthYear } from "@/features/fleet/utils"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import type { PaginationMeta } from "@/shared/types"

const menuItemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"

interface VehicleTableProps {
  vehicles: Vehicle[]
  filters: VehicleListParams
  meta: PaginationMeta
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onPatch: (patch: Partial<VehicleListParams>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onAdd: () => void
}

export function VehicleTable({ vehicles, filters, meta, isLoading, onSearchChange, onPatch, onPageChange, onPageSizeChange, onAdd }: VehicleTableProps) {
  const navigate = useNavigate()
  const [statusTarget, setStatusTarget] = useState<Vehicle | null>(null)

  const columns = useMemo<ColumnDef<Vehicle>[]>(
    () => [
      {
        accessorKey: "vehicleCode",
        header: "VEHICLE CODE",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <button type="button" title="View vehicle details" onClick={() => navigate(vehicleDetailPath(row.original.vehicleId))} className={codeLinkClassName}>
            {row.original.vehicleCode}
          </button>
        ),
      },
      {
        accessorKey: "vehicleName",
        header: "VEHICLE NAME",
        enableSorting: false,
        cell: ({ row }) => <span className="block min-w-32 max-w-52 whitespace-normal leading-snug text-slate-900">{row.original.vehicleName ?? "—"}</span>,
      },
      {
        accessorKey: "transportMode",
        header: "MODE",
        enableSorting: false,
        cell: ({ row }) => <VehicleModeBadge mode={row.original.transportMode} />,
      },
      {
        accessorKey: "licensePlate",
        header: "PLATE",
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap text-slate-900">{row.original.licensePlate ?? "—"}</span>,
      },
      {
        accessorKey: "country",
        header: "COUNTRY",
        enableSorting: false,
        cell: ({ row }) => <span className="whitespace-nowrap text-slate-900">{row.original.country ?? "Unknown"}</span>,
      },
      {
        id: "type",
        header: "TYPE & SPECIFICATION",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="min-w-40 max-w-56 whitespace-normal leading-tight">
            <span className="block text-slate-900">{[row.original.vehicleType, row.original.manufacturer].filter(Boolean).join(" • ") || "—"}</span>
            {row.original.model ? <span className="mt-1 block text-[0.68rem] text-slate-400">{row.original.model}</span> : null}
          </div>
        ),
      },
      {
        accessorKey: "capacityHorses",
        header: () => <span className="block w-full text-center">CAPACITY</span>,
        enableSorting: false,
        cell: ({ row }) => <div className="flex justify-center"><CapacityChip capacity={row.original.capacityHorses} /></div>,
      },
      {
        id: "inspection",
        header: "INSPECTION & INSURANCE",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="grid min-w-36 gap-1 text-xs">
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
          <span title={equipmentSummary(row.original.specialEquipment)} className="block max-w-48 truncate text-slate-600">
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
                <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${row.original.vehicleCode}`}>
                  <MoreVertical className="size-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(vehicleDetailPath(row.original.vehicleId))}>
                  <Eye className="size-3.5 text-slate-600" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => navigate(vehicleEditPath(row.original.vehicleId))}>
                  <Pencil className="size-3.5 text-amber-600" />
                  Edit vehicle
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => setStatusTarget(row.original)}>
                  <RefreshCw className="size-3.5 text-slate-600" />
                  Update status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [navigate],
  )

  const table = useReactTable({ data: vehicles, columns, getRowId: (row) => row.vehicleId, getCoreRowModel: getCoreRowModel() })

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
          emptyMessage="No vehicles match the current filters."
          footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
        >
          <VehicleFilters
            filters={filters}
            onSearchChange={onSearchChange}
            onPatch={onPatch}
            trailing={
              <>
                <DataTableViewOptions table={table} />
                <Button type="button" size="sm" className="h-8 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]" onClick={onAdd}>
                  <Plus className="size-3.5" />
                  New vehicle
                </Button>
              </>
            }
          />
        </DataTable>
      </div>

      <VehicleStatusDialog vehicle={statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)} />
    </>
  )
}
