import type { Booking } from "../types";
import type { InvoiceListItem } from "@/features/invoice/types";
import type { BookingDossierLink } from "@/features/dossier/schemas";
import type {
  TrackingSegment,
  TransportOverview,
} from "@/features/ongoing-transport/types";
import type { HandoverListItem } from "@/features/handover/types";
import type { ClaimEligibility } from "@/features/claim/types";

export type TimelinePhase = "BEFORE_TRIP" | "IN_TRANSIT" | "COMPLETED";

export type TimelineEventStatus =
  | "DONE"
  | "CURRENT"
  | "UPCOMING"
  | "EXCEPTION";

export interface TimelineBadge {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export interface TimelineCta {
  label: string;
  tab?: string;
  to?: string;
  queryParam?: { key: string; value: string };
}

export interface OrderTimelineEvent {
  id: string;
  phase: TimelinePhase;
  status: TimelineEventStatus;
  title: string;
  timestamp: string | null;
  description: string;
  badges?: TimelineBadge[];
  cta?: TimelineCta;
  details?: { label: string; value: string }[];
}

export interface OrderTimelinePhaseGroup {
  phase: TimelinePhase;
  title: string;
  description: string;
  status: "COMPLETED" | "ACTIVE" | "UPCOMING" | "TERMINATED";
  events: OrderTimelineEvent[];
}

export interface BuildOrderTimelineParams {
  booking: Booking;
  invoices?: InvoiceListItem[];
  dossiers?: BookingDossierLink[];
  dossierOverview?: {
    status?: string | null;
    progressPercent?: number;
    approvedAt?: string | null;
    readyForSubmissionAt?: string | null;
    openedAt?: string | null;
  } | null;
  transportOverview?: TransportOverview | null;
  transportSegments?: TrackingSegment[] | null;
  handovers?: HandoverListItem[] | null;
  claimEligibility?: ClaimEligibility | null;
}

export function buildOrderTimeline(params: BuildOrderTimelineParams): OrderTimelinePhaseGroup[] {
  const {
    booking,
    invoices = [],
    dossiers = [],
    dossierOverview,
    transportOverview,
    transportSegments,
    handovers = [],
    claimEligibility,
  } = params;

  const effectiveHandovers = handovers ?? [];
  const isTerminated = booking.status === "REJECTED" || booking.status === "CANCELLED";
  const isApproved = booking.status === "APPROVED";
  const transport = booking.transport;
  const transportStatus = transportOverview?.transport.status ?? transport?.status;
  const isTransportActive = transportStatus === "IN_TRANSIT";
  const isTransportCompleted = transportStatus === "COMPLETED";

  // ----------------------------------------------------
  // PHASE 1: BEFORE TRIP
  // ----------------------------------------------------
  const beforeTripEvents: OrderTimelineEvent[] = [];

  // 1. Request Submitted
  beforeTripEvents.push({
    id: "booking-submitted",
    phase: "BEFORE_TRIP",
    status: "DONE",
    title: "Request Submitted",
    timestamp: booking.createdAt,
    description: `Booking request created for ${booking.horses.length} ${booking.horses.length === 1 ? "horse" : "horses"} with initial itinerary details.`,
    badges: [{ label: "SUBMITTED", variant: "success" }],
  });

  // 2. Booking Review & Approval
  if (booking.status === "APPROVED") {
    beforeTripEvents.push({
      id: "booking-approval",
      phase: "BEFORE_TRIP",
      status: "DONE",
      title: "Booking Approved",
      timestamp: booking.approvedAt,
      description: "Booking request approved by the operations team. Proceeding to trip preparation.",
      badges: [{ label: "APPROVED", variant: "success" }],
    });
  } else if (booking.status === "REJECTED") {
    beforeTripEvents.push({
      id: "booking-approval",
      phase: "BEFORE_TRIP",
      status: "EXCEPTION",
      title: "Booking Rejected",
      timestamp: booking.rejectedAt,
      description: booking.rejectionReason
        ? `Request was rejected by Operations: ${booking.rejectionReason}`
        : "Booking request was rejected by Operations.",
      badges: [{ label: "REJECTED", variant: "destructive" }],
    });
  } else if (booking.status === "CANCELLED") {
    beforeTripEvents.push({
      id: "booking-approval",
      phase: "BEFORE_TRIP",
      status: "EXCEPTION",
      title: "Booking Cancelled",
      timestamp: booking.cancelledAt,
      description: booking.cancellationReason
        ? `Booking was cancelled: ${booking.cancellationReason}`
        : "Booking request was cancelled.",
      badges: [{ label: "CANCELLED", variant: "destructive" }],
    });
  } else {
    beforeTripEvents.push({
      id: "booking-approval",
      phase: "BEFORE_TRIP",
      status: "CURRENT",
      title: "Under Operations Review",
      timestamp: null,
      description: "Our operations dispatch team is currently reviewing your requested route and schedule.",
      badges: [{ label: "PENDING", variant: "warning" }],
    });
  }

  // If booking is rejected or cancelled, stop right here for Phase 1
  if (isTerminated) {
    return [
      {
        phase: "BEFORE_TRIP",
        title: "Stage 1: Before Trip",
        description: "Initial booking review and authorization",
        status: "TERMINATED",
        events: beforeTripEvents,
      },
    ];
  }

  // 3. Quotation (if present)
  const quotationInvoice = invoices.find((inv) => inv.type === "QUOTATION");
  if (quotationInvoice) {
    beforeTripEvents.push({
      id: "quotation-invoice",
      phase: "BEFORE_TRIP",
      status: "DONE",
      title: "Trip Quotation Issued",
      timestamp: quotationInvoice.issuedAt,
      description: `Formal price quotation #${quotationInvoice.invoiceNumber} (${quotationInvoice.totalAmount.toLocaleString()} ${quotationInvoice.currency}) provided.`,
      badges: [{ label: "QUOTATION", variant: "secondary" }],
    });
  }

  // 4. Deposit Invoice
  const depositInvoice = invoices.find((inv) => inv.type === "DEPOSIT");
  if (depositInvoice) {
    const isPaid = depositInvoice.status === "PAID";
    const isOverdue = depositInvoice.status === "OVERDUE";

    beforeTripEvents.push({
      id: "deposit-invoice",
      phase: "BEFORE_TRIP",
      status: isPaid ? "DONE" : "CURRENT",
      title: isPaid ? "Deposit Invoice Paid" : "Deposit Payment Required",
      timestamp: isPaid ? depositInvoice.paidAt : depositInvoice.issuedAt,
      description: isPaid
        ? `Deposit invoice #${depositInvoice.invoiceNumber} paid in full (${depositInvoice.totalAmount.toLocaleString()} ${depositInvoice.currency}).`
        : `Deposit invoice #${depositInvoice.invoiceNumber} (${depositInvoice.totalAmount.toLocaleString()} ${depositInvoice.currency}) is awaiting payment.`,
      badges: [
        {
          label: depositInvoice.status,
          variant: isPaid ? "success" : isOverdue ? "destructive" : "warning",
        },
      ],
      cta: isPaid
        ? undefined
        : {
            label: "View & Pay Invoice",
            tab: "details",
            queryParam: { key: "invoiceId", value: depositInvoice.invoiceId },
          },
    });
  } else if (isApproved) {
    beforeTripEvents.push({
      id: "deposit-invoice",
      phase: "BEFORE_TRIP",
      status: "UPCOMING",
      title: "Deposit Invoice",
      timestamp: null,
      description: "Deposit invoice will be issued once route logistics are structured.",
    });
  }

  // 5. Compliance Documents / Dossier
  const primaryDossier = dossiers[0];
  if (primaryDossier) {
    const dossierStatus = dossierOverview?.status ?? primaryDossier.status ?? "PENDING";
    const isDossierApproved = dossierStatus === "APPROVED";
    const percent = dossierOverview?.progressPercent !== undefined
      ? Math.round(dossierOverview.progressPercent)
      : undefined;

    beforeTripEvents.push({
      id: "compliance-dossier",
      phase: "BEFORE_TRIP",
      status: isDossierApproved ? "DONE" : "CURRENT",
      title: isDossierApproved ? "Compliance Documents Approved" : "Compliance Documents Verification",
      timestamp: isDossierApproved
        ? dossierOverview?.approvedAt ?? null
        : dossierOverview?.readyForSubmissionAt ?? dossierOverview?.openedAt ?? null,
      description: isDossierApproved
        ? "Veterinary, travel clearance, and compliance documents verified and approved."
        : `Dossier status: ${dossierStatus}${percent !== undefined ? ` (${percent}% verified)` : ""}. Please review required documents.`,
      badges: [
        {
          label: dossierStatus,
          variant: isDossierApproved ? "success" : "secondary",
        },
      ],
      cta: {
        label: "View Dossier",
        to: `/compliance-dossiers/${encodeURIComponent(primaryDossier.complianceDossierId)}`,
      },
    });
  } else if (isApproved) {
    beforeTripEvents.push({
      id: "compliance-dossier",
      phase: "BEFORE_TRIP",
      status: "UPCOMING",
      title: "Compliance Documents",
      timestamp: null,
      description: "Compliance dossier will be opened for cross-border documentation check.",
    });
  }

  // 6. Transport Scheduled & Route Confirmed
  if (transportStatus === "READY") {
    beforeTripEvents.push({
      id: "transport-ready",
      phase: "BEFORE_TRIP",
      status: "CURRENT",
      title: "Ready for Departure",
      timestamp: null,
      description: `Transport vehicle and escort crew assigned (${transport?.transportCode ?? transportOverview?.transport.transportCode}). Itinerary confirmed.`,
      badges: [{ label: "READY", variant: "success" }],
    });
  } else if (transportStatus === "IN_TRANSIT" || transportStatus === "COMPLETED") {
    beforeTripEvents.push({
      id: "transport-ready",
      phase: "BEFORE_TRIP",
      status: "DONE",
      title: "Transport Prepared & Dispatched",
      timestamp: null,
      description: `Transport assignment and itinerary confirmed (${transport?.transportCode ?? transportOverview?.transport.transportCode}).`,
      badges: [{ label: "DISPATCHED", variant: "success" }],
    });
  } else if (isApproved) {
    beforeTripEvents.push({
      id: "transport-ready",
      phase: "BEFORE_TRIP",
      status: "UPCOMING",
      title: "Vehicle & Route Scheduling",
      timestamp: null,
      description: "Dispatch team will confirm route and assign vehicle and escort personnel.",
    });
  }

  // ----------------------------------------------------
  // PHASE 2: IN TRANSIT
  // ----------------------------------------------------
  const inTransitEvents: OrderTimelineEvent[] = [];

  // 7. Pickup Handover
  const pickupHandover = effectiveHandovers.find((h) => h.handoverType === "PICKUP" && h.status !== "CANCELLED");
  if (pickupHandover && pickupHandover.status === "COMPLETED") {
    inTransitEvents.push({
      id: "pickup-handover",
      phase: "IN_TRANSIT",
      status: "DONE",
      title: "Pickup Handover Completed",
      timestamp: pickupHandover.actualHandoverAt ?? null,
      description: `Horses securely inspected and transferred to escort crew at ${pickupHandover.locationName || booking.originAddress}.`,
      badges: [{ label: "COMPLETED", variant: "success" }],
    });
  } else if (pickupHandover && pickupHandover.status === "IN_PROGRESS") {
    inTransitEvents.push({
      id: "pickup-handover",
      phase: "IN_TRANSIT",
      status: "CURRENT",
      title: "Pickup Handover In Progress",
      timestamp: null,
      description: `Pickup inspection and transfer underway at origin point.`,
      badges: [{ label: "IN PROGRESS", variant: "warning" }],
    });
  } else if (isTransportActive || transportStatus === "READY") {
    inTransitEvents.push({
      id: "pickup-handover",
      phase: "IN_TRANSIT",
      status: "CURRENT",
      title: "Pickup Handover Scheduled",
      timestamp: null,
      description: `Scheduled pickup handover at origin location (${booking.originAddress}).`,
      badges: [{ label: "SCHEDULED", variant: "secondary" }],
    });
  } else {
    inTransitEvents.push({
      id: "pickup-handover",
      phase: "IN_TRANSIT",
      status: "UPCOMING",
      title: "Pickup Handover",
      timestamp: null,
      description: `Horses will be collected from ${booking.originAddress}.`,
    });
  }

  // 8. Departure
  const actualDeparture = transportOverview?.transport.actualDepartureAt;
  if (actualDeparture || isTransportActive || isTransportCompleted) {
    inTransitEvents.push({
      id: "origin-departure",
      phase: "IN_TRANSIT",
      status: "DONE",
      title: "Departed Origin Point",
      timestamp: actualDeparture ?? null,
      description: "Vehicle departed origin point. Journey is actively en route.",
      badges: [{ label: "DEPARTED", variant: "success" }],
    });
  } else {
    inTransitEvents.push({
      id: "origin-departure",
      phase: "IN_TRANSIT",
      status: "UPCOMING",
      title: "Departure from Origin",
      timestamp: null,
      description: "Departure will commence following completed pickup handover.",
    });
  }

  // 9. Segments & Journey Progress
  const isRerouteActive =
    transportOverview?.routeType === "BACKUP" ||
    transportOverview?.routeType === "RETURN";

  if (transportSegments && transportSegments.length > 0) {
    transportSegments.forEach((segment) => {
      const isCurrent = segment.isCurrent;
      const isSegmentCompleted = segment.status === "COMPLETED";
      const isSegmentInTransit = segment.status === "IN_TRANSIT";
      const isBorder = segment.toLocation.locationType === "BORDER_GATE";

      const badges: TimelineBadge[] = [
        {
          label: segment.status,
          variant: isSegmentCompleted ? "success" : isSegmentInTransit ? "warning" : "secondary",
        },
      ];
      if (isBorder) {
        badges.push({ label: "BORDER CROSSING", variant: "outline" });
      }
      if (segment.routeType === "BACKUP" || segment.routeType === "RETURN") {
        badges.push({ label: `${segment.routeType} ROUTE`, variant: "warning" });
      }

      inTransitEvents.push({
        id: `segment-${segment.routePlanRouteId}`,
        phase: "IN_TRANSIT",
        status: isSegmentCompleted ? "DONE" : isSegmentInTransit || isCurrent ? "CURRENT" : "UPCOMING",
        title: `Leg ${segment.displayOrder}: ${segment.fromLocation.locationName} → ${segment.toLocation.locationName}`,
        timestamp: isSegmentCompleted
          ? segment.actualArrivalAt
          : isSegmentInTransit
            ? segment.actualDepartureAt
            : null,
        description: isSegmentCompleted
          ? `Arrived safely at ${segment.toLocation.locationName}. Distance: ${segment.distanceKm ? `${segment.distanceKm} km` : "N/A"}.`
          : isSegmentInTransit
            ? `In transit to ${segment.toLocation.locationName}.${segment.plannedArrivalAt ? ` Estimated arrival: ${new Date(segment.plannedArrivalAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : ""}`
            : `Scheduled leg towards ${segment.toLocation.locationName}.`,
        badges,
        cta:
          isSegmentInTransit && transportOverview?.canViewGpsTab && transport?.transportId
            ? {
                label: "Live GPS Map",
                to: `/bookings/${encodeURIComponent(String(booking.bookingId))}/transports/${encodeURIComponent(String(transport.transportId))}/gps`,
              }
            : undefined,
      });
    });
  } else if (isTransportActive) {
    const badges: TimelineBadge[] = [{ label: "IN TRANSIT", variant: "warning" }];
    if (isRerouteActive) {
      badges.push({ label: "REROUTE ACTIVE", variant: "warning" });
    }

    inTransitEvents.push({
      id: "transit-in-progress",
      phase: "IN_TRANSIT",
      status: "CURRENT",
      title: "Transport In Transit",
      timestamp: null,
      description: isRerouteActive
        ? "Vehicle is in transit via an alternative confirmed route."
        : "Vehicle is currently en route to destination according to itinerary.",
      badges,
    });
  } else {
    inTransitEvents.push({
      id: "transit-in-progress",
      phase: "IN_TRANSIT",
      status: "UPCOMING",
      title: "Transit Progress",
      timestamp: null,
      description: "Transit milestones and segment progression will display once journey starts.",
    });
  }

  // ----------------------------------------------------
  // PHASE 3: COMPLETED
  // ----------------------------------------------------
  const completedEvents: OrderTimelineEvent[] = [];

  // 10. Destination Arrival
  const actualArrival = transportOverview?.transport.actualArrivalAt ?? transportOverview?.transport.completedAt;
  if (isTransportCompleted || actualArrival) {
    completedEvents.push({
      id: "destination-arrival",
      phase: "COMPLETED",
      status: "DONE",
      title: "Arrived at Destination",
      timestamp: actualArrival ?? null,
      description: `Transport vehicle arrived safely at destination (${booking.destinationAddress}).`,
      badges: [{ label: "ARRIVED", variant: "success" }],
    });
  } else {
    completedEvents.push({
      id: "destination-arrival",
      phase: "COMPLETED",
      status: "UPCOMING",
      title: "Destination Arrival",
      timestamp: null,
      description: `Expected arrival at destination (${booking.destinationAddress}).`,
    });
  }

  // 11. Delivery Handover
  const deliveryHandover = effectiveHandovers.find((h) => h.handoverType === "DELIVERY" && h.status !== "CANCELLED");
  if (deliveryHandover && deliveryHandover.status === "COMPLETED") {
    completedEvents.push({
      id: "delivery-handover",
      phase: "COMPLETED",
      status: "DONE",
      title: "Delivery Handover Completed",
      timestamp: deliveryHandover.actualHandoverAt ?? null,
      description: `Horses safely transferred to consignee at destination (${deliveryHandover.locationName || booking.destinationAddress}). Condition checks satisfied.`,
      badges: [{ label: "DELIVERED", variant: "success" }],
    });
  } else if (deliveryHandover && deliveryHandover.status === "IN_PROGRESS") {
    completedEvents.push({
      id: "delivery-handover",
      phase: "COMPLETED",
      status: "CURRENT",
      title: "Delivery Handover In Progress",
      timestamp: null,
      description: `Delivery verification and sign-off underway at destination.`,
      badges: [{ label: "IN PROGRESS", variant: "warning" }],
    });
  } else {
    completedEvents.push({
      id: "delivery-handover",
      phase: "COMPLETED",
      status: "UPCOMING",
      title: "Delivery Handover",
      timestamp: null,
      description: `Consignee transfer and condition check upon arrival at ${booking.destinationAddress}.`,
    });
  }

  // 12. Final Invoice
  const finalInvoice = invoices.find((inv) => inv.type === "FINAL");
  if (finalInvoice) {
    const isPaid = finalInvoice.status === "PAID";
    const isOverdue = finalInvoice.status === "OVERDUE";

    completedEvents.push({
      id: "final-invoice",
      phase: "COMPLETED",
      status: isPaid ? "DONE" : "CURRENT",
      title: isPaid ? "Final Invoice Paid" : "Final Settlement Due",
      timestamp: isPaid ? finalInvoice.paidAt : finalInvoice.issuedAt,
      description: isPaid
        ? `Final invoice #${finalInvoice.invoiceNumber} paid in full (${finalInvoice.totalAmount.toLocaleString()} ${finalInvoice.currency}). Trip account is fully settled.`
        : `Final invoice #${finalInvoice.invoiceNumber} (${finalInvoice.totalAmount.toLocaleString()} ${finalInvoice.currency}) has been issued.`,
      badges: [
        {
          label: finalInvoice.status,
          variant: isPaid ? "success" : isOverdue ? "destructive" : "warning",
        },
      ],
      cta: isPaid
        ? undefined
        : {
            label: "View & Pay Invoice",
            tab: "details",
            queryParam: { key: "invoiceId", value: finalInvoice.invoiceId },
          },
    });
  } else if (isTransportCompleted) {
    completedEvents.push({
      id: "final-invoice",
      phase: "COMPLETED",
      status: "UPCOMING",
      title: "Final Settlement Invoice",
      timestamp: null,
      description: "Final invoice will be generated following journey audit completion.",
    });
  }

  // 13. Claim Window
  if (isTransportCompleted || (deliveryHandover && deliveryHandover.status === "COMPLETED")) {
    if (claimEligibility?.canSubmit) {
      completedEvents.push({
        id: "claim-window",
        phase: "COMPLETED",
        status: "CURRENT",
        title: "Post-Trip Claim Window Active",
        timestamp: claimEligibility.claimDeadline ?? null,
        description: `Eligible to submit post-trip inspection claims. Window closes on ${claimEligibility.claimDeadline ? new Date(claimEligibility.claimDeadline).toLocaleString() : "schedule"}.`,
        badges: [{ label: "CLAIM ELIGIBLE", variant: "outline" }],
        cta: {
          label: "File Claim",
          tab: "details",
          queryParam: { key: "action", value: "claim" },
        },
      });
    } else if (claimEligibility?.claimCount && claimEligibility.claimCount > 0) {
      completedEvents.push({
        id: "claim-window",
        phase: "COMPLETED",
        status: "DONE",
        title: "Post-Trip Claim Submitted",
        timestamp: null,
        description: `${claimEligibility.claimCount} post-trip claim(s) filed for this journey.`,
        badges: [{ label: "CLAIM FILED", variant: "secondary" }],
        cta: {
          label: "View Claims",
          tab: "details",
        },
      });
    } else if (claimEligibility?.blockedReason === "CLAIM_WINDOW_EXPIRED") {
      completedEvents.push({
        id: "claim-window",
        phase: "COMPLETED",
        status: "DONE",
        title: "Claim Window Closed",
        timestamp: null,
        description: "Post-trip claim period has ended.",
      });
    }
  }

  // Determine phase statuses
  const phase1Status = beforeTripEvents.every((e) => e.status === "DONE")
    ? "COMPLETED"
    : "ACTIVE";

  const phase2Status = isTransportCompleted
    ? "COMPLETED"
    : isTransportActive || beforeTripEvents.every((e) => e.status === "DONE")
      ? "ACTIVE"
      : "UPCOMING";

  const phase3Status =
    isTransportCompleted && completedEvents.some((e) => e.status === "DONE")
      ? completedEvents.every((e) => e.status === "DONE")
        ? "COMPLETED"
        : "ACTIVE"
      : "UPCOMING";

  return [
    {
      phase: "BEFORE_TRIP",
      title: "Stage 1: Before Trip",
      description: "Booking approval, deposit payment, compliance dossiers & vehicle dispatch",
      status: phase1Status,
      events: beforeTripEvents,
    },
    {
      phase: "IN_TRANSIT",
      title: "Stage 2: In Transit",
      description: "Origin pickup handover, border crossings & live segment transit",
      status: phase2Status,
      events: inTransitEvents,
    },
    {
      phase: "COMPLETED",
      title: "Stage 3: Completed",
      description: "Destination arrival, delivery handover, final invoice & claim window",
      status: phase3Status,
      events: completedEvents,
    },
  ];
}
