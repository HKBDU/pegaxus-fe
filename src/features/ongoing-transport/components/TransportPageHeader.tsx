import { useLocation } from "react-router-dom";
import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { useIsDesktop } from "@/shared/hooks";
import {
  readOngoingListReturn,
  transportOverviewPath,
  type TransportView,
} from "../navigation";
import type { OngoingTransportStatus, TransportAudience } from "../types";
import { OngoingTransportStatusBadge } from "./OngoingTransportStatusBadge";

const viewLabel: Record<TransportView, string> = {
  overview: "Transport Overview",
  segments: "Route Tracking",
  health: "Horse Health",
  gps: "GPS Map",
  handovers: "Handovers",
};

const viewDescription: Record<TransportView, string> = {
  overview:
    "Monitor current leg, horse welfare, staff assignment and active incidents.",
  segments:
    "Follow the effective itinerary, leg resources and handover boundaries.",
  health: "Review the latest health check of every horse on this transport.",
  gps: "Follow the vehicle on the planned route in real time.",
  handovers: "Track the handover records of every leg of this transport.",
};

export function TransportPageHeader({
  audience,
  bookingId,
  transportId,
  transportCode,
  bookingCode,
  status,
  view,
}: {
  audience: TransportAudience;
  bookingId?: string;
  transportId?: string;
  transportCode?: string;
  bookingCode?: string;
  status?: OngoingTransportStatus;
  view: TransportView;
}) {
  const location = useLocation();
  const isDesktop = useIsDesktop();
  // Crew phones retain the overview metadata across operational tabs.
  const isCrew = audience === "crew" && !isDesktop;
  const returnState = readOngoingListReturn(location.state);
  const backPath =
    audience === "admin"
      ? ROLE_ROUTES.ongoingTransports
      : audience === "customer" && bookingId
        ? `/bookings/${encodeURIComponent(bookingId)}`
        : audience === "crew"
          ? "/crew/transports"
          : ROLE_ROUTES.home;
  const backLabel =
    audience === "admin"
      ? "Ongoing Transports"
      : audience === "customer"
        ? "Booking"
        : "Assigned Transports";
  const missingContext =
    transportId === undefined ||
    (audience === "customer" && bookingId === undefined);
  const backToOverview = !isCrew && view !== "overview" && !missingContext;
  const title = transportCode ?? viewLabel[isCrew ? "overview" : view];
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <PageHeader
              title={title}
              backHref={
                backToOverview
                  ? transportOverviewPath(transportId!, audience, bookingId)
                  : backPath
              }
              backLabel={
                backToOverview
                  ? `Back to ${transportCode ?? "Transport overview"}`
                  : `Back to ${backLabel}`
              }
              backState={
                backToOverview
                  ? location.state
                  : audience === "admin" && returnState
                    ? { ongoingTransportList: returnState }
                    : undefined
              }
              size="compact"
              action={
                isCrew && status ? (
                  <OngoingTransportStatusBadge status={status} />
                ) : undefined
              }
              className="w-auto gap-1"
            />
            {!isCrew && status ? (
              <OngoingTransportStatusBadge status={status} />
            ) : null}
          </div>
          <p className="mt-2 mb-0 text-xs text-slate-500 sm:text-sm">
            {viewDescription[isCrew ? "overview" : view]}
          </p>
          {bookingCode ? (
            <p className="mt-1 mb-0 text-[11px] text-slate-500">
              {bookingCode} · Times shown in your local timezone
            </p>
          ) : null}
        </div>
      </header>
    </>
  );
}
