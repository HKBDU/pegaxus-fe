import apiClient from "@/lib/axios";
import { bookingHistoryResponseSchema } from "./schemas/booking-history.schema";
import {
  bookingStatusUpdateSchema,
  type BookingStatusUpdateRequest,
} from "./schemas/booking-status.schema";

export const bookingApi = {
  async getHistory(bookingId: string, signal?: AbortSignal) {
    const response = await apiClient.get<unknown, unknown>(
      `/bookings/${encodeURIComponent(bookingId)}/histories`,
      { signal },
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
