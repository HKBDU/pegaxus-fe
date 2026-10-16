import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store";
import {
  bookingHistoryDetailsPath,
  resolveBookingHistoryShell,
} from "../history/access";
import { BookingHistoryFilters } from "../components/history/BookingHistoryFilters";
import { BookingHistoryTable } from "../components/history/BookingHistoryTable";
import {
  isBookingNotFound,
  bookingHistoryErrorMessage,
  useBookingHistoryQuery,
} from "../hooks/useBookingHistory";
import {
  filterAndSortHistory,
  historyToCsv,
  initialHistoryFilters,
  type HistoryFilters,
} from "../history/utils";
import type { BookingHistoryItem } from "../history/schema";
import { InvalidBookingHistoryIdError } from "../history/errors";

const emptyHistory: BookingHistoryItem[] = [];

export default function BookingStatusHistoryPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const roles = useAuthStore((state) => state.principal?.roles);
  if (!bookingId?.trim())
    return (
      <ErrorState message="A booking ID is required to view its history." />
    );
  return (
    <BookingHistoryContent
      key={`${bookingId}:${location.search}`}
      bookingId={bookingId}
      detailsPath={bookingHistoryDetailsPath(
        bookingId,
        location.pathname.startsWith("/__dev/admin/")
          ? "admin"
          : location.pathname.startsWith("/__dev/customer/")
            ? "customer"
            : resolveBookingHistoryShell(roles) ?? "customer",
      )}
    />
  );
}

function BookingHistoryContent({
  bookingId,
  detailsPath,
}: {
  bookingId: string;
  detailsPath: string;
}) {
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
    return <ErrorState message={bookingHistoryErrorMessage(new InvalidBookingHistoryIdError())} />;
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
    <div className="booking-page-shell min-h-[70dvh] min-w-0 px-4 py-8 font-sans text-slate-900 sm:px-6 lg:px-8 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-6">
        <header className="space-y-3">
          <Link
            to={detailsPath}
            className="inline-flex items-center gap-[6px] text-[12px] font-bold leading-4 tracking-[0.6px] text-primary uppercase hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span aria-hidden="true" className="text-[14px]">←</span>
            Return to booking details
          </Link>
          <h1 className="m-0! min-w-0 font-heading text-[28px]! leading-[1.1]! font-bold! tracking-normal! text-primary! uppercase min-[360px]:text-[32px]! sm:text-[40px]!">
            Booking status history
          </h1>
        </header>

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
              <ErrorState
                message={
                  bookingHistoryErrorMessage(query.error)
                }
              />
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
    </div>
  );
}
