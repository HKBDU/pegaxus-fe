import { DataTable } from "@/shared/components/ui/data-table";
import { EmptyState, Pagination } from "@/shared/components/common";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import type { BookingHistoryItem } from "../../schemas/booking-history.schema";
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

  const pageCount = Math.ceil(rows.length / pageSize);
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * pageSize;

  return (
    <TooltipProvider>
      <div className="min-w-0 space-y-3">
        <DataTable
          columns={bookingHistoryColumns}
          data={rows.slice(firstIndex, firstIndex + pageSize)}
          pageSize={pageSize}
          className="min-w-0 [&>div:first-child]:rounded-none [&>div:first-child]:border-[#dfc9b6] [&>div:last-child]:hidden [&_table]:min-w-[1000px] [&_table]:bg-white [&_thead_th]:h-10 [&_thead_th]:px-3 [&_thead_th]:text-xs [&_thead_th]:font-bold [&_thead_th]:text-neutral-900 [&_thead_th]:uppercase [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-sm [&_tbody_tr]:border-[#dfc9b6] [&_tbody_tr:nth-child(odd)]:bg-neutral-100"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600">
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
            className="flex-wrap text-xs [&_button]:h-8 [&_button]:min-w-8 [&_button]:px-2 [&_button]:py-1 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-ring"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
