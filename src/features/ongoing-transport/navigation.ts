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
