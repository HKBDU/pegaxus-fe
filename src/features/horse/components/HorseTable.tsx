import { useMemo, useState } from "react"
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { MoreVertical, Pencil, Trash2, Eye, Search, X } from "lucide-react"

import { Pagination } from "@/shared/components/common/Pagination"
import { PageSizeSelect } from "@/shared/components/common/PageSizeSelect"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { HORSE_SEX_LABELS } from "../constants/horse.constants"
import type { Horse, HorseTableProps } from "../types"

export function HorseTable({ horses, onAction, toolbar, addAction }: HorseTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo<ColumnDef<Horse>[]>(
    () => [
      { accessorKey: "microchipNumber", header: "MICROCHIP NUMBER", enableSorting: false, cell: ({ row }) => <span className="font-mono text-xs text-slate-700">{row.original.microchipNumber ?? "—"}</span> },
      {
        accessorKey: "horseName",
        header: "HORSE NAME",
        enableSorting: false,
        filterFn: (row, _columnId, value) => [row.original.horseName, row.original.microchipNumber].some((field) => field?.toLowerCase().includes(String(value).toLowerCase())),
        cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.horseName}</span>,
      },
      { accessorKey: "sex", header: "SEX", enableSorting: false, cell: ({ row }) => row.original.sex ? HORSE_SEX_LABELS[row.original.sex] : "—" },
      { accessorKey: "breed", header: "BREED", enableSorting: false, cell: ({ row }) => row.original.breed ?? "—" },
      {
        id: "actions",
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="size-7 rounded-[2px] p-0" aria-label={`Actions for ${row.original.horseName}`}><MoreVertical className="size-3.5 text-slate-500" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-36 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={() => onAction(row.original, "view")}><Eye className="size-3.5 text-slate-600" /> View details</DropdownMenuItem>
                <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={() => onAction(row.original, "edit")}><Pencil className="size-3.5 text-amber-600" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator className="my-0.5" />
                <DropdownMenuItem variant="destructive" className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={() => onAction(row.original, "remove")}><Trash2 className="size-3.5" /> Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onAction],
  )

  const table = useReactTable({
    data: horses,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    initialState: { pagination: { pageSize: 5 } },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const searchColumn = table.getColumn("horseName")
  const searchValue = String(searchColumn?.getFilterValue() ?? "")
  const filteredRows = table.getFilteredRowModel().rows
  const pageSize = table.getState().pagination.pageSize
  const firstItem = filteredRows.length === 0 ? 0 : table.getState().pagination.pageIndex * pageSize + 1
  const lastItem = Math.min((table.getState().pagination.pageIndex + 1) * pageSize, filteredRows.length)
  const paginationMeta = {
    totalItems: filteredRows.length,
    totalPages: table.getPageCount(),
    itemsPerPage: pageSize,
    currentPage: table.getState().pagination.pageIndex + 1,
    hasPreviousPage: table.getCanPreviousPage(),
    hasNextPage: table.getCanNextPage(),
  }

  return (
    <div className="booking-page-enter [animation-delay:100ms]">
      <DataTable
        table={table}
        tableClassName="table-fixed"
        className="gap-2.5"
        containerClassName="booking-panel overflow-x-auto"
        headerClassName="bg-[#e9e6de]"
        headerCellClassName="h-11 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
        rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
        cellClassName="h-11 max-w-0 overflow-hidden text-ellipsis whitespace-nowrap px-2.5 py-1.5 text-xs"
        emptyMessage="No horses match the current filters."
        footer={
        <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Showing {firstItem} to {lastItem} of {filteredRows.length} entries</p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <PageSizeSelect value={pageSize} onValueChange={(value) => table.setPageSize(value)} />
            <Pagination meta={paginationMeta} onPageChange={(page) => table.setPageIndex(page - 1)} />
          </div>
        </div>
        }
      >
        <div role="toolbar" className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(17rem,1fr)_9rem_9rem_9.5rem_auto_auto]">
        {searchColumn ? <div className="relative col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search horses" placeholder="Search horse name or microchip" spellCheck={false} className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20" value={searchValue} onChange={(event) => searchColumn.setFilterValue(event.target.value)} />
          {searchValue ? <button type="button" aria-label="Clear search" onClick={() => searchColumn.setFilterValue("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="size-3.5" /></button> : null}
        </div> : null}
        {toolbar}
        <DataTableViewOptions table={table} />
        {addAction}
        </div>
      </DataTable>
    </div>
  )
}
