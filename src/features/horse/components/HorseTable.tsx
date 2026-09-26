import { useMemo, useState } from "react"
import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"
import { MoreVertical, Pencil, Trash2, Eye } from "lucide-react"

import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { HORSE_SEX_LABELS } from "../constants/horse.constants"
import type { Horse, HorseTableProps } from "../types"

export function HorseTable({ horses, onAction, toolbar }: HorseTableProps) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const columns = useMemo<ColumnDef<Horse>[]>(
    () => [
      {
        accessorKey: "horseName",
        header: "HORSE NAME",
        enableSorting: false,
        filterFn: (row, _columnId, value) => [row.original.horseName, row.original.microchipNumber].some((field) => field?.toLowerCase().includes(String(value).toLowerCase())),
        cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.horseName}</span>,
      },
      { accessorKey: "sex", header: "SEX", enableSorting: false, cell: ({ row }) => row.original.sex ? HORSE_SEX_LABELS[row.original.sex] : "—" },
      { accessorKey: "breed", header: "BREED", enableSorting: false, cell: ({ row }) => row.original.breed ?? "—" },
      { accessorKey: "microchipNumber", header: "MICROCHIP NUMBER", enableSorting: false, cell: ({ row }) => <code>{row.original.microchipNumber ?? "—"}</code> },
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
    initialState: { pagination: { pageSize: 6 } },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const searchColumn = table.getColumn("horseName")

  return (
    <DataTable
      table={table}
      className="gap-2.5"
      containerClassName="overflow-x-auto"
      headerClassName="bg-[#e9e6de]"
      headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
      rowClassName="border-slate-200 hover:bg-amber-50/60"
      cellClassName="h-11 px-2.5 py-1.5 text-xs"
      emptyMessage="No horses match the current filters."
      footer={
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" className="rounded-[2px] bg-white" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          {Array.from({ length: table.getPageCount() }, (_, pageIndex) => <Button key={pageIndex} variant="outline" size="sm" aria-current={table.getState().pagination.pageIndex === pageIndex ? "page" : undefined} data-current={table.getState().pagination.pageIndex === pageIndex} className="rounded-[2px] bg-white data-[current=true]:border-primary data-[current=true]:bg-primary data-[current=true]:text-primary-foreground" onClick={() => table.setPageIndex(pageIndex)}>{pageIndex + 1}</Button>)}
          <Button variant="outline" size="sm" className="rounded-[2px] bg-white" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {searchColumn ? <Input className="h-8 flex-1 rounded-[2px] bg-white text-xs" placeholder="Search by horse name or microchip..." value={(searchColumn.getFilterValue() as string) ?? ""} onChange={(event) => searchColumn.setFilterValue(event.target.value)} /> : null}
        {toolbar}
        <DataTableViewOptions table={table} />
      </div>
    </DataTable>
  )
}
