import * as React from "react"
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>
  isLoading?: boolean
  footer?: React.ReactNode
  containerClassName?: string
  tableClassName?: string
  headerClassName?: string
  headerCellClassName?: string
  rowClassName?: string
  cellClassName?: string
  emptyMessage?: React.ReactNode
}

export function DataTable<TData>({
  table,
  isLoading = false,
  footer,
  children,
  className,
  containerClassName,
  tableClassName,
  headerClassName,
  headerCellClassName,
  rowClassName,
  cellClassName,
  emptyMessage = "No bookings match the current filters.",
  ...props
}: DataTableProps<TData>) {
  return (
    <div className={cn("flex w-full flex-col gap-2.5", className)} {...props}>
      {children}

      <div className={cn("overflow-hidden rounded-[2px] border bg-white", containerClassName)}>
        <Table className={tableClassName}>
          <TableHeader className={cn("[&_tr]:border-b-0!", headerClassName)}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-0! hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()

                  return (
                    <TableHead key={header.id} colSpan={header.colSpan} className={headerCellClassName}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="-ml-1.5 inline-flex h-7 items-center gap-1 rounded-[2px] px-1.5 text-left hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <span className="text-[0.6rem] text-slate-400" aria-hidden="true">
                            {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : "↕"}
                          </span>
                        </button>
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
            {isLoading ? (
              Array.from({ length: 5 }, (_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                  {table.getVisibleLeafColumns().map((column) => (
                    <TableCell key={column.id} className={cellClassName}>
                      <Skeleton className="h-3.5 w-full rounded-none bg-slate-100" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(row.index % 2 === 0 ? "bg-white" : "bg-[#f7f6f3]", rowClassName)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center text-sm text-slate-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {footer}
    </div>
  )
}
