import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { bookingApi } from "../services";

export function isBookingNotFound(error: unknown) {
  return (
    isAxiosError<{ errorCode?: string }>(error) &&
    (error.response?.status === 404 ||
      error.response?.data?.errorCode === "BOOKING_NOT_FOUND")
  );
}

export function useBookingHistoryQuery(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: ["bookings", bookingId, "histories"],
    queryFn: ({ signal }) => bookingApi.getHistory(bookingId, signal),
    enabled: enabled && bookingId.trim().length > 0,
    retry: (failureCount, error) =>
      !isBookingNotFound(error) && failureCount < 1,
  });
}
