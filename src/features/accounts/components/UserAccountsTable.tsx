import { useMemo, useState, type ReactNode } from "react"
import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type PaginationState, type RowSelectionState, type SortingState } from "@tanstack/react-table"
import { CircleCheck, CircleX, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react"

import { formatBookingDate, formatBookingTime } from "@/features/booking/utils"
import { ACCOUNT_TYPE_LABELS, EMAIL_VERIFICATION_LABELS } from "@/features/profile/constants/profile.constants"
import { EmptyState, Pagination } from "@/shared/components/common"
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { formatAccountLabel, type UserAccountRow } from "../mock-data"

interface UserAccountsTableProps {
  accounts: UserAccountRow[]
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  onDelete: (account: UserAccountRow) => void
  children: ReactNode
}

export function UserAccountsTable({ accounts, pagination, onPaginationChange, onDelete, children }: UserAccountsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const columns = useMemo<ColumnDef<UserAccountRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false} onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))} aria-label="Select all accounts on this page" className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white" />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))} aria-label={`Select ${row.original.fullName}`} className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white" />,
      enableSorting: false,
    },
    {
      accessorKey: "fullName", header: "FULL NAME",
      cell: ({ row }) => (
        <div className="flex min-w-36 items-center gap-2">
          <Avatar className="size-7 shrink-0 border border-slate-200">
            <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600">{row.original.fullName.split(" ").map((word) => word[0]).slice(0, 2).join("")}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-slate-900">{row.original.fullName}</span>
        </div>
      ),
    },
    { accessorKey: "email", header: "EMAIL", enableSorting: false },
    { accessorKey: "role", header: "ROLE", enableSorting: false, cell: ({ row }) => <Badge variant="secondary" className="rounded-[2px] px-1.5 py-0 text-[10px]">{formatAccountLabel(row.original.role)}</Badge> },
    { accessorKey: "accountType", header: "ACCOUNT TYPE", enableSorting: false, cell: ({ row }) => <Badge variant="outline" className="rounded-[2px] border-slate-200 px-1.5 py-0 text-[10px] text-slate-600">{ACCOUNT_TYPE_LABELS[row.original.accountType]}</Badge> },
    {
      accessorKey: "status", header: "STATUS", enableSorting: false,
      cell: ({ row }) => <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><span aria-hidden="true" className={`size-1.5 rounded-full ${row.original.status === "ACTIVE" ? "bg-emerald-500" : row.original.status === "SUSPENDED" ? "bg-red-500" : "bg-slate-400"}`} />{formatAccountLabel(row.original.status)}</span>,
    },
    {
      accessorKey: "updatedAt", header: "LAST UPDATED (UTC)",
      cell: ({ row }) => <div className="min-w-24 leading-tight"><span className="block text-slate-900">{formatBookingDate(row.original.updatedAt)}</span><span className="mt-1 block text-[0.68rem] text-slate-400">{formatBookingTime(row.original.updatedAt)}</span></div>,
    },
    {
      id: "actions", header: "ACTIONS", enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" aria-label={`Actions for ${row.original.fullName}`}><MoreVertical className="size-3.5 text-slate-500" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
            <DropdownMenuItem disabled className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"><Eye className="size-3.5" />View (coming soon)</DropdownMenuItem>
            <DropdownMenuItem disabled className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"><Pencil className="size-3.5" />Edit (coming soon)</DropdownMenuItem>
            <DropdownMenuSeparator className="my-0.5" />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)} className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!"><Trash2 className="size-3.5" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [onDelete])

  const table = useReactTable({
    data: accounts, columns, state: { sorting, rowSelection, pagination },
    onSortingChange: (updater) => {
      setSorting(updater)
      onPaginationChange({ ...pagination, pageIndex: 0 })
    },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => onPaginationChange(typeof updater === "function" ? updater(pagination) : updater),
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  })
  const currentPage = pagination.pageIndex + 1
  const totalPages = Math.ceil(accounts.length / pagination.pageSize)

  return (
    <DataTable
      table={table}
      containerClassName="booking-panel overflow-x-auto"
      headerClassName="bg-[#e9e6de]"
      headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
      rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60 data-[state=selected]:bg-amber-50"
      cellClassName="h-11 px-2.5 py-1.5 text-xs"
      emptyMessage={<EmptyState message="No user accounts found. Try adjusting your filters or search criteria." />}
      footer={
        <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Showing {accounts.length ? pagination.pageIndex * pagination.pageSize + 1 : 0} to {Math.min(currentPage * pagination.pageSize, accounts.length)} of {accounts.length} entries</p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap font-sans text-[11px] font-normal text-gray-500">Rows per page</span>
              <Select value={String(pagination.pageSize)} onValueChange={(value) => onPaginationChange({ pageIndex: 0, pageSize: Number(value) })}>
                <SelectTrigger aria-label="Rows per page" className="h-7 w-12 gap-1 rounded-[2px] bg-white px-2 text-xs data-[size=default]:h-7"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" align="end" sideOffset={2} className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">{[5, 10, 20].map((size) => <SelectItem key={size} value={String(size)} className="h-7 rounded-[2px] text-xs">{size}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Pagination meta={{ currentPage, totalPages, totalItems: accounts.length, itemsPerPage: pagination.pageSize, hasPreviousPage: currentPage > 1, hasNextPage: currentPage < totalPages }} onPageChange={(page) => onPaginationChange({ ...pagination, pageIndex: page - 1 })} />
          </div>
        </div>
      }
    >{children}</DataTable>
  )
}
