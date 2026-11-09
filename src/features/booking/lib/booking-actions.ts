import type { Booking } from "../types";
import type { BookingDossierLink } from "@/features/dossier/schemas";

/**
 * Transport statuses where Backend allows Customer to view transport details (OT3 / OT4).
 * Sourced directly from Backend Service.cs: `VisibleStatuses = [TransportStatus.READY, TransportStatus.IN_TRANSIT, TransportStatus.COMPLETED]`
 * Any other status (CREATED, PLANNING, CANCELLED) throws 409 Conflict: "The transport has not started yet or has been cancelled".
 */
export const CUSTOMER_VISIBLE_TRANSPORT_STATUSES = [
  "READY",
  "IN_TRANSIT",
  "COMPLETED",
] as const;

export interface BookingActionStatus {
  enabled: boolean;
  reason?: string;
  loading?: boolean;
  href?: string;
}

export interface BookingActionAvailability {
  transport: BookingActionStatus;
  dossier: BookingActionStatus;
}

/**
 * Pure function to determine button availability & tooltip explanation for Customer actions.
 */
export function getBookingActionAvailability(params: {
  booking: Booking | null | undefined;
  dossiers?: BookingDossierLink[] | null;
  dossierLoading?: boolean;
  dossierError?: boolean;
}): BookingActionAvailability {
  const { booking, dossiers, dossierLoading = false, dossierError = false } = params;

  if (!booking) {
    return {
      transport: { enabled: false, reason: "Booking information not loaded" },
      dossier: { enabled: false, reason: "Booking information not loaded" },
    };
  }

  const isRejected = booking.status === "REJECTED";
  const isCancelled = booking.status === "CANCELLED";

  // ----------------------------------------------------
  // 1. TRANSPORT TRACKING ACTION
  // ----------------------------------------------------
  let transportStatus: BookingActionStatus;

  if (isRejected) {
    transportStatus = {
      enabled: false,
      reason: "Transport tracking unavailable for rejected bookings",
    };
  } else if (isCancelled) {
    transportStatus = {
      enabled: false,
      reason: "Transport tracking unavailable for cancelled bookings",
    };
  } else if (!booking.transport) {
    transportStatus = {
      enabled: false,
      reason: "Available once a transport vehicle and route are assigned",
    };
  } else if (
    !CUSTOMER_VISIBLE_TRANSPORT_STATUSES.includes(
      booking.transport.status as (typeof CUSTOMER_VISIBLE_TRANSPORT_STATUSES)[number]
    )
  ) {
    transportStatus = {
      enabled: false,
      reason: "Available once the transport has started",
    };
  } else {
    transportStatus = {
      enabled: true,
      href: `/bookings/${encodeURIComponent(String(booking.bookingId))}/transports/${encodeURIComponent(String(booking.transport.transportId))}`,
    };
  }

  // ----------------------------------------------------
  // 2. COMPLIANCE DOSSIER ACTION
  // ----------------------------------------------------
  let dossierStatus: BookingActionStatus;
  const primaryDossier = dossiers?.[0];

  if (isRejected) {
    dossierStatus = {
      enabled: false,
      reason: "Compliance dossier unavailable for rejected bookings",
    };
  } else if (isCancelled) {
    dossierStatus = {
      enabled: false,
      reason: "Compliance dossier unavailable for cancelled bookings",
    };
  } else if (dossierLoading) {
    dossierStatus = {
      enabled: false,
      loading: true,
      reason: "Checking compliance dossier status...",
    };
  } else if (dossierError) {
    dossierStatus = {
      enabled: false,
      reason: "Compliance dossier information could not be retrieved",
    };
  } else if (!primaryDossier) {
    if (booking.status !== "APPROVED") {
      dossierStatus = {
        enabled: false,
        reason: "Available once booking is approved and dossier is initiated",
      };
    } else {
      dossierStatus = {
        enabled: false,
        reason: "Available once your documents are requested",
      };
    }
  } else {
    dossierStatus = {
      enabled: true,
      href: `/compliance-dossiers/${encodeURIComponent(primaryDossier.complianceDossierId)}`,
    };
  }

  return {
    transport: transportStatus,
    dossier: dossierStatus,
  };
}

