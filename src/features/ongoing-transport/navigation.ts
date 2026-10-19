import { ROLE_ROUTES } from "@/app/route-config";
import { ongoingListReturnSchema } from "./schemas";
import type { TransportAudience } from "./types";

export function ongoingTransportDetailPath(transportId: string) {
  return `${ROLE_ROUTES.ongoingTransports}/${encodeURIComponent(transportId)}`;
}

export function transportOverviewPath(
  transportId: string,
  audience: TransportAudience,
  bookingId?: string,
) {
  const id = encodeURIComponent(transportId);
  if (audience === "crew") return `/crew/transports/${id}`;
  if (audience === "customer") {
    if (bookingId === undefined)
      throw new Error("Customer overview requires a booking ID.");
    return `/bookings/${encodeURIComponent(bookingId)}/transports/${id}`;
  }
  return ongoingTransportDetailPath(transportId);
}

export function readOngoingListReturn(state: unknown) {
  const value =
    state && typeof state === "object" && "ongoingTransportList" in state
      ? state.ongoingTransportList
      : undefined;
  const parsed = ongoingListReturnSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function transportSegmentsPath(
  transportId: string,
  audience: TransportAudience,
  bookingId?: string,
) {
  return `${transportOverviewPath(transportId, audience, bookingId)}/segments`;
}

export function transportHealthPath(
  transportId: string,
  audience: TransportAudience,
  bookingId?: string,
) {
  return `${transportOverviewPath(transportId, audience, bookingId)}/health`;
}

export function transportGpsPath(
  transportId: string,
  audience: TransportAudience,
  bookingId?: string,
) {
  return `${transportOverviewPath(transportId, audience, bookingId)}/gps`;
}

export function transportHandoversPath(
  transportId: string,
  audience: TransportAudience,
  bookingId?: string,
) {
  return `${transportOverviewPath(transportId, audience, bookingId)}/handovers`;
}

/** Tab the current URL belongs to; the sub pages (a horse's history, a handover record) stay on their tab. */
export type TransportView =
  "overview" | "segments" | "health" | "gps" | "handovers";

export function transportViewFromPath(pathname: string): TransportView {
  const match = /\/(segments|health|gps|handovers)(\/|$)/.exec(pathname);
  return (match?.[1] as TransportView | undefined) ?? "overview";
}
