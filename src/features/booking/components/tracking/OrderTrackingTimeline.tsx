import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Truck,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { Booking } from "../../types";
import {
  buildOrderTimeline,
  type OrderTimelineEvent,
  type OrderTimelinePhaseGroup,
} from "../../lib/order-timeline";
import { useBookingInvoices } from "@/features/invoice/hooks/useInvoices";
import type { InvoiceListItem } from "@/features/invoice/types";
import { useDossierByBooking, useDossierOverview } from "@/features/dossier/hooks/useDossier";
import type { BookingDossierLink } from "@/features/dossier/schemas";
import { useTransportOverview } from "@/features/ongoing-transport/hooks/useTransportOverview";
import { useTransportSegments } from "@/features/ongoing-transport/hooks/useTransportSegments";
import { useHandoverList } from "@/features/handover/hooks/useHandovers";
import type { HandoverListItem } from "@/features/handover/types";
import { useClaimEligibility } from "@/features/claim/hooks";

const emptyInvoices: InvoiceListItem[] = [];
const emptyDossiers: BookingDossierLink[] = [];
const emptyHandovers: HandoverListItem[] = [];

interface OrderTrackingTimelineProps {
  booking: Booking;
  onSelectTab: (tab: string, queryParam?: { key: string; value: string }) => void;
}

export function OrderTrackingTimeline({
  booking,
  onSelectTab,
}: OrderTrackingTimelineProps) {
  const bookingId = String(booking.bookingId);
  const transportId = booking.transport?.transportId
    ? String(booking.transport.transportId)
    : undefined;

  const transportStatus = booking.transport?.status;
  const canFetchTransport = Boolean(
    transportId && ["READY", "IN_TRANSIT", "COMPLETED"].includes(transportStatus ?? "")
  );

  // Invoices (Customer)
  const invoicesQuery = useBookingInvoices(
    bookingId,
    { pageIndex: 1, pageSize: 20, sortBy: "createdAt:desc" },
    "customer"
  );
  const invoices = invoicesQuery.data?.items ?? emptyInvoices;

  // Dossier (Customer)
  const dossierListQuery = useDossierByBooking(bookingId);
  const dossiers = dossierListQuery.data ?? emptyDossiers;
  const primaryDossierId = dossiers[0]?.complianceDossierId;
  const dossierOverviewQuery = useDossierOverview(primaryDossierId);
  const dossierOverview = dossierOverviewQuery.data ?? null;

  // Transport details (polled 30s when visible in ongoing-transport hooks)
  const overviewQuery = useTransportOverview(
    canFetchTransport ? transportId : undefined,
    bookingId,
    "customer",
    "data",
    canFetchTransport
  );
  const transportOverview = canFetchTransport ? overviewQuery.data ?? null : null;

  const segmentsQuery = useTransportSegments(
    canFetchTransport ? transportId : undefined,
    bookingId,
    "customer",
    "data",
    canFetchTransport
  );
  const transportSegments = canFetchTransport ? segmentsQuery.data?.segments ?? null : null;

  // Handovers (Customer sees PICKUP and DELIVERY)
  const handoversQuery = useHandoverList(
    transportId ?? "",
    {}
  );
  const handovers = canFetchTransport ? handoversQuery.data?.items ?? emptyHandovers : emptyHandovers;

  // Claim eligibility
  const claimEligibilityQuery = useClaimEligibility(bookingId);
  const claimEligibility = claimEligibilityQuery.data ?? null;

  const phases = useMemo<OrderTimelinePhaseGroup[]>(() => {
    return buildOrderTimeline({
      booking,
      invoices,
      dossiers,
      dossierOverview: dossierOverview
        ? {
          status: dossierOverview.status,
          progressPercent: dossierOverview.progressPercent,
          approvedAt: dossierOverview.approvedAt,
          readyForSubmissionAt: dossierOverview.readyForSubmissionAt,
          openedAt: dossierOverview.openedAt,
        }
        : null,
      transportOverview,
      transportSegments,
      handovers,
      claimEligibility,
    });
  }, [
    booking,
    invoices,
    dossiers,
    dossierOverview,
    transportOverview,
    transportSegments,
    handovers,
    claimEligibility,
  ]);

  const isLoadingInitial =
    invoicesQuery.isLoading ||
    dossierListQuery.isLoading ||
    (canFetchTransport && overviewQuery.isLoading);

  return (
    <div className="space-y-4">
      {/* Top Progress Highlight Banner (Card bo 2px, no gradient) */}
      <div className="rounded-[2px] border border-[#e5e2d9] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
              <Truck className="size-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-700">
                  Order Tracking
                </span>
                <span className="text-xs text-gray-300">•</span>
                <span className="font-mono text-xs font-bold text-gray-900">
                  {booking.bookingCode}
                </span>
                {transportOverview?.transport.transportCode ? (
                  <Badge variant="outline" className="text-[10px] uppercase font-mono rounded-[2px]">
                    Trip {transportOverview.transport.transportCode}
                  </Badge>
                ) : null}
              </div>
              <h2 className="mt-1 text-sm font-bold text-gray-900">
                {booking.originCountry} <ArrowRight className="inline size-3.5 text-gray-400" /> {booking.destinationCountry}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {booking.horses.length} {booking.horses.length === 1 ? "horse" : "horses"} booked
                {booking.requestedDepartureDate ? ` · Expected departure: ${booking.requestedDepartureDate.slice(0, 10)}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoadingInitial ? (
        <div className="space-y-4 rounded-[2px] border border-[#e5e2d9] bg-white p-6">
          <Skeleton className="h-5 w-48 rounded-[2px]" />
          <Skeleton className="h-20 w-full rounded-[2px]" />
          <Skeleton className="h-20 w-full rounded-[2px]" />
        </div>
      ) : (
        <div className="space-y-4">
          {phases.map((group) => (
            <div
              key={group.phase}
              className="rounded-[2px] border border-[#e5e2d9] bg-white p-5"
            >
              {/* Phase Header */}
              <div className="mb-4 flex flex-col gap-1 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-bold uppercase tracking-normal text-gray-900">
                      {group.title}
                    </h3>
                    <PhaseStatusBadge status={group.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {group.description}
                  </p>
                </div>
                <div className="text-right text-[11px] font-medium text-gray-400">
                  {group.events.filter((e) => e.status === "DONE").length} of {group.events.length} completed
                </div>
              </div>

              {/* Vertical Timeline */}
              <div className="relative pl-6 sm:pl-8">
                {/* Vertical continuous track line */}
                <div className="absolute top-3 bottom-3 left-[11px] sm:left-[15px] w-0.5 bg-gray-200" aria-hidden="true" />

                <div className="space-y-4">
                  {group.events.map((event, idx) => (
                    <TimelineEventItem
                      key={event.id || idx}
                      event={event}
                      onSelectTab={onSelectTab}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhaseStatusBadge({ status }: { status: "COMPLETED" | "ACTIVE" | "UPCOMING" | "TERMINATED" }) {
  if (status === "COMPLETED") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold rounded-[2px]">
        Stage Completed
      </Badge>
    );
  }
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold rounded-[2px] animate-pulse">
        In Progress
      </Badge>
    );
  }
  if (status === "TERMINATED") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px] font-semibold rounded-[2px]">
        Terminated
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-gray-500 border-gray-200 text-[10px] rounded-[2px]">
      Upcoming
    </Badge>
  );
}

function TimelineEventItem({
  event,
  onSelectTab,
}: {
  event: OrderTimelineEvent;
  onSelectTab: (tab: string, queryParam?: { key: string; value: string }) => void;
}) {
  const isDone = event.status === "DONE";
  const isCurrent = event.status === "CURRENT";
  const isException = event.status === "EXCEPTION";
  const isUpcoming = event.status === "UPCOMING";

  return (
    <div className="relative flex items-start gap-4">
      {/* Node Icon on track (dots keep circular shape) */}
      <div
        className={cn(
          "absolute -left-6 sm:-left-8 flex size-6 items-center justify-center rounded-full bg-white ring-4 ring-white transition-all",
          isDone && "text-emerald-600",
          isCurrent && "text-amber-500 shadow-xs",
          isException && "text-red-500",
          isUpcoming && "text-gray-300"
        )}
      >
        {isDone ? (
          <CheckCircle2 className="size-5 fill-emerald-100 text-emerald-600" />
        ) : isCurrent ? (
          <div className="relative flex size-5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <Clock className="relative size-4 text-amber-600" />
          </div>
        ) : isException ? (
          <AlertCircle className="size-5 fill-red-100 text-red-600" />
        ) : (
          <Circle className="size-3.5 fill-gray-100 text-gray-300" />
        )}
      </div>

      {/* Event Details Card (rounded-[2px]) */}
      <div
        className={cn(
          "flex-1 rounded-[2px] border p-3.5 transition-colors",
          isCurrent
            ? "border-amber-300 bg-amber-50/40"
            : isException
              ? "border-red-300 bg-red-50/30"
              : isDone
                ? "border-[#e5e2d9] bg-white"
                : "border-gray-200 bg-[#faf9f6] opacity-80"
        )}
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4
                className={cn(
                  "text-xs font-semibold",
                  isCurrent ? "text-amber-950 font-bold" : isDone ? "text-gray-900" : isException ? "text-red-900" : "text-gray-600"
                )}
              >
                {event.title}
              </h4>
              {event.badges?.map((badge, bIdx) => (
                <Badge
                  key={bIdx}
                  variant={
                    badge.variant === "success"
                      ? "default"
                      : badge.variant === "destructive"
                        ? "destructive"
                        : "secondary"
                  }
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wider py-0 px-1.5 rounded-[2px]",
                    badge.variant === "success" && "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
                    badge.variant === "warning" && "bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-300"
                  )}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              {event.description}
            </p>
          </div>

          {event.timestamp ? (
            <div className="shrink-0 text-right">
              <span className="inline-block text-[11px] font-medium text-gray-500">
                <DateTimeUtc value={event.timestamp} compact />
              </span>
            </div>
          ) : null}
        </div>

        {/* Action Button (CTA) */}
        {event.cta ? (
          <div className="mt-2.5 flex items-center gap-2 border-t border-gray-100 pt-2.5">
            {event.cta.to ? (
              <Link
                to={event.cta.to}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {event.cta.label}
                <ExternalLink className="size-3" />
              </Link>
            ) : event.cta.tab ? (
              <button
                type="button"
                onClick={() => onSelectTab(event.cta!.tab!, event.cta!.queryParam)}
                className="inline-flex items-center gap-1 rounded-[2px] bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-500/25 transition-colors cursor-pointer"
              >
                {event.cta.label}
                <ArrowRight className="size-3" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
