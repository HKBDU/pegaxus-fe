import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { Eye, MoreVertical } from "lucide-react";
import { transportAudit } from "@/app/route-config";
import { TablePagination } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { codeLinkClassName } from "@/shared/components/ui/code-link";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { PaginationMeta } from "@/shared/types";
import type { TransportArchiveItem, TransportArchiveQuery } from "../types";
import { formatAuditDateTime } from "../utils";
import { TransportArchiveFilter } from "./TransportArchiveFilter";
import { TransportStatusBadge } from "./TransportStatusBadge";

const checkboxClass = "size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white";
const itemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]";

interface TransportArchiveTableProps {
  items: TransportArchiveItem[];
  meta: PaginationMeta;
  filters: TransportArchiveQuery;
  isLoading?: boolean;
  isFiltered?: boolean;
  onFiltersChange: (patch: Partial<TransportArchiveQuery>) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function TransportArchiveTable({
  items,
  meta,
  filters,
  isLoading,
  isFiltered,
  onFiltersChange,
  onPageChange,
  onPageSizeChange,
}: TransportArchiveTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  /** The audit page gets the list's filters back so "Back" returns to the same view. */
  function openAudit(item: TransportArchiveItem) {
    navigate(transportAudit(String(item.transportId)), {
      state: { transportArchiveList: filters, from: location.pathname + location.search },
    });
  }

  const columns = useMemo<ColumnDef<TransportArchiveItem>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: ({ table }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false
              }
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
              aria-label="Select all transports on this page"
              className={`${checkboxClass} data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white`}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
              aria-label={`Select ${row.original.transportCode}`}
              className={checkboxClass}
            />
          </div>
        ),
      },
      {
        accessorKey: "transportCode",
        enableHiding: false,
        header: "TRANSPORT CODE",
        cell: ({ row }) => (
          <button type="button" className={codeLinkClassName} onClick={() => openAudit(row.original)}>
            {row.original.transportCode}
          </button>
        ),
      },
      {
        accessorKey: "bookingCode",
        header: "BOOKING CODE",
        cell: ({ row }) => <span className="text-slate-700">{row.original.bookingCode ?? "—"}</span>,
      },
      {
        accessorKey: "customerName",
        header: "CUSTOMER",
        cell: ({ row }) => <span className="text-slate-700">{row.original.customerName ?? "—"}</span>,
      },
      {
        accessorKey: "horseCount",
        header: () => <span className="block w-full text-center">HORSES</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block text-center font-semibold text-slate-900">{row.original.horseCount ?? 0}</span>
        ),
      },
      {
        accessorKey: "completedAt",
        header: "COMPLETED AT",
        cell: ({ row }) => <span className="block text-slate-900">{formatAuditDateTime(row.original.completedAt)}</span>,
      },
      {
        accessorKey: "status",
        header: () => <span className="block w-full text-center">STATUS</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <TransportStatusBadge status={row.original.status} />
          </div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="block w-full text-center">ACTIONS</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95"
                  variant="ghost"
                  aria-label={`Actions for ${row.original.transportCode}`}
                >
                  <MoreVertical className="size-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={2}
                className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md"
              >
                <DropdownMenuItem className={itemClass} onSelect={() => openAudit(row.original)}>
                  <Eye className="size-3.5 text-slate-600" />
                  View audit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // openAudit only reads the router location and the filters
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, location.pathname, location.search, navigate],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (row) => String(row.transportId),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="booking-page-enter [animation-delay:100ms]">
      <DataTable
        table={table}
        isLoading={isLoading}
        className="gap-2.5"
        containerClassName="booking-panel overflow-x-auto"
        headerClassName="bg-[#e9e6de]"
        headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
        rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
        cellClassName="h-11 px-2.5 py-1.5 text-xs"
        emptyMessage={isFiltered ? "No completed transports match your filters." : "No completed transports found."}
        footer={
          <TablePagination
            meta={meta}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeAriaLabel="Archive page size"
          />
        }
      >
        <TransportArchiveFilter
          value={filters}
          onChange={onFiltersChange}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </DataTable>
    </div>
  );
}
