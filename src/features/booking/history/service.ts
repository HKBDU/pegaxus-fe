import apiClient from "@/lib/axios";
import { InvalidBookingHistoryIdError } from "./errors";
import { bookingHistoryBookingIdSchema, bookingHistoryResponseSchema } from "./schema";
import {
  bookingStatusUpdateSchema,
  type BookingStatusUpdateRequest,
} from "./status-schema";

export const bookingApi = {
  async getHistory(bookingId: string, signal?: AbortSignal) {
    if (!bookingHistoryBookingIdSchema.safeParse(bookingId).success) {
      throw new InvalidBookingHistoryIdError();
    }
    const response = await apiClient.get<unknown, unknown>(
      `/bookings/${encodeURIComponent(bookingId)}/histories`,
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
    await apiClient.post(
      `/bookings/${encodeURIComponent(bookingId)}/status`,
      bookingStatusUpdateSchema.parse(request),
    );
  },
};
