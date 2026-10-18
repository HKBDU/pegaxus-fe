import { useState } from "react";
import { useParams } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TransportPageHeader } from "../components/TransportPageHeader";
import { TransportTabs } from "../components/TransportTabs";
import { TransportRouteTimeline } from "../components/TransportRouteTimeline";
import { TransportSegmentsMockControls } from "../components/TransportSegmentsMockControls";
import { useTransportSegments } from "../hooks/useTransportSegments";
import { useTransportOverview } from "../hooks/useTransportOverview";
import { getOngoingTransportError } from "../services";
import { formatTransportDate, formatTransportTime } from "../format";
import type { SegmentsScenario, TransportAudience } from "../types";
import "../ui.css";

export default function TransportRouteTrackingPage({
  audience,
}: {
  audience: TransportAudience;
}) {
  const { transportId, bookingId } = useParams<{
    transportId: string;
    bookingId: string;
  }>();
  const [scenario, setScenario] = useState<SegmentsScenario>("data");
  const query = useTransportSegments(
    transportId,
    bookingId,
    audience,
    scenario,
  );
  // OT3 supplies the code, booking and GPS permission absent from OT4, without a second polling loop.
  const metadataQuery = useTransportOverview(
    transportId,
    bookingId,
    audience,
    "data",
    false,
  );
  const error = query.isError
    ? getOngoingTransportError(query.error, "segments")
    : null;
  const cached =
    audience === "crew" &&
    query.data &&
    (!query.online || query.isError) &&
    (!error || error.retryable);
  const fatal = error && !cached ? error : null;
  const data = fatal ? undefined : query.data;
  const metadata =
    !fatal && !metadataQuery.isError ? metadataQuery.data : undefined;
  const missingContext =
    transportId === undefined ||
    (audience === "customer" && bookingId === undefined);
  return (
    <div
      className="ongoing-transport-ui transport-overview route-tracking booking-page-shell min-h-[calc(100svh-5rem)] min-w-0 px-4 py-4 font-sans sm:px-6 lg:py-6"
      data-audience={audience}
    >
      <div
        className={`mx-auto w-full min-w-0 space-y-4 ${audience === "crew" ? "max-w-4xl" : "booking-page-enter max-w-[1440px]"}`}
      >
        <TransportPageHeader
          audience={audience}
          bookingId={bookingId}
          transportId={transportId}
          transportCode={metadata?.transport.transportCode}
          bookingCode={metadata?.booking.bookingCode}
          status={data?.transportStatus}
          view="segments"
          busy={query.isFetching || metadataQuery.isFetching}
          online={query.online}
          onRefresh={() => {
            void query.refetch();
            void metadataQuery.refetch();
          }}
        />
        {!missingContext ? (
          <TransportTabs
            transportId={transportId!}
            bookingId={bookingId}
            audience={audience}
            canViewGpsTab={metadata?.canViewGpsTab ?? false}
          />
        ) : null}
        <TransportSegmentsMockControls
          scenario={scenario}
          onChange={setScenario}
        />
        {cached && data ? (
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
              {formatTransportTime(data.serverTime)}. Đang tự động kết nối lại
              khi có mạng…
            </span>
          </div>
        ) : null}
        {missingContext ? (
          <ErrorState message="Transport route information is missing." />
        ) : fatal ? (
          <ErrorState
            message={fatal.message}
            onRetry={
              fatal.retryable && query.online
                ? () => void query.refetch()
                : undefined
            }
          />
        ) : !data && !query.online ? (
          <div
            role="status"
            className="overview-panel p-6 text-sm text-slate-600"
          >
            You are offline and no cached itinerary is available. Reconnect to
            load this transport.
          </div>
        ) : !data ? (
          <div
            aria-label="Loading route tracking"
            aria-busy="true"
            className="space-y-4"
          >
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xs" />
            ))}
          </div>
        ) : (
          <>
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-500"
            >
              <span>
                {cached ? "Cached response" : "Latest successful response"}:{" "}
                {formatTransportDate(data.serverTime)}
              </span>
              <span>
                {!query.online
                  ? "Updates paused while offline"
                  : query.isFetching
                    ? "Updating itinerary…"
                    : "Refreshes every 30 seconds while this view is visible"}
              </span>
            </div>
            {metadataQuery.isError ? (
              <p role="status" className="text-xs text-slate-500">
                Overview metadata is unavailable. The itinerary below comes from
                the route tracking API.
              </p>
            ) : null}
            <TransportRouteTimeline
              key={`${transportId}-${audience}-${scenario}`}
              data={data}
              audience={audience}
            />
          </>
        )}
      </div>
    </div>
  );
}
