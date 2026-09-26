import { useState, type ReactNode } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/ui/data-table";
import { EmptyState, Pagination } from "@/shared/components/common";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { BookingHistoryItem } from "../../history/schema";
import { bookingHistoryColumns } from "./booking-history-columns";

interface BookingHistoryTableProps {
  rows: BookingHistoryItem[];
  hasHistory: boolean;
  page: number;
  onPageChange: (page: number) => void;
  toolbar?: (viewOptions: ReactNode) => ReactNode;
}

export function BookingHistoryTable({
  rows,
  hasHistory,
  page,
  onPageChange,
  toolbar,
}: BookingHistoryTableProps) {
  const [pageSize, setPageSize] = useState(5);
  const pageCount = Math.ceil(rows.length / pageSize);
  const currentPage = Math.min(page, Math.max(pageCount, 1));
  const firstIndex = (currentPage - 1) * pageSize;
  const table = useReactTable({
    data: rows.slice(firstIndex, firstIndex + pageSize),
    columns: bookingHistoryColumns,
    getRowId: (row) => row.historyId,
    getCoreRowModel: getCoreRowModel(),
  });

  const viewOptions = <DataTableViewOptions table={table} />;
  const toolbarContent = toolbar ? toolbar(viewOptions) : (
    <div className="flex justify-end" role="toolbar" aria-label="History table options">{viewOptions}</div>
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-2.5">
      {toolbarContent}
      <EmptyState
        message={
          hasHistory
            ? "No history entries match the selected filters."
            : "No booking history found."
        }
      />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="booking-page-enter min-w-0 [animation-delay:100ms]">
        <DataTable
          table={table}
          className="gap-2.5"
          containerClassName="booking-panel overflow-x-auto"
          tableClassName="min-w-[900px] bg-white"
          headerClassName="bg-[#e9e6de]"
          headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          cellClassName="h-11 px-2.5 py-1.5 text-xs"
          rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
          footer={
            <div className="flex flex-col gap-2 px-0.5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p role="status">
                Showing {firstIndex + 1} to {Math.min(firstIndex + pageSize, rows.length)} of {rows.length} entries
              </p>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-[11px] text-gray-500">Rows per page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      onPageChange(1);
                    }}
                  >
                    <SelectTrigger aria-label="History rows per page" className="h-7 w-12 gap-1 rounded-[2px] bg-white px-2 text-xs data-[size=default]:h-7">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end" sideOffset={2} className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
                      {[5, 10, 20].map((size) => (
                        <SelectItem key={size} value={String(size)} className="h-7 rounded-[2px] text-xs">{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                />
              </div>
            </div>
          }
        >
          {toolbarContent}
        </DataTable>
      </div>
    </TooltipProvider>
  );
}
