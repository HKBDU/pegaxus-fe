import { z } from "zod";

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(["DRAFT", "PENDING"]),
});

export type BookingStatusUpdateRequest = z.infer<
  typeof bookingStatusUpdateSchema
>;
