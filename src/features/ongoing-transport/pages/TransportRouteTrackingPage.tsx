import { useParams } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { ErrorState } from "@/shared/components/common";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TransportRouteTimeline } from "../components/TransportRouteTimeline";
import { useTransportSegments } from "../hooks/useTransportSegments";
import { useTransportOverview } from "../hooks/useTransportOverview";
import { getOngoingTransportError } from "../services";
import { formatTransportDate, formatTransportTime } from "../format";
import type { TransportAudience } from "../types";

export default function TransportRouteTrackingPage({
  audience,
}: {
  audience: TransportAudience;
}) {
  const { transportId, bookingId } = useParams<{
    transportId: string;
    bookingId: string;
  }>();
  const query = useTransportSegments(transportId, bookingId, audience, "data");
  // The shell header reads OT3 for the code, booking and GPS permission; this page only reports when that metadata is missing.
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
  const missingContext =
    transportId === undefined ||
    (audience === "customer" && bookingId === undefined);
  return (
    <>
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
            Showing cached data from{" "}
            {formatTransportTime(data.serverTime)}. Automatically reconnecting when
            network is available…
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
            key={`${transportId}-${audience}`}
            data={data}
            audience={audience}
          />
        </>
      )}
    </>
  );
}
