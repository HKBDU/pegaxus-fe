import { lazy, Suspense, useMemo } from "react"
import { useParams } from "react-router-dom"
import { ErrorState, LoadingState } from "@/shared/components/common"
import { FEATURES, isDemoMode, type TrackingAudience } from "../constants"
import { StatusBadge } from "../components/StatusBadge"
import { CollapseAdminSidebar } from "../components/CollapseAdminSidebar"
import { JourneySection } from "../components/JourneySection"
import { LiveSummaryCard } from "../components/LiveSummaryCard"
import { SignalNotices } from "../components/SignalNotices"
import { TransportTabs } from "../components/TransportTabs"
import { useLiveTruck } from "../hooks/useLiveTruck"
import { useTransportOverview, useTransportSegments } from "../hooks/useJourneyDetails"
import { useRouteEstimate } from "../hooks/useRouteEstimate"
import { remainingStops } from "../lib/route-stops"
import { fromTrackingSegments } from "../lib/summary"
import { getTrackingErrorMessage, isRetryableTrackingError } from "../services"

// The map library is the heaviest dependency of the app: load it only when this tab opens.
const TrackingMap = lazy(() => import("../components/TrackingMap"))
// Dev-only demo controls (`?demo=1`); the condition is a build-time constant, so a production build has no demo code.
const DemoPanel = import.meta.env.DEV ? lazy(() => import("../mock/DemoPanel")) : null

interface GpsTabContentProps {
  audience: TrackingAudience
  transportId: string
  bookingId?: string
}

function GpsTabContent({ audience, transportId, bookingId }: GpsTabContentProps) {
  const { query, snapshot, truck, trail, signal, now, skewMs, streamState, streamError } = useLiveTruck(transportId)
  const completed = snapshot?.transportStatus === "COMPLETED"
  const stops = useMemo(
    () => (!snapshot || completed ? [] : remainingStops(snapshot.plannedRoute.segments, snapshot.nextStop)),
    [snapshot, completed],
  )
  const { estimate, failed } = useRouteEstimate(truck, stops)
  // OT3/OT4 are read only after GP1 succeeded: a transport the BE will not track has nothing else to show.
  const segmentsQuery = useTransportSegments(transportId, snapshot !== undefined)
  const overviewQuery = useTransportOverview(transportId, snapshot !== undefined)
  const overview = overviewQuery.data
  const segments = useMemo(
    () => segmentsQuery.data?.segments.toSorted((a, b) => a.displayOrder - b.displayOrder) ?? (snapshot ? fromTrackingSegments(snapshot.plannedRoute.segments) : []),
    [segmentsQuery.data, snapshot],
  )

  return (
    <section className="mx-auto grid w-full max-w-[1600px] gap-5 px-4 py-5 sm:px-6 lg:px-8" aria-labelledby="gps-tab-title">
      <header className="grid gap-1">
        <h1 id="gps-tab-title" className="font-heading text-2xl font-medium uppercase tracking-[0.04em]">
          Live GPS Tracking
        </h1>
        {snapshot ? (
          <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {overview ? <span className="font-semibold text-gray-800">{overview.transport.transportCode}</span> : null}
            <StatusBadge status={snapshot.transportStatus} />
            {overview ? <span>Booking {overview.booking.bookingCode}</span> : null}
          </p>
        ) : null}
      </header>

      {audience === "admin" ? <CollapseAdminSidebar /> : null}
      <TransportTabs audience={audience} transportId={transportId} bookingId={bookingId} />

      {DemoPanel && isDemoMode() ? (
        <Suspense fallback={null}>
          <DemoPanel />
        </Suspense>
      ) : null}

      {query.isPending ? (
        <LoadingState />
      ) : query.isError && !snapshot ? (
        <ErrorState message={getTrackingErrorMessage(query.error)} onRetry={isRetryableTrackingError(query.error) ? () => void query.refetch() : undefined} />
      ) : snapshot ? (
        <>
          <SignalNotices snapshot={snapshot} truck={truck} signal={signal} realtime={FEATURES.realtimeStream} streamState={streamState} streamError={streamError} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Suspense fallback={<div className="h-[clamp(440px,calc(100vh-9rem),720px)] animate-pulse rounded-lg border bg-muted" role="status" aria-label="Loading map" />}>
              <TrackingMap segments={snapshot.plannedRoute.segments} nextStop={snapshot.nextStop} truck={truck} trail={trail} signal={signal} />
            </Suspense>
            {/* Next to the map on wide screens (scrolls inside its own box), above it on narrow ones. */}
            <div className="order-first lg:order-none lg:h-[clamp(440px,calc(100vh-9rem),720px)] lg:overflow-y-auto">
              <LiveSummaryCard
                overview={overview}
                segments={segments}
                snapshot={snapshot}
                truck={truck}
                signal={signal}
                estimate={estimate}
                estimateFailed={failed}
                skewMs={skewMs}
                now={now}
              />
            </div>
          </div>
          <JourneySection overview={overview} segments={segments} detailsUnavailable={segmentsQuery.isError} onRetryDetails={() => void segmentsQuery.refetch()} />
        </>
      ) : null}
    </section>
  )
}

/** Tab 4 of a transport (SCR-F4-007): the planned route and the vehicle on one map, for staff and for the booking's Customer. */
export default function GpsTabPage({ audience }: { audience: TrackingAudience }) {
  const { transportId = "", bookingId } = useParams()
  // A new transport id starts with an empty trail and a fresh stream.
  return <GpsTabContent key={transportId} audience={audience} transportId={transportId} bookingId={bookingId} />
}
