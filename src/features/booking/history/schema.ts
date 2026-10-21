import { z } from "zod";

export const bookingHistoryBookingIdSchema = z.string();

export const changedBySchema = z.object({
  accountId: z.string(),
  fullName: z.string(),
  role: z.string(),
});

export const bookingHistoryItemSchema = z.object({
  historyId: z.string(),
  action: z.string().min(1),
  previousStatus: z.string().min(1).nullable(),
  newStatus: z.string().min(1),
  reason: z.string().nullable(),
  changedBy: changedBySchema,
  changedAt: z.iso.datetime({ offset: true }),
});

export const bookingHistoryListSchema = z.array(bookingHistoryItemSchema);
export const bookingHistoryResponseSchema = z.object({
  isSuccess: z.literal(true),
  value: bookingHistoryListSchema,
});

export type BookingHistoryItem = z.infer<typeof bookingHistoryItemSchema>;
