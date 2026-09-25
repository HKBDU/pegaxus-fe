import type { ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Pencil, Trash2, Eye } from "lucide-react"
import { DataTable } from "@/shared/components/ui/data-table"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { HORSE_SEX_LABELS } from "../constants/horse.constants"
import type { Horse, HorseTableProps } from "../types"

export function HorseTable({ horses, onAction, toolbar }: HorseTableProps) {
  const columns: ColumnDef<Horse>[] = [
    { accessorKey: "horseName", meta: { width: "20%" }, header: () => <span className="block text-left pl-5">Horse Name</span>, filterFn: (row, _columnId, value) => [row.original.horseName, row.original.microchipNumber].some((field) => field?.toLowerCase().includes(String(value).toLowerCase())), cell: ({ row }) => <span className="block pl-5 text-left font-semibold text-foreground">{row.original.horseName}</span> },
    { accessorKey: "sex", meta: { width: "20%" }, header: () => <span className="block text-left">Sex</span>, cell: ({ row }) => row.original.sex ? HORSE_SEX_LABELS[row.original.sex] : "—" },
    { accessorKey: "breed", meta: { width: "30%" }, header: () => <span className="block text-left">Breed</span>, cell: ({ row }) => row.original.breed ?? "—" },
    { accessorKey: "microchipNumber", meta: { width: "20%" }, header: () => <span className="block text-left">Microchip Number</span>, cell: ({ row }) => <code>{row.original.microchipNumber ?? "—"}</code> },
    {
      id: "actions", meta: { width: "10%" }, header: "", enableSorting: false, cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" className="horse-action-trigger" aria-label={`Actions for ${row.original.horseName}`}><MoreVertical /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => onAction(row.original, "view")}><Eye /> View details</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction(row.original, "edit")}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem  onSelect={() => onAction(row.original, "remove")}><Trash2 /> Remove</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return <DataTable columns={columns.map((column) => ({ ...column, enableSorting: false }))} data={horses} filterColumn="horseName" filterPlaceholder="Search by horse name or microchip..." pageSize={6} toolbar={toolbar} className="horse-data-table [&_table]:table-fixed" />
}
