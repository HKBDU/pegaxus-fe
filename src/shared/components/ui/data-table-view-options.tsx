import { useMemo } from "react"
import type { Table } from "@tanstack/react-table"
import { Check, ChevronDown } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const columns = useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-2.5 font-sans text-xs font-normal normal-case tracking-normal shadow-none">
          Columns
          <ChevronDown className="ml-1 size-3.5 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={2} className="w-44 rounded-[2px] border-slate-200 bg-white p-1 shadow-md">
        <p className="px-1.5 pb-1 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">Toggle columns</p>
        <div className="grid gap-0.5">
          {columns.map((column) => {
            const header = column.columnDef.header
            const fallbackLabels: Record<string, string> = { select: "SELECT", actions: "ACTIONS" }
            const label = typeof header === "string" ? header : (fallbackLabels[column.id] ?? column.id.toUpperCase())

            return (
              <button
                type="button"
                key={column.id}
                onClick={() => column.toggleVisibility(!column.getIsVisible())}
                className="flex w-full cursor-pointer items-center rounded-[2px] px-1.5 py-1 text-left text-[0.7rem] text-slate-700 hover:bg-amber-50"
              >
                <span className="truncate">{label}</span>
                <Check className={`ml-auto size-3.5 text-amber-600 ${column.getIsVisible() ? "opacity-100" : "opacity-0"}`} />
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
