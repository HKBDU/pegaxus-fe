import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { INVOICE_ITEM_TYPE_LABELS } from "@/features/invoice/constants";
import type { InvoiceItem } from "@/features/invoice/types";
import { formatMoney } from "@/features/invoice/utils";
import { TablePagination } from "@/shared/components/common/TablePagination";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";

interface GeneratedLinesTableProps {
  items: InvoiceItem[];
  isLoading: boolean;
  /** Shown above the table: why there are no inputs and when the lines are rebuilt. */
  hint: string;
}

const DEFAULT_PAGE_SIZE = 5;

/**
 * Lines of a QUOTATION, DEPOSIT or FINAL: built by the server (IV1 while creating, the saved draft while editing), so
 * they are shown read-only. A deposit deduction is a normal negative row.
 *
 * Same data table as the transport request list: sortable headers, a column picker (View) and rows per page + page buttons.
 */
export function GeneratedLinesTable({
  items,
  isLoading,
  hint,
}: GeneratedLinesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const columns = useMemo<ColumnDef<InvoiceItem>[]>(
    () => [
      {
        id: "no",
        header: "",
        enableSorting: false,
        enableHiding: false,
        // `row.index` is the position in the server's list, so the number stays the same while the table is sorted.
        cell: ({ row }) => (
          <span className="text-gray-500">{row.index + 1}</span>
        ),
      },
      {
        id: "itemType",
        accessorFn: (item) => INVOICE_ITEM_TYPE_LABELS[item.itemType],
        header: "FEE TYPE",
        enableHiding: false,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "DESCRIPTION",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="m-0 font-medium text-gray-900">
              {row.original.description}
            </p>
            {row.original.isDepositDeduction ? (
              <p className="m-0 text-[11px] text-gray-500">
                Added from a paid deposit
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "QTY",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.quantity}</span>
        ),
      },
      {
        accessorKey: "price",
        header: "UNIT PRICE",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatMoney(row.original.price)}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: "AMOUNT",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium tabular-nums">
            {formatMoney(row.original.total)}
          </span>
        ),
      },
    ],
    [],
  );

  const pageCount = Math.max(1, Math.ceil(items.length / pagination.pageSize));
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1);

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      pagination: { pageIndex, pageSize: pagination.pageSize },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) =>
      setPagination((current) =>
        typeof updater === "function"
          ? updater({ pageIndex, pageSize: current.pageSize })
          : updater,
      ),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <section aria-label="Line items">
      <DataTable
        table={table}
        isLoading={isLoading}
        className="gap-2.5"
        containerClassName="booking-panel overflow-x-auto"
        tableClassName="min-w-[760px]"
        headerClassName="bg-[#e9e6de]"
        headerCellClassName="h-10 whitespace-nowrap px-2 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
        rowClassName="border-slate-200 hover:bg-amber-50/60"
        cellClassName="px-2 py-1.5 text-xs"
        emptyMessage="No lines yet."
        footer={
          items.length > 0 ? (
            <TablePagination
              meta={{
                totalItems: items.length,
                totalPages: pageCount,
                itemsPerPage: pagination.pageSize,
                currentPage: pageIndex + 1,
                hasPreviousPage: pageIndex > 0,
                hasNextPage: pageIndex < pageCount - 1,
              }}
              onPageChange={(page) =>
                setPagination((current) => ({
                  ...current,
                  pageIndex: page - 1,
                }))
              }
              onPageSizeChange={(pageSize) =>
                setPagination({ pageIndex: 0, pageSize })
              }
              pageSizeAriaLabel="Lines per page"
            />
          ) : null
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[11px] text-gray-500">{hint}</p>
          <DataTableViewOptions table={table} />
        </div>
      </DataTable>
    </section>
  );
}
