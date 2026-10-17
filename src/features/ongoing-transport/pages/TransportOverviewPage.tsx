import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { OngoingTransportStatusBadge } from "../components/OngoingTransportStatusBadge";
import { TransportTabs } from "../components/TransportTabs";
import { TransportJourneySummary } from "../components/TransportJourneySummary";
import {
  TransportDossiers,
  TransportHorseHealthSummary,
  TransportJourneyInformation,
  TransportStaff,
} from "../components/TransportOverviewSections";
import { TransportIncidents } from "../components/TransportIncidents";
import { TransportOverviewSkeleton } from "../components/TransportOverviewSkeleton";
import { TransportOverviewMockControls } from "../components/TransportOverviewMockControls";
import { useTransportOverview } from "../hooks/useTransportOverview";
import { readOngoingListReturn } from "../navigation";
import { formatTransportDate, formatTransportTime } from "../format";
import { getOngoingTransportError } from "../services";
import type { OverviewScenario, TransportAudience } from "../types";
import "../ui.css";

export default function TransportOverviewPage({
  audience,
}: {
  audience: TransportAudience;
}) {
  const { transportId, bookingId } = useParams<{
    transportId: string;
    bookingId: string;
  }>();
  const location = useLocation();
  const [scenario, setScenario] = useState<OverviewScenario>("data");
  const query = useTransportOverview(
    transportId,
    bookingId,
    audience,
    scenario,
  );
  const error = query.isError
    ? getOngoingTransportError(query.error, "overview")
    : null;
  // Only transient failures may retain a previously authorized Crew response.
  const cached =
    audience === "crew" &&
    query.data &&
    (!query.online || query.isError) &&
    (!error || error.retryable);
  const fatal = error && !cached ? error : null;
  const overview = fatal ? undefined : query.data;
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

  return (
    <div
      className="ongoing-transport-ui transport-overview booking-page-shell min-h-[calc(100svh-5rem)] min-w-0 px-4 py-4 font-sans sm:px-6 lg:py-6"
      data-audience={audience}
    >
      <div
        className={`mx-auto w-full min-w-0 space-y-4 ${audience === "crew" ? "max-w-4xl" : "booking-page-enter max-w-[1440px]"}`}
      >
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
          <span aria-current="page" className="font-medium text-slate-700">
            {overview?.transport.transportCode ?? "Transport Overview"}
          </span>
        </nav>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PageHeader
                title={
                  overview?.transport.transportCode ?? "Transport Overview"
                }
                backHref={backPath}
                showBack={false}
                className="w-auto [&_h1]:!my-0 [&_h1]:!text-slate-900 [&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl"
              />
              {overview ? (
                <OngoingTransportStatusBadge
                  status={overview.transport.status}
                />
              ) : null}
            </div>
            <p className="mt-2 mb-0 text-xs text-slate-500 sm:text-sm">
              Monitor current leg, horse welfare, staff assignment and active
              incidents.
            </p>
            {overview ? (
              <p className="mt-1 mb-0 text-[11px] text-slate-500">
                {overview.booking.bookingCode} · Times shown in your local
                timezone
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetching || !query.online || missingContext}
            onClick={() => void query.refetch()}
            className="h-8 rounded-xs border-slate-300 bg-white text-xs"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-3.5 ${query.isFetching ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
            Refresh
          </Button>
        </header>
        {!missingContext ? (
          <TransportTabs
            transportId={transportId!}
            bookingId={bookingId}
            audience={audience}
            canViewGpsTab={overview?.canViewGpsTab ?? false}
          />
        ) : null}
        <TransportOverviewMockControls
          scenario={scenario}
          onChange={setScenario}
        />
        {cached && overview ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xs border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span>
              Đang hiển thị dữ liệu đã lưu lúc{" "}
              {formatTransportTime(overview.serverTime)}. Đang tự động kết nối
              lại khi có mạng…
            </span>
          </div>
        ) : null}
        {missingContext ? (
          <ErrorState message="Transport route information is missing." />
        ) : fatal ? (
          <div className="[&>div]:rounded-xs [&>div]:p-6 [&>div]:text-sm">
            <ErrorState
              message={fatal.message}
              onRetry={
                fatal.retryable && query.online
                  ? () => void query.refetch()
                  : undefined
              }
            />
          </div>
        ) : !overview && !query.online ? (
          <div
            role="status"
            className="overview-panel p-6 text-sm text-slate-600"
          >
            You are offline and no cached overview is available. Reconnect to
            load this transport.
          </div>
        ) : !overview ? (
          <TransportOverviewSkeleton />
        ) : (
          <>
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500"
              role="status"
            >
              <span>
                {cached ? "Cached response" : "Latest successful response"}:{" "}
                {formatTransportDate(overview.serverTime)}
              </span>
              <span>
                {!query.online
                  ? "Updates paused while offline"
                  : query.isFetching
                    ? "Updating overview…"
                    : "Refreshes every 30 seconds while this view is visible"}
              </span>
            </div>
            <TransportJourneySummary overview={overview} />
            <div className="overview-panel grid divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
              <TransportJourneyInformation overview={overview} />
              <TransportHorseHealthSummary
                summary={overview.horseHealthSummary}
              />
              <TransportStaff segment={overview.currentSegment} />
            </div>
            <TransportDossiers dossiers={overview.complianceDossiers} />
            <TransportIncidents incidents={overview.activeIncidents} />
          </>
        )}
      </div>
    </div>
  );
}
