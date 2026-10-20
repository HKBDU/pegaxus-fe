import type { z } from "zod";
import type {
  driverLocationRequestSchema,
  driverLocationAcceptedSchema,
  locationPermissionDeniedSchema,
  arrivalBoundarySchema,
  assignedLocationContextSchema,
} from "./schemas";

export type DriverLocationRequest = z.infer<typeof driverLocationRequestSchema>;
export type DriverLocationAccepted = z.infer<
  typeof driverLocationAcceptedSchema
>;
export type LocationPermissionDenied = z.infer<
  typeof locationPermissionDeniedSchema
>;
export type ArrivalBoundaryEvent = z.infer<typeof arrivalBoundarySchema>;
export type AssignedLocationContext = z.infer<
  typeof assignedLocationContextSchema
>["items"][number];

export type SharingStatus =
  | "stopped"
  | "requesting_permission"
  | "acquiring_location"
  | "waiting_to_send"
  | "paused"
  | "sharing"
  | "offline"
  | "permission_denied"
  | "location_unavailable"
  | "unsupported"
  | "transport_unavailable"
  | "send_error";
export type LocationPermissionStatus =
  "not_requested" | "prompt" | "granted" | "denied" | "unknown";
export type NetworkStatus = "online" | "offline" | "unknown";
export type LocationCapability =
  "available" | "insecure" | "unsupported" | "unknown";

export type LocationSharingState = {
  sharingStatus: SharingStatus;
  permissionStatus: LocationPermissionStatus;
  networkStatus: NetworkStatus;
  lastSuccessfulTransmissionAt: string | null;
  active: boolean;
  sending: boolean;
  restartBlocked: boolean;
  message: string | null;
  notification: "none" | "sending" | "notified" | "not_notified" | "failed";
  acceptance: "unknown" | "legacy" | "accepted" | "rejected";
  lastAcceptedAt: number | null;
  acceptedSegmentId: string | null;
  acceptanceScope: {
    transportId: string;
    accountId: string;
    sessionVersion: number;
  } | null;
  arrival: ArrivalBoundaryEvent | null;
  arrivalWarning: {
    distanceMeters: number;
    secondsRemaining: number | null;
  } | null;
};

// A UI projection of the already validated OT3 response, supplied only at the route boundary.
export type DriverTransportContext = {
  transportId: string;
  transportCode: string;
  status: "READY" | "IN_TRANSIT" | "COMPLETED";
  serverTime: string;
  currentLeg: { displayOrder: number; from: string; to: string } | null;
  currentSegmentId?: string;
};
export type DriverTransportReadState =
  | { kind: "loading" }
  | { kind: "error"; message: string; retryable: boolean }
  | { kind: "unavailable"; message: string }
  | { kind: "available"; transport: DriverTransportContext; stale: boolean };

export type DriverLocationSharingPageProps = {
  transportId?: string;
  context: DriverTransportReadState;
  refreshing: boolean;
  source: "real" | "mock";
  onReloadContext: () => void;
};
