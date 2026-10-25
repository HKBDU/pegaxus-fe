import { useMemo, useState } from "react"
import { getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table"
import { Eye, MoreVertical } from "lucide-react"
import { ClaimFilters } from "@/features/claim/components/ClaimFilters"
import { ClaimStatusBadge, ClaimTypeBadge } from "@/features/claim/components/ClaimPrimitives"
import type { ClaimListItem, ClaimQueryParams } from "@/features/claim/types"
import { formatInvoiceDateTime, formatMoney } from "@/features/invoice/utils"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import type { PaginationMeta } from "@/shared/types"

const amount = (value: number | null) => (value == null ? "—" : formatMoney(value))
const checkboxClass = "size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"

interface ClaimTableProps {
  items: ClaimListItem[]
  meta: PaginationMeta
  isLoading: boolean
  filtered: boolean
  params: ClaimQueryParams
  search: string
  onSearchChange: (search: string) => void
  onFilterChange: (patch: Partial<ClaimQueryParams>) => void
  onOpen: (claimId: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

/** screen §10A, laid out like the Transport Requests table (same DataTable, header, rows and toolbar). */
export function ClaimTable({ items, meta, isLoading, filtered, params, search, onSearchChange, onFilterChange, onOpen, onPageChange, onPageSizeChange }: ClaimTableProps) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const columns = useMemo<ColumnDef<ClaimListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
              aria-label="Select all claims on this page"
              className={`${checkboxClass} data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white`}
            />
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
            <Checkbox checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))} aria-label={`Select ${row.original.claimCode}`} className={checkboxClass} />
          </div>
        ),
      },
      {
        accessorKey: "claimCode",
        enableHiding: false,
        header: "CLAIM CODE",
        cell: ({ row }) => <span className="font-semibold text-slate-900">{row.original.claimCode}</span>,
      },
      { accessorKey: "bookingCode", header: "BOOKING CODE" },
      { accessorKey: "customerName", header: "CUSTOMER", cell: ({ row }) => <span className="block max-w-32 truncate">{row.original.customerName}</span> },
      { accessorKey: "claimType", header: "CLAIM TYPE", cell: ({ row }) => <ClaimTypeBadge type={row.original.claimType} /> },
      { accessorKey: "status", header: "STATUS", cell: ({ row }) => <ClaimStatusBadge status={row.original.status} /> },
      {
        accessorKey: "requestedCompensationAmount",
        header: () => <span className="block w-full text-right">REQUESTED</span>,
        cell: ({ row }) => <span className="block text-right tabular-nums">{amount(row.original.requestedCompensationAmount)}</span>,
      },
      {
        accessorKey: "approvedCompensationAmount",
        header: () => <span className="block w-full text-right">APPROVED</span>,
        cell: ({ row }) => <span className="block text-right tabular-nums">{amount(row.original.approvedCompensationAmount)}</span>,
      },
      {
        accessorKey: "submittedAt",
        header: "SUBMITTED AT",
        cell: ({ row }) => <span className="whitespace-nowrap text-slate-900">{formatInvoiceDateTime(row.original.submittedAt)}</span>,
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        cell: ({ row }) => (
          <div className="flex justify-center" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${row.original.claimCode}`}>
                  <MoreVertical className="size-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={() => onOpen(row.original.claimId)}>
                  <Eye className="size-3.5 text-slate-600" />
                  View &amp; process
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onOpen],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    // The list is ordered by the server ("Sort" in the toolbar), so the headers are not sortable.
    enableSorting: false,
    getRowId: (row) => row.claimId,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="booking-page-enter [animation-delay:100ms]" aria-busy={isLoading}>
      <DataTable
        table={table}
        isLoading={isLoading}
        className="gap-2.5"
        containerClassName="booking-panel overflow-x-auto"
        headerClassName="bg-[#e9e6de]"
        headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
        rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
        cellClassName="h-11 px-2.5 py-1.5 text-xs"
        emptyMessage={filtered ? "No claims match these filters." : "No claims have been submitted yet."}
        onRowClick={(row) => onOpen(row.original.claimId)}
        footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} pageSizeAriaLabel="Claims per page" />}
      >
        <ClaimFilters params={params} search={search} onSearchChange={onSearchChange} onChange={onFilterChange} viewOptions={<DataTableViewOptions table={table} />} />
      </DataTable>
    </div>
  )
}

