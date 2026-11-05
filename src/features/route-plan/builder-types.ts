import type { MapRoute } from "@/shared/components/map";
import type { Provider, VehicleBrief } from "./types";

export type BuilderProvider = Pick<
  Provider,
  | "transportProviderId"
  | "providerCode"
  | "providerName"
  | "status"
  | "supportedModes"
>;

export type DraftSegment = {
  id: string;
  sequenceNo?: number;
  route: MapRoute;
  arrangement: "INTERNAL" | "OUTSOURCED";
  stopType: "REST_STOP" | "BCP" | "DESTINATION";
  provider?: BuilderProvider;
  note?: string;
  dwellAfterMinutes?: number;
  plannedDepartureAt?: string;
  plannedArrivalAt?: string;
  vehicleIds?: string[];
  vehicleDetails?: VehicleBrief[];
  assignmentOrigin?: "new" | "saved" | "manual" | "inherited";
  inheritanceSource?: number;
  assignmentReason?: string;
  preserveTiming?: boolean;
  isDisconnected?: boolean;
};
