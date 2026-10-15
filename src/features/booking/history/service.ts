import apiClient from "@/lib/axios";
import { InvalidBookingHistoryIdError } from "./errors";
import { bookingHistoryBookingIdSchema, bookingHistoryResponseSchema } from "./schema";
import {
  bookingStatusUpdateSchema,
  type BookingStatusUpdateRequest,
} from "./status-schema";

export const bookingApi = {
  async getHistory(bookingId: string, signal?: AbortSignal) {
    const parsedBookingId = bookingHistoryBookingIdSchema.safeParse(bookingId);
    if (!parsedBookingId.success) {
      throw new InvalidBookingHistoryIdError();
    }
    const numericBookingId = String(parsedBookingId.data);
    const response = await apiClient.get<unknown, unknown>(
      `/bookings/${encodeURIComponent(numericBookingId)}/histories`,
      {
        signal,
      },
    );
    return bookingHistoryResponseSchema.parse(response).value;
  },

  async updateStatus(
    bookingId: string,
    request: BookingStatusUpdateRequest,
  ): Promise<void> {
    await apiClient.patch(
      `/bookings/${encodeURIComponent(bookingId)}/status`,
      bookingStatusUpdateSchema.parse(request),
    );
  },
};
