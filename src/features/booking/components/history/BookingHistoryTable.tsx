import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/ui/data-table";
import { EmptyState, Pagination } from "@/shared/components/common";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import type { BookingHistoryItem } from "../../history/schema";
import { bookingHistoryColumns } from "./booking-history-columns";

const pageSize = 6;

interface BookingHistoryTableProps {
  rows: BookingHistoryItem[];
  hasHistory: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function BookingHistoryTable({
  rows,
  hasHistory,
  page,
  onPageChange,
}: BookingHistoryTableProps) {
  const pageCount = Math.ceil(rows.length / pageSize);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const firstIndex = (currentPage - 1) * pageSize;
  const table = useReactTable({
    data: rows.slice(firstIndex, firstIndex + pageSize),
    columns: bookingHistoryColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        message={
          hasHistory
            ? "No history entries match the selected filters."
            : "No booking history found."
        }
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="min-w-0 space-y-3">
        <DataTable
          table={table}
          className="pegaxus-scrollbar min-w-0"
          containerClassName="rounded-none border-[#dfc9b6]"
          tableClassName="min-w-[880px] table-fixed bg-white [&_th:nth-child(1)]:w-[11%] [&_th:nth-child(2)]:w-[12%] [&_th:nth-child(3)]:w-[13%] [&_th:nth-child(4)]:w-[26%] [&_th:nth-child(5)]:w-[20%] [&_th:nth-child(6)]:w-[18%]"
          headerCellClassName="h-9 px-2 text-[11px] font-bold text-neutral-900 uppercase"
          cellClassName="px-2 py-2 text-xs"
          rowClassName="border-[#dfc9b6]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
          <p role="status">
            Showing {firstIndex + 1} to{" "}
            {Math.min(firstIndex + pageSize, rows.length)} of {rows.length}{" "}
            entries
          </p>
          <Pagination
            meta={{
              totalItems: rows.length,
              totalPages: pageCount,
              itemsPerPage: pageSize,
              currentPage,
              hasPreviousPage: currentPage > 1,
              hasNextPage: currentPage < pageCount,
            }}
            onPageChange={onPageChange}
            className="flex-wrap text-xs [&_button]:h-7 [&_button]:min-w-7 [&_button]:px-2 [&_button]:py-1 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-ring"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
