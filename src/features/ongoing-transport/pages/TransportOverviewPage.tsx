import { useState } from "react";
import { useParams } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { ErrorState } from "@/shared/components/common";
import { TransportPageHeader } from "../components/TransportPageHeader";
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
        <TransportPageHeader
          audience={audience}
          bookingId={bookingId}
          transportId={transportId}
          transportCode={overview?.transport.transportCode}
          bookingCode={overview?.booking.bookingCode}
          status={overview?.transport.status}
          view="overview"
          busy={query.isFetching}
          online={query.online}
          onRefresh={() => void query.refetch()}
        />
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
