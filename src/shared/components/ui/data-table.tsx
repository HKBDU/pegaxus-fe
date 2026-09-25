import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { cn } from "@/lib/utils"

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterColumn?: string
  filterPlaceholder?: string
  pageSize?: number
  toolbar?: React.ReactNode
  className?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn,
  filterPlaceholder = "Filter...",
  pageSize = 10,
  toolbar,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageSize } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const filter = filterColumn ? table.getColumn(filterColumn) : undefined

  return (
    <div className={cn("w-full space-y-4", className)}>
      {(filter || toolbar) && <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        {filter && <Input className="flex-1 rounded-[2px]" placeholder={filterPlaceholder} value={(filter.getFilterValue() as string) ?? ""} onChange={(event) => filter.setFilterValue(event.target.value)} />}
        {toolbar}
      </div>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp />
                          ) : sorted === "desc" ? (
                            <ArrowDown />
                          ) : (
                            <ChevronsUpDown />
                          )}
                        </Button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-1">
        <Button
          variant="outline"
          size="sm"
          className="rounded-[2px] border-[hsl(var(--border))] bg-white text-foreground hover:bg-white hover:text-foreground"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        {Array.from({ length: table.getPageCount() }, (_, pageIndex) => (
          <Button
            key={pageIndex}
            variant="outline"
            size="sm"
            aria-current={table.getState().pagination.pageIndex === pageIndex ? "page" : undefined}
            data-current={table.getState().pagination.pageIndex === pageIndex}
            className="rounded-[2px] border-[hsl(var(--border))] bg-white text-foreground hover:bg-white hover:text-foreground data-[current=true]:border-primary data-[current=true]:bg-primary data-[current=true]:text-primary-foreground data-[current=true]:hover:bg-primary"
            onClick={() => table.setPageIndex(pageIndex)}
          >
            {pageIndex + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="rounded-[2px] border-[hsl(var(--border))] bg-white text-foreground hover:bg-white hover:text-foreground"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
