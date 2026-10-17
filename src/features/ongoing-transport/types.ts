import type { z } from "zod";
import type {
  ongoingTransportItemSchema,
  ongoingTransportPageSchema,
  ongoingTransportQuerySchema,
  ongoingTransportStatusSchema,
  transportOverviewSchema,
  ongoingListReturnSchema,
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
export type TransportOverview = z.infer<typeof transportOverviewSchema>;
export type TransportAudience = "admin" | "crew" | "customer";
export type OverviewScenario =
  | "data"
  | "typed-dossiers"
  | "forbidden"
  | "not-found"
  | "invalid-status"
  | "network-error"
  | "api-error";
export type OngoingListReturnState = z.infer<typeof ongoingListReturnSchema>;
