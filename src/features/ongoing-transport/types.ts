import type { z } from "zod";
import type {
  ongoingTransportItemSchema,
  ongoingTransportPageSchema,
  ongoingTransportQuerySchema,
  ongoingTransportStatusSchema,
} from "./schemas";

export type OngoingTransport = z.infer<typeof ongoingTransportItemSchema>;
export type OngoingTransportPage = z.infer<typeof ongoingTransportPageSchema>;
export type OngoingTransportParams = z.infer<
  typeof ongoingTransportQuerySchema
>;
export type OngoingTransportStatus = z.infer<
  typeof ongoingTransportStatusSchema
>;
export type OngoingTransportFilterPatch = Partial<
  Omit<OngoingTransportParams, "pageIndex">
>;
export type MockScenario = "data" | "empty" | "api-error" | "network-error";
