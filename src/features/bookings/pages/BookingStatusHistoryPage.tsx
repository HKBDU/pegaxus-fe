import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BookingHistoryFilters } from "../components/history/BookingHistoryFilters";
import { BookingHistoryTable } from "../components/history/BookingHistoryTable";
import {
  isBookingNotFound,
  useBookingHistoryQuery,
} from "../hooks/useBookingHistory";
import {
  filterAndSortHistory,
  historyToCsv,
  initialHistoryFilters,
  type HistoryFilters,
} from "../history-utils";
import type { BookingHistoryItem } from "../schemas/booking-history.schema";

const emptyHistory: BookingHistoryItem[] = [];

export default function BookingStatusHistoryPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();
  const useMock = import.meta.env.DEV && searchParams.get("mock") === "1";
  if (!bookingId?.trim())
    return (
      <ErrorState message="A booking ID is required to view its history." />
    );
  return (
    <BookingHistoryContent
      key={`${bookingId}:${useMock}`}
      bookingId={bookingId}
      useMock={useMock}
    />
  );
}

function BookingHistoryContent({
  bookingId,
  useMock,
}: {
  bookingId: string;
  useMock: boolean;
}) {
  const query = useBookingHistoryQuery(bookingId, !useMock);
  const [mockHistory, setMockHistory] = useState<BookingHistoryItem[] | null>(
    null,
  );
  const [mockError, setMockError] = useState(false);
  const [filters, setFilters] = useState(initialHistoryFilters);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!import.meta.env.DEV || !useMock) return;
    let active = true;
    import("../mocks/booking-history.mock")
      .then(({ bookingHistoryMock }) => {
        if (active) setMockHistory(bookingHistoryMock);
      })
      .catch(() => {
        if (active) setMockError(true);
      });
    return () => {
      active = false;
    };
  }, [useMock]);

  const history = (useMock ? mockHistory : query.data) ?? emptyHistory;
  const isLoading = useMock
    ? mockHistory === null && !mockError
    : query.isPending;
  const isError = useMock ? mockError : query.isError;
  const isFetching = useMock ? false : query.isFetching;
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
    <main className="min-h-svh min-w-0 bg-[#f4f4f4] text-neutral-900">
      <div className="mx-auto w-full max-w-[1000px] space-y-4 px-5 py-5 lg:px-6">
        <header>
          <Link
            to={`/bookings/${encodeURIComponent(bookingId)}`}
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
          isFetching={isFetching}
          canRefresh={!useMock}
          onRefresh={() => {
            if (!useMock) void query.refetch();
          }}
          canDownload={!isLoading && !isError && rows.length > 0}
          onDownload={download}
        />

        <section
          aria-label="Booking history"
          aria-busy={isLoading || isFetching}
          className="min-w-0"
        >
          {isLoading ? (
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
          ) : isError ? (
            <div className="space-y-3">
              <ErrorState
                message={
                  !useMock && isBookingNotFound(query.error)
                    ? "Booking not found. It may no longer exist or be available to you."
                    : "Unable to load booking history. Please try again."
                }
              />
              {!useMock && !isBookingNotFound(query.error) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isFetching}
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
    </main>
  );
}
