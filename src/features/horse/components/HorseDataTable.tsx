import * as React from "react"
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable, type ColumnDef, type ColumnFiltersState } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

interface HorseDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  pageSize?: number
  toolbar?: React.ReactNode
  className?: string
}

export function HorseDataTable<TData, TValue>({ columns, data, filterColumn, filterPlaceholder = "Filter...", pageSize = 10, toolbar, className }: HorseDataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const table = useReactTable({ data, columns, state: { columnFilters }, initialState: { pagination: { pageSize } }, onColumnFiltersChange: setColumnFilters, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel() })
  const filter = filterColumn ? table.getColumn(filterColumn) : undefined

  return (
    <div className={cn("w-full space-y-4", className)}>
      {(filter || toolbar) && <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">{filter ? <Input className="flex-1 rounded-[2px]" placeholder={filterPlaceholder} value={(filter.getFilterValue() as string) ?? ""} onChange={(event) => filter.setFilterValue(event.target.value)} /> : null}{toolbar}</div>}
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => { const width = (header.column.columnDef.meta as { width?: string } | undefined)?.width; return <TableHead key={header.id} colSpan={header.colSpan} style={{ width: width ?? header.column.getSize() }} className={header.column.id === "horseName" ? "min-w-[280px]" : undefined}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead> })}</TableRow>)}</TableHeader>
          <TableBody>{table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <TableRow key={row.id}>{row.getVisibleCells().map((cell) => { const width = (cell.column.columnDef.meta as { width?: string } | undefined)?.width; return <TableCell key={cell.id} style={{ width: width ?? cell.column.getSize() }} className={cell.column.id === "horseName" ? "min-w-[280px]" : undefined}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell> })}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>}</TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button variant="outline" size="sm" className="rounded-[2px] bg-white" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
        {Array.from({ length: table.getPageCount() }, (_, pageIndex) => <Button key={pageIndex} variant="outline" size="sm" aria-current={table.getState().pagination.pageIndex === pageIndex ? "page" : undefined} data-current={table.getState().pagination.pageIndex === pageIndex} className="rounded-[2px] bg-white data-[current=true]:border-primary data-[current=true]:bg-primary data-[current=true]:text-primary-foreground" onClick={() => table.setPageIndex(pageIndex)}>{pageIndex + 1}</Button>)}
        <Button variant="outline" size="sm" className="rounded-[2px] bg-white" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
      </div>
    </div>
  )
}
