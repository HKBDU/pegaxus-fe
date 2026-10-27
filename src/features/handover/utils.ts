import {
  STATUS_LABEL,
  TYPE_LABEL,
  type HandoverStatus,
  type HandoverType,
} from "./constants";
import type { HandoverRecord } from "./types";
import { canAccess } from "@/features/auth/access-control";
import type { AuthPrincipal } from "@/features/auth/types";
import type { HandoverBoundary, OverviewSegment } from "./types";

export const canOperateHandover = (principal: AuthPrincipal | null) =>
  !canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] }) &&
  canAccess(principal, {
    anyRole: [
      "LOGISTICS_MANAGER",
      "FLEET_ROUTE_COORDINATOR",
      "DRIVER",
      "ESCORT",
    ],
  });

export function handoverCreateModes(
  boundary: Omit<HandoverBoundary, "handoverRequired"> & { handoverRequired?: boolean },
  legs: Map<string, OverviewSegment>,
  principal: AuthPrincipal | null,
): string[] {
  if (!boundary.canCreate || boundary.existingHandover) return [];
  const middle = Boolean(
    boundary.fromRoutePlanRouteId && boundary.toRoutePlanRouteId,
  );
  const from = legs.get(boundary.fromRoutePlanRouteId ?? "");
  const to = legs.get(boundary.toRoutePlanRouteId ?? "");
  const ordered = [...legs.values()].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const fromIndex = ordered.findIndex(
    (leg) => leg.routePlanRouteId === from?.routePlanRouteId,
  );
  const sameDriver =
    from &&
    to &&
    ordered[fromIndex + 1]?.routePlanRouteId === to.routePlanRouteId &&
    from.isOutsourced === false &&
    to.isOutsourced === false &&
    from.driver?.employeeId.trim() &&
    from.driver.employeeId !== "00000000-0000-0000-0000-000000000000" &&
    from.driver.employeeId === to.driver?.employeeId;
  if (middle && (boundary.handoverRequired === false || sameDriver)) return [];
  const manager =
    !canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] }) &&
    canAccess(principal, {
      anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"],
    });
  const operator = canOperateHandover(principal);
  const scheduler =
    manager || canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] });
  // Legacy BE confirms canCreate but has no modes: only its verified manager/crew permissions apply.
  const offered =
    boundary.createModes ??
    (manager ? ["START_NOW", "SCHEDULE"] : operator ? ["START_NOW"] : []);
  return offered.filter((mode) =>
    mode === "START_NOW" ? operator : mode === "SCHEDULE" && scheduler,
  );
}

export const typeLabel = (value: string) =>
  TYPE_LABEL[value as HandoverType] ?? value;
export const statusLabel = (value: string) =>
  STATUS_LABEL[value as HandoverStatus] ?? value;

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}

/** The time that matters for a row: when it happened, else when it is planned. */
export function handoverMoment(item: {
  actualHandoverAt?: string | null;
  plannedHandoverAt?: string | null;
}) {
  return item.actualHandoverAt ?? item.plannedHandoverAt ?? null;
}

export const hasAction = (
  record: Pick<HandoverRecord, "availableActions">,
  action: string,
) => record.availableActions.includes(action);

/** Great-circle distance in metres for checking a real handover target before completion. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number) {
  return meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toFixed(1)} km`;
}

/** HO3, HO4, HO5 on a PICKUP: a vehicle of this transport is still on another unfinished trip. */
export const VEHICLE_ON_ANOTHER_TRIP = "VEHICLE_STILL_ON_ANOTHER_TRIP";

export const isVehicleOnAnotherTrip = (error: unknown) =>
  (error as { errorCode?: unknown } | null)?.errorCode ===
  VEHICLE_ON_ANOTHER_TRIP;

/** Text to show for a failed call: the BE message (it already says what to fix), else a plain fallback. */
export function describeError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  const known = error as {
    message?: unknown;
    errors?: Array<{ message: string }>;
  } | null;
  const details =
    known?.errors?.map((entry) => entry.message).filter(Boolean) ?? [];
  const message =
    typeof known?.message === "string" && known.message
      ? known.message
      : fallback;
  return details.length > 0 && !details.includes(message)
    ? `${message} ${details.join(" ")}`
    : message;
}
