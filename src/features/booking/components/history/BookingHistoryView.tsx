import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BookingHistoryFilters } from "./BookingHistoryFilters";
import { BookingHistoryTable } from "./BookingHistoryTable";
import {
  isBookingNotFound,
  bookingHistoryErrorMessage,
  useBookingHistoryQuery,
} from "../../hooks/useBookingHistory";
import {
  filterAndSortHistory,
  historyToCsv,
  initialHistoryFilters,
  type HistoryFilters,
} from "../../history/utils";
import type { BookingHistoryItem } from "../../history/schema";
import { InvalidBookingHistoryIdError } from "../../history/errors";

const emptyHistory: BookingHistoryItem[] = [];

export interface BookingHistoryViewProps {
  bookingId: string;
}

export function BookingHistoryView({ bookingId }: BookingHistoryViewProps) {
  const query = useBookingHistoryQuery(bookingId);
  const [filters, setFilters] = useState(initialHistoryFilters);
  const [page, setPage] = useState(1);

  const history = query.data ?? emptyHistory;
  const rows = useMemo(
    () => filterAndSortHistory(history, filters),
    [history, filters],
  );
  const actions = useMemo(
    () => [...new Set(history.map((item) => item.action))].sort(),
    [history],
  );
  const statuses = useMemo(
    () => [
      ...new Set(
        history.flatMap((item) =>
          item.previousStatus
            ? [item.previousStatus, item.newStatus]
            : [item.newStatus],
        ),
      ),
    ],
    [history],
  );

  if (query.invalidBookingId) {
    return (
      <ErrorState
        message={bookingHistoryErrorMessage(new InvalidBookingHistoryIdError())}
      />
    );
  }

  function changeFilters(next: HistoryFilters) {
    setFilters(next);
    setPage(1);
  }

  function download() {
    const url = URL.createObjectURL(
      new Blob([historyToCsv(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `booking-${encodeURIComponent(bookingId)}-history.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderFilters(viewOptions?: ReactNode) {
    return (
      <BookingHistoryFilters
        filters={filters}
        actions={actions}
        statuses={statuses}
        onChange={changeFilters}
        canDownload={!query.isPending && !query.isError && rows.length > 0}
        onDownload={download}
        viewOptions={viewOptions}
      />
    );
  }

  return (
    <div className="space-y-4">
      {(query.isPending || query.isError) && renderFilters()}

      <section
        aria-label="Booking history"
        aria-busy={query.isPending || query.isFetching}
        className="min-w-0"
      >
        {query.isPending ? (
          <div
            role="status"
            className="space-y-2 border border-[#dfc9b6] bg-white p-3"
          >
            <span className="sr-only">Loading booking history...</span>
            {Array.from({ length: 7 }, (_, index) => (
              <Skeleton
                key={index}
                className="h-10 rounded-none bg-neutral-200"
              />
            ))}
          </div>
        ) : query.isError ? (
          <div className="space-y-3">
            <ErrorState message={bookingHistoryErrorMessage(query.error)} />
            {!isBookingNotFound(query.error) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Retry
              </Button>
            )}
          </div>
        ) : (
          <BookingHistoryTable
            rows={rows}
            hasHistory={history.length > 0}
            page={page}
            onPageChange={setPage}
            toolbar={renderFilters}
          />
        )}
      </section>
    </div>
  );
}

