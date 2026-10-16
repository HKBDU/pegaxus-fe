import { isAxiosError } from "axios";
import { ZodError } from "zod";

export class InvalidBookingHistoryIdError extends Error {
  constructor() {
    super("A valid numeric booking ID is required to view its history.");
    this.name = "InvalidBookingHistoryIdError";
  }
}

export function bookingHistoryErrorKind(error: unknown) {
  if (error instanceof InvalidBookingHistoryIdError) return "invalid-id";
  if (error instanceof ZodError) return "contract";
  if (!isAxiosError<{ errorCode?: string }>(error)) return "load";
  const status = error.response?.status;
  if (status === 401) return "session";
  if (status === 403) return "access";
  if (status === 404) return "not-found";
  if (status !== undefined && status >= 400 && status < 500 &&
      error.response?.data?.errorCode === "BOOKING_NOT_FOUND") return "not-found";
  return "load";
}

export function isBookingNotFound(error: unknown) {
  return bookingHistoryErrorKind(error) === "not-found";
}

export function bookingHistoryErrorMessage(error: unknown) {
  switch (bookingHistoryErrorKind(error)) {
    case "invalid-id": return "A valid numeric booking ID is required to view its history.";
    case "session": return "Your session has expired. Please sign in again.";
    case "access": return "You do not have permission to view this booking's history.";
    case "not-found": return "Booking not found. It may no longer exist or be available to you.";
    case "contract": return "The booking history response is invalid. Please contact support.";
    default: return "Unable to load booking history. Please try again.";
  }
}
