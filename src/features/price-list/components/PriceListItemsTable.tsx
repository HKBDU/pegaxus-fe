import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"

import { PRICE_LIST_ITEM_TYPE_LABELS, PRICE_LIST_UNIT_LABELS, ALL_TIERS_LABEL } from "@/features/price-list/constants"
import { PriceListItemsToolbar } from "@/features/price-list/components/PriceListItemsToolbar"
import { usePriceListItemsTable } from "@/features/price-list/hooks/usePriceListItemsTable"
import type { PriceListItem } from "@/features/price-list/types"
import { formatAmount } from "@/features/price-list/utils"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { codeLinkClassName } from "@/shared/components/ui/code-link"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { formatUtcDate, formatUtcTime } from "@/shared/utils/datetime"

interface PriceListItemsTableProps {
  items: PriceListItem[]
  currency: string
  /** The active list is locked: lines can be edited (within limits) but not deleted or added. */
  isActive: boolean
  onEdit: (item: PriceListItem) => void
  onDelete: (item: PriceListItem) => void
  onAdd?: () => void
}

interface RowActionsProps {
  item: PriceListItem
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}

function RowActions({ item, canDelete, onEdit, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${item.itemCode}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={onEdit}>
          <Pencil className="size-3.5 text-amber-600" />
          Edit line
        </DropdownMenuItem>
        {canDelete ? (
          <>
            <DropdownMenuSeparator className="my-0.5" />
            <DropdownMenuItem
              variant="destructive"
              className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!"
              onSelect={onDelete}
            >
              <Trash2 className="size-3.5" />
              Delete line
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The lines of one price list, built like the transport request table: shared DataTable, sortable columns,
 * row selection, column picker, a row menu and a toolbar. It only shows data; the page decides what Edit and Delete do.
 */
export function PriceListItemsTable({ items, currency, isActive, onEdit, onDelete, onAdd }: PriceListItemsTableProps) {
  const columns = useMemo<ColumnDef<PriceListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
              aria-label="Select all price lines"
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
              aria-label={`Select ${row.original.itemCode}`}
              className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"
            />
          </div>
        ),
      },
      {
        accessorKey: "itemCode",
        enableHiding: false,
        header: "CODE",
        cell: ({ row }) => (
          <button type="button" className={`${codeLinkClassName} font-mono`} onClick={() => onEdit(row.original)}>
            {row.original.itemCode}
          </button>
        ),
      },
      { accessorKey: "itemName", header: "NAME", cell: ({ row }) => <span className="block min-w-48 text-slate-900">{row.original.itemName}</span> },
      {
        accessorKey: "itemType",
        header: "TYPE",
        cell: ({ row }) => <span className="block whitespace-nowrap text-slate-700">{PRICE_LIST_ITEM_TYPE_LABELS[row.original.itemType]}</span>,
      },
      {
        accessorKey: "unit",
        header: "UNIT",
        cell: ({ row }) => <span className="block whitespace-nowrap text-slate-700">{PRICE_LIST_UNIT_LABELS[row.original.unit]}</span>,
      },
      {
        accessorKey: "unitPrice",
        header: `UNIT PRICE (${currency})`,
        meta: { align: "right" },
        cell: ({ row }) => <span className="block font-semibold tabular-nums text-slate-900">{formatAmount(row.original.unitPrice)}</span>,
      },
      {
        accessorKey: "vehicleTier",
        header: () => <span className="block w-full text-center">TIER</span>,
        // Lines for every tier have no tier: they sort after S, M and L.
        sortingFn: (a, b) => (a.original.vehicleTier ?? "~").localeCompare(b.original.vehicleTier ?? "~"),
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.original.vehicleTier ? (
              <Badge className="inline-flex h-5 w-fit items-center rounded-full border-amber-300 bg-amber-50 px-2 py-0 text-[0.65rem] font-medium leading-none text-amber-800">
                {row.original.vehicleTier}
              </Badge>
            ) : (
              <span className="text-slate-500">{ALL_TIERS_LABEL}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "sortOrder",
        header: () => <span className="block w-full text-center">ORDER</span>,
        cell: ({ row }) => <span className="block text-center tabular-nums text-slate-900">{row.original.sortOrder}</span>,
      },
      {
        accessorKey: "updatedAt",
        header: "UPDATED AT",
        // `updatedAt` is the raw BE string; ISO strings with one offset sort correctly as text.
        sortingFn: "alphanumeric",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-slate-900">{formatUtcDate(row.original.updatedAt)}</span>
            <span className="mt-1 block text-[0.68rem] text-slate-400">{formatUtcTime(row.original.updatedAt)}</span>
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
            <RowActions item={row.original} canDelete={!isActive} onEdit={() => onEdit(row.original)} onDelete={() => onDelete(row.original)} />
          </div>
        ),
      },
    ],
    [currency, isActive, onEdit, onDelete],
  )

  const { table, search, setSearch, tier, setTier, type, setType, isFiltered } = usePriceListItemsTable({ items, columns })

  return (
    <DataTable
      table={table}
      className="gap-2.5"
      containerClassName="booking-panel overflow-x-auto"
      headerClassName="bg-[#e9e6de]"
      headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
      rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
      cellClassName="h-11 px-2.5 py-1.5 text-xs"
      emptyMessage={items.length === 0 ? "No price lines yet. Add the first line." : isFiltered ? "No price lines match the current filters." : "No price lines."}
    >
      <PriceListItemsToolbar
        search={search}
        tier={tier}
        type={type}
        onSearchChange={setSearch}
        onTierChange={setTier}
        onTypeChange={setType}
        viewOptions={<DataTableViewOptions table={table} />}
        onAdd={!isActive ? onAdd : undefined}
      />
    </DataTable>
  )
}
