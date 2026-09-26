import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="w-full min-w-0 bg-[#f4f4f4] text-neutral-900">
      <div className="mx-auto w-full max-w-[1000px] space-y-4 px-5 py-5 lg:px-6">
        <header>
          <Link
            to={detailsPath}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#b86800] uppercase hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Return to booking details
          </Link>
          <h1 className="!mt-2 !mb-0 !text-3xl !font-bold !tracking-normal !text-[#ed8c00] uppercase">
            Booking status history
          </h1>
        </header>

        <BookingHistoryFilters
          filters={filters}
          actions={actions}
          statuses={statuses}
          onChange={changeFilters}
          isFetching={query.isFetching}
          canRefresh={true}
          onRefresh={() => void query.refetch()}
          canDownload={!query.isPending && !query.isError && rows.length > 0}
          onDownload={download}
        />

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
            />
          )}
        </section>
      </div>
    </div>
  );
}
