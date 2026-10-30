import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
  // On desktop the crew sees the same breadcrumb header as the staff; the compact crew header is for phones.
  const isCrew = audience === "crew" && !isDesktop;
  const returnState = readOngoingListReturn(location.state);
  const backPath =
    audience === "admin"
      ? ROLE_ROUTES.ongoingTransports
      : audience === "customer" && bookingId
        ? `/bookings/${encodeURIComponent(bookingId)}`
        : isCrew
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
  const title = transportCode ?? viewLabel[isCrew ? "overview" : view];
  return (
    <>
      {!isCrew ? (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-500"
        >
          <Link
            to={backPath}
            state={
              audience === "admin" && returnState
                ? { ongoingTransportList: returnState }
                : undefined
            }
            className="inline-flex items-center gap-1 rounded-xs hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            {backLabel}
          </Link>
          <ChevronRight aria-hidden="true" className="size-3" />
          {view !== "overview" && !missingContext ? (
            <>
              <Link
                to={transportOverviewPath(transportId!, audience, bookingId)}
                state={location.state}
                className="rounded-xs hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
              >
                {transportCode ?? "Transport Overview"}
              </Link>
              <ChevronRight aria-hidden="true" className="size-3" />
            </>
          ) : null}
          <span aria-current="page" className="font-medium text-slate-700">
            {view === "overview" ? title : viewLabel[view]}
          </span>
        </nav>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <PageHeader
              title={title}
              backHref={backPath}
              showBack={isCrew}
              action={
                isCrew && status ? (
                  <OngoingTransportStatusBadge status={status} />
                ) : undefined
              }
              className={`w-auto [&_h1]:!my-0 [&_h1]:!text-slate-900 ${isCrew ? "gap-1 [&_h1]:!text-2xl [&_h1]:!leading-tight sm:[&_h1]:!text-3xl" : "[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl"}`}
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
