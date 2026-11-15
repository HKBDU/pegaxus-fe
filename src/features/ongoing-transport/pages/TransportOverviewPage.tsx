import { Link, useParams } from "react-router-dom";
import { FileCheck2, Navigation, ShieldCheck, TriangleAlert } from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { driverLocationSharingPath } from "@/features/location-sharing/navigation";
import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/common";
import { TransportJourneySummary } from "../components/TransportJourneySummary";
import {
  TransportDossiers,
  TransportHorseHealthSummary,
  TransportJourneyInformation,
  TransportStaff,
} from "../components/TransportOverviewSections";
import { TransportIncidents } from "../components/TransportIncidents";
import { TransportOverviewSkeleton } from "../components/TransportOverviewSkeleton";
import { useTransportOverview } from "../hooks/useTransportOverview";
import { formatTransportDate, formatTransportTime } from "../format";
import { getOngoingTransportError } from "../services";
import type { TransportAudience } from "../types";
import { incidentRoutes } from "@/features/incident-management/constants";
import { HORSE_HEALTH_ROUTES } from "@/features/horse-health/constants";

export default function TransportOverviewPage({
  audience,
}: {
  audience: TransportAudience;
}) {
  const principal = useAuthStore((state) => state.principal);
  const { transportId, bookingId } = useParams<{
    transportId: string;
    bookingId: string;
  }>();
  const query = useTransportOverview(transportId, bookingId, audience, "data");
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
    <>
      {audience === "crew" &&
      canAccess(principal, { anyRole: ["DRIVER"] }) &&
      transportId !== undefined &&
      overview?.transport.status === "IN_TRANSIT" &&
      query.online &&
      !query.isError ? (
        <Button
          asChild
          variant="outline"
          className="min-h-16 w-full justify-start rounded-xs border-primary/40 bg-white px-4 py-3 text-base whitespace-normal"
        >
          <Link to={driverLocationSharingPath(transportId)}>
            <Navigation aria-hidden="true" className="size-5 text-primary" />
            Share Journey Location
          </Link>
        </Button>
      ) : null}
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
            Showing cached data from {formatTransportTime(overview.serverTime)}.
            Automatically reconnecting when network is available…
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
          You are offline and no cached overview is available. Reconnect to load
          this transport.
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
          <section
            className="overview-panel overview-summary"
            aria-label="Transport essentials"
          >
            <TransportJourneyInformation overview={overview} />
            <TransportHorseHealthSummary
              summary={overview.horseHealthSummary}
            />
            <TransportStaff segment={overview.currentSegment} />
          </section>
          <TransportDossiers dossiers={overview.complianceDossiers} />
          {audience === "crew" && overview.complianceDossiers.length > 0 &&
          (canAccess(principal, { anyRole: ["DRIVER"] }) ||
            canAccess(principal, { anyRole: ["ESCORT"] })) ? (
            <section className="overview-panel" aria-labelledby="transport-declarations">
              <div className="overview-cell">
                <h2 id="transport-declarations" className="overview-heading">
                  Declarations
                </h2>
                <ul className="mt-3 mb-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                  {overview.complianceDossiers.map((dossier) => (
                    <li key={dossier.complianceDossierId} className="flex flex-wrap gap-2">
                      {canAccess(principal, { anyRole: ["ESCORT"] }) ? (
                        <Button asChild variant="outline" className="min-h-11 flex-1 justify-start rounded-xs">
                          <Link to={HORSE_HEALTH_ROUTES.quarantine(dossier.complianceDossierId)} state={{ bookingCode: overview.booking.bookingCode, route: `${overview.booking.originCountry} → ${overview.booking.destinationCountry}`, originCountry: overview.booking.originCountry, destinationCountry: overview.booking.destinationCountry }}>
                            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                            Declare quarantine
                          </Link>
                        </Button>
                      ) : null}
                      {canAccess(principal, { anyRole: ["DRIVER"] }) ? (
                        <Button asChild variant="outline" className="min-h-11 flex-1 justify-start rounded-xs">
                          <Link to={HORSE_HEALTH_ROUTES.clearance(dossier.complianceDossierId)} state={{ bookingCode: overview.booking.bookingCode, route: `${overview.booking.originCountry} → ${overview.booking.destinationCountry}`, originCountry: overview.booking.originCountry, destinationCountry: overview.booking.destinationCountry }}>
                            <FileCheck2 aria-hidden="true" className="size-4 text-primary" />
                            Declare customs clearance
                          </Link>
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
          {audience !== "customer" &&
          !canAccess(principal, { anyRole: ["CUSTOMER"] }) ? (
            <TransportIncidents
              incidents={overview.activeIncidents}
              detailHref={(incident) =>
                audience === "crew"
                  ? incidentRoutes.crewDetail(incident.incidentReportId)
                  : audience === "admin"
                    ? incidentRoutes.adminDetail(incident.incidentReportId)
                    : // The BE lets a customer read only HIGH/CRITICAL incidents (IN8); any other link would 404.
                      bookingId && transportId && (incident.severity === "HIGH" || incident.severity === "CRITICAL")
                      ? incidentRoutes.customerDetail(bookingId, transportId, incident.incidentReportId)
                      : null
              }
            />
          ) : null}
        </>
      )}
    </>
  );
}
