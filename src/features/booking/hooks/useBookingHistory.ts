import { useQuery } from "@tanstack/react-query";
import { isBookingNotFound, bookingHistoryErrorMessage, bookingHistoryErrorKind } from "../history/errors";
export { isBookingNotFound, bookingHistoryErrorMessage };

import { useSearchParams } from "react-router-dom";
import {
  bookingHistoryQueryKey,
  resolveBookingHistorySource,
} from "../history/source";
import { bookingApi } from "../history/service";
import { bookingHistoryBookingIdSchema } from "../history/schema";


export function useBookingHistoryQuery(bookingId: string, enabled = true) {
  const [searchParams] = useSearchParams();
  const source = resolveBookingHistorySource(
    import.meta.env.DEV,
    searchParams.get("mock"),
    searchParams.get("scenario"),
  );

  const invalidBookingId = source.kind === "api" &&
    !bookingHistoryBookingIdSchema.safeParse(bookingId).success;
  const query = useQuery({
    queryKey: bookingHistoryQueryKey(bookingId, source),
    queryFn: async ({ signal }) => {
      if (import.meta.env.DEV && source.kind === "mock") {
        const { loadMockBookingHistory } = await import(
          "../history/mocks/booking-history.mock"
        );
        return loadMockBookingHistory(source.scenario);
      }

      return bookingApi.getHistory(bookingId, signal);
    },
    enabled: enabled && !invalidBookingId && bookingId.trim().length > 0,
    retry: (failureCount, error) =>
      source.kind !== "mock" && bookingHistoryErrorKind(error) === "load" && failureCount < 1,
  });
  return { ...query, invalidBookingId };
}
