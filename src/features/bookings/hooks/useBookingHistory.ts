import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useSearchParams } from "react-router-dom";
import {
  bookingHistoryQueryKey,
  resolveBookingHistorySource,
} from "../booking-history-source";
import { bookingApi } from "../services";

export function isBookingNotFound(error: unknown) {
  return (
    isAxiosError<{ errorCode?: string }>(error) &&
    (error.response?.status === 404 ||
      error.response?.data?.errorCode === "BOOKING_NOT_FOUND")
  );
}

export function useBookingHistoryQuery(bookingId: string, enabled = true) {
  const [searchParams] = useSearchParams();
  const source = resolveBookingHistorySource(
    import.meta.env.DEV,
    searchParams.get("mock"),
    searchParams.get("scenario"),
  );

  return useQuery({
    queryKey: bookingHistoryQueryKey(bookingId, source),
    queryFn: async ({ signal }) => {
      if (import.meta.env.DEV && source.kind === "mock") {
        const { loadMockBookingHistory } = await import(
          "../mocks/booking-history.mock"
        );
        return loadMockBookingHistory(source.scenario);
      }

      return bookingApi.getHistory(bookingId, signal);
    },
    enabled: enabled && bookingId.trim().length > 0,
    retry: (failureCount, error) =>
      source.kind !== "mock" && !isBookingNotFound(error) && failureCount < 1,
  });
}
