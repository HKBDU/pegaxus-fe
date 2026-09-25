import type { ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Pencil, Trash2, Eye } from "lucide-react"
import { DataTable } from "@/shared/components/ui/data-table"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { HORSE_SEX_LABELS } from "../constants/horse.constants"
import type { Horse, HorseTableProps } from "../types"

export function HorseTable({ horses, onAction, toolbar }: HorseTableProps) {
  const columns: ColumnDef<Horse>[] = [
    { accessorKey: "horseName", header: "Horse Name", filterFn: (row, _columnId, value) => [row.original.horseName, row.original.passportNumber, row.original.microchipNumber].some((field) => field?.toLowerCase().includes(String(value).toLowerCase())), cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.horseName}</span> },
    { accessorKey: "sex", header: "Sex", cell: ({ row }) => <span className="block text-center">{row.original.sex ? HORSE_SEX_LABELS[row.original.sex] : "—"}</span> },
    { accessorKey: "breed", header: "Breed", cell: ({ row }) => row.original.breed ?? "—" },
    { accessorKey: "dateOfBirth", header: () => <span className="block text-center">Date of Birth</span>, cell: ({ row }) => <span className="block text-center">{row.original.dateOfBirth ?? "—"}</span> },
    { accessorKey: "countryOfOrigin", header: "Country of Origin", cell: ({ row }) => row.original.countryOfOrigin ?? "—" },
    { accessorKey: "passportNumber", header: () => <span className="block text-center">Passport Number</span>, cell: ({ row }) => <code className="block text-center">{row.original.passportNumber ?? "—"}</code> },
    { accessorKey: "microchipNumber", header: () => <span className="block text-center">Microchip Number</span>, cell: ({ row }) => <code className="block text-center">{row.original.microchipNumber ?? "—"}</code> },
    {
      id: "actions", header: "", enableSorting: false, cell: ({ row }) => (
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

  return <DataTable columns={columns.map((column) => ({ ...column, enableSorting: false }))} data={horses} filterColumn="horseName" filterPlaceholder="Search by horse name, passport, microchip..." pageSize={6} toolbar={toolbar} className="horse-data-table" />
}
