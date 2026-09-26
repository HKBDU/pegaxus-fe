import apiClient from "@/lib/axios";
import { useAuthStore } from "@/features/auth/store";
import { resolveBookingHistoryDevToken } from "./booking-history-source";
import { bookingHistoryResponseSchema } from "./schemas/booking-history.schema";
import {
  bookingStatusUpdateSchema,
  type BookingStatusUpdateRequest,
} from "./schemas/booking-status.schema";

export const bookingApi = {
  async getHistory(bookingId: string, signal?: AbortSignal) {
    const devToken = resolveBookingHistoryDevToken(
      import.meta.env.DEV,
      useAuthStore.getState().accessToken,
      import.meta.env.DEV ? import.meta.env.VITE_DEV_ACCESS_TOKEN : undefined,
    );
    const response = await apiClient.get<unknown, unknown>(
      `/bookings/${encodeURIComponent(bookingId)}/histories`,
      {
        signal,
        ...(devToken ? { headers: { Authorization: `Bearer ${devToken}` } } : {}),
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
