import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState, type SortingState } from "@tanstack/react-table"
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"

import { formatBookingDate, formatBookingTime } from "@/features/booking/utils"
import { accountDetail, accountEdit } from "@/app/route-config"
import type { PaginationMeta } from "@/shared/types"
import { EmptyState, Pagination } from "@/shared/components/common"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { formatAccountLabel } from "../constants"
import type { EmployeeAccount, EmployeeListParams, EmployeeSort } from "../types"
import { UserAccountFilters } from "./UserAccountFilters"

interface UserAccountsTableProps {
  accounts: EmployeeAccount[]
  params: EmployeeListParams
  meta: PaginationMeta
  isLoading: boolean
  onParamsChange: (params: EmployeeListParams) => void
  onDelete: (account: EmployeeAccount) => void
}

export function UserAccountsTable({ accounts, params, meta, isLoading, onParamsChange, onDelete }: UserAccountsTableProps) {
  const navigate = useNavigate()
  const sorting: SortingState = params.sortBy.map((sort) => ({ id: sort.split(":")[0], desc: sort.endsWith(":desc") }))
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const columns = useMemo<ColumnDef<EmployeeAccount>[]>(() => [
    {
      id: "select", enableHiding: false,
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false} onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))} aria-label="Select all accounts on this page" className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white" />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))} aria-label={`Select ${row.original.fullName}`} className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white" />,
      enableSorting: false,
    },
    {
      accessorKey: "fullName", header: "EMPLOYEE",
      cell: ({ row }) => (
        <div className="flex min-w-36 items-center gap-2">
          <Avatar className="size-7 shrink-0 border border-slate-200">
            <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">{(row.original.fullName ?? "?").split(" ").map((word) => word[0]).slice(0, 2).join("")}</AvatarFallback>
          </Avatar>
          <span className="max-w-36 truncate font-semibold text-slate-900" title={row.original.fullName ?? undefined}>{row.original.fullName ?? "—"}</span>
        </div>
      ),
    },
    { accessorKey: "employeeCode", header: "EMPLOYEE CODE" },
    { accessorKey: "email", header: "EMAIL", enableSorting: false, cell: ({ row }) => <span className="block min-w-40 max-w-64 truncate" title={row.original.email}>{row.original.email}</span> },
    { accessorKey: "role", header: "ROLE", enableSorting: false, cell: ({ row }) => <Badge variant="secondary" className="rounded-[2px] px-1.5 py-0 text-[10px]">{formatAccountLabel(row.original.role)}</Badge> },
    {
      accessorKey: "accountStatus", header: "ACCOUNT STATUS", enableSorting: false,
      cell: ({ row }) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className={`size-1.5 rounded-full ${row.original.accountStatus === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />{formatAccountLabel(row.original.accountStatus)}</span>,
    },
    {
      accessorKey: "workingStatus", header: "WORKING STATUS", enableSorting: false,
      cell: ({ row }) => <Badge variant="outline" className="rounded-[2px] border-slate-200 px-1.5 py-0 text-[10px] text-slate-600">{formatAccountLabel(row.original.workingStatus)}</Badge>,
    },
    {
      accessorKey: "createdAt", header: "CREATED AT (UTC)",
      cell: ({ row }) => <div className="min-w-24 leading-tight"><span className="block text-slate-900">{formatBookingDate(row.original.createdAt)}</span><span className="mt-1 block text-[0.68rem] text-slate-400">{formatBookingTime(row.original.createdAt)}</span></div>,
    },
    {
      id: "actions", header: "ACTIONS", enableSorting: false, enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" aria-label={`Actions for ${row.original.fullName}`}><MoreVertical className="size-3.5 text-slate-500" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
            <DropdownMenuItem onSelect={() => navigate(accountDetail(row.original.employeeId))} className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"><Eye className="size-3.5" />View</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(accountEdit(row.original.employeeId))} className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"><Pencil className="size-3.5" />Edit</DropdownMenuItem>
            <DropdownMenuSeparator className="my-0.5" />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)} className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!"><Trash2 className="size-3.5" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [onDelete, navigate])

  const table = useReactTable({
    data: accounts, columns, state: { sorting, rowSelection },
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const sortBy = next.map(({ id, desc }) => `${id}:${desc ? "desc" : "asc"}` as EmployeeSort)
      onParamsChange({ ...params, sortBy: sortBy.length ? sortBy : ["createdAt:desc"], pageIndex: 1 })
    },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => String(row.employeeId),
    getCoreRowModel: getCoreRowModel(),
  })
  const first = meta.totalItems ? (meta.currentPage - 1) * meta.itemsPerPage + 1 : 0

  return (
    <DataTable
      table={table}
      isLoading={isLoading}
      containerClassName="booking-panel overflow-x-auto"
      headerClassName="bg-[#e9e6de]"
      headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
      rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60 data-[state=selected]:bg-amber-50"
      cellClassName="h-11 px-2.5 py-1.5 text-xs"
      emptyMessage={<EmptyState message="No user accounts found. Try adjusting your filters or search criteria." />}
      footer={
        <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Showing {first} to {Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems)} of {meta.totalItems} entries</p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap font-sans text-[11px] font-normal text-gray-500">Rows per page</span>
              <Select value={String(params.pageSize)} onValueChange={(value) => onParamsChange({ ...params, pageIndex: 1, pageSize: Number(value) })}>
                <SelectTrigger aria-label="Rows per page" className="h-7 w-12 gap-1 rounded-[2px] bg-white px-2 text-xs data-[size=default]:h-7"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={2} className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">{[5, 10, 20].map((size) => <SelectItem key={size} value={String(size)} className="h-7 rounded-[2px] text-xs">{size}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Pagination meta={meta} onPageChange={(pageIndex) => onParamsChange({ ...params, pageIndex })} />
          </div>
        </div>
      }
    ><UserAccountFilters filters={params} onChange={onParamsChange} viewOptions={<DataTableViewOptions table={table} />} /></DataTable>
  )
}
