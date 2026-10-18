import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react";
import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { readOngoingListReturn, transportOverviewPath } from "../navigation";
import type { OngoingTransportStatus, TransportAudience } from "../types";
import { OngoingTransportStatusBadge } from "./OngoingTransportStatusBadge";

export function TransportPageHeader({
  audience,
  bookingId,
  transportId,
  transportCode,
  bookingCode,
  status,
  view,
  busy,
  online,
  onRefresh,
}: {
  audience: TransportAudience;
  bookingId?: string;
  transportId?: string;
  transportCode?: string;
  bookingCode?: string;
  status?: OngoingTransportStatus;
  view: "overview" | "segments";
  busy: boolean;
  online: boolean;
  onRefresh: () => void;
}) {
  const location = useLocation();
  const returnState = readOngoingListReturn(location.state);
  const backPath =
    audience === "admin"
      ? ROLE_ROUTES.ongoingTransports
      : audience === "customer" && bookingId
        ? `/bookings/${encodeURIComponent(bookingId)}`
        : ROLE_ROUTES.home;
  const backLabel =
    audience === "admin"
      ? "Ongoing Transports"
      : audience === "customer"
        ? "Booking"
        : "Home";
  const missingContext =
    transportId === undefined ||
    (audience === "customer" && bookingId === undefined);
  const title =
    transportCode ??
    (view === "segments" ? "Route Tracking" : "Transport Overview");
  return (
    <>
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
        {view === "segments" && !missingContext ? (
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
          {view === "segments" ? "Route Tracking" : title}
        </span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <PageHeader
              title={title}
              backHref={backPath}
              showBack={false}
              className="w-auto [&_h1]:!my-0 [&_h1]:!text-slate-900 [&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl"
            />
            {status ? <OngoingTransportStatusBadge status={status} /> : null}
          </div>
          <p className="mt-2 mb-0 text-xs text-slate-500 sm:text-sm">
            {view === "segments"
              ? "Follow the effective itinerary, leg resources and handover boundaries."
              : "Monitor current leg, horse welfare, staff assignment and active incidents."}
          </p>
          {bookingCode ? (
            <p className="mt-1 mb-0 text-[11px] text-slate-500">
              {bookingCode} · Times shown in your local timezone
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !online || missingContext}
          onClick={onRefresh}
          className="h-8 rounded-xs border-slate-300 bg-white text-xs"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-3.5 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`}
          />
          Refresh
        </Button>
      </header>
    </>
  );
}
