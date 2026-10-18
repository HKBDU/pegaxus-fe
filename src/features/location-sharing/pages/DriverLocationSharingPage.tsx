import { Link, useParams } from "react-router-dom";
import { useTransportOverview } from "@/features/ongoing-transport/hooks/useTransportOverview";
import { getOngoingTransportError } from "@/features/ongoing-transport/services";
import { isOngoingTransportMockMode } from "@/features/ongoing-transport/source";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { LocationSharingControl } from "../components/LocationSharingControl";
import { LocationSharingSummary } from "../components/LocationSharingDetails";
import { useLocationSharing } from "../hooks/useLocationSharing";
import { driverTransportOverviewPath } from "../navigation";
import type { DriverTransportReadState } from "../types";
import "../ui.css";

export default function DriverLocationSharingPage() {
  const { transportId } = useParams<{ transportId: string }>();
  const query = useTransportOverview(
    transportId,
    undefined,
    "crew",
    "data",
    false,
  );
  let context: DriverTransportReadState;
  if (transportId === undefined) {
    context = {
      kind: "error",
      message: "Transport route information is missing.",
      retryable: false,
    };
  } else if (query.isError) {
    const error = getOngoingTransportError(query.error, "overview");
    context = { kind: "error", ...error };
  } else if (query.data) {
    const { transport, currentSegment, serverTime } = query.data;
    context = {
      kind: "available",
      stale: !query.online,
      transport: {
        transportId: transport.transportId,
        transportCode: transport.transportCode,
        status: transport.status,
        serverTime,
        currentLeg: currentSegment
          ? {
              displayOrder: currentSegment.displayOrder,
              from: currentSegment.fromLocation.locationName,
              to: currentSegment.toLocation.locationName,
            }
          : null,
      },
    };
  } else if (!query.online) {
    context = {
      kind: "unavailable",
      message:
        "You are offline and no journey context is cached. Reconnect to load this transport.",
    };
  } else {
    context = { kind: "loading" };
  }
  const source = isOngoingTransportMockMode() ? "mock" : "real";
  const { environment, state, canStart, start, stop } = useLocationSharing({
    transportId,
    context,
    refreshing: query.isFetching,
    source,
    onReloadContext: () => void query.refetch(),
  });
  const unavailableReason =
    context.kind === "loading"
      ? "Loading journey"
      : source === "mock"
        ? "Mock journey"
        : context.kind !== "available"
          ? "Journey unavailable"
          : context.transport.status !== "IN_TRANSIT"
            ? "Journey not in transit"
            : environment.network === "offline"
              ? "Offline"
              : environment.capability === "insecure"
                ? "HTTPS required"
                : environment.capability === "unsupported"
                  ? "GPS unsupported"
                  : environment.network === "unknown" ||
                      environment.capability === "unknown"
                    ? "Checking GPS"
                    : undefined;

  return (
    <main className="location-sharing-ui px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full min-w-0 max-w-lg space-y-3">
        {transportId !== undefined ? (
          <Button
            asChild
            variant="ghost"
            className="-ml-2 min-h-12 rounded-xs px-2 text-base"
          >
            <Link to={driverTransportOverviewPath(transportId)}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to overview
            </Link>
          </Button>
        ) : null}
        <Card className="location-sharing-panel gap-5 rounded-xs border-border bg-card p-4 shadow-none sm:p-5">
          <header className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary">
              <MapPin aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="m-0 text-lg leading-snug font-semibold text-foreground">
                Journey Location Sharing
              </h1>
              <p className="mt-1 mb-0 text-sm leading-relaxed text-muted-foreground">
                Share your location during this journey.
              </p>
            </div>
          </header>
          <LocationSharingControl
            state={state}
            canStart={canStart}
            unavailableReason={unavailableReason}
            contextMessage={
              context.kind === "error" || context.kind === "unavailable"
                ? context.message
                : undefined
            }
            onStart={start}
            onStop={stop}
          />
          <LocationSharingSummary
            state={state}
            journeyStatus={
              source === "real" &&
              context.kind === "available" &&
              context.transport.transportId === transportId
                ? context.transport.status
                : null
            }
          />
        </Card>
      </div>
    </main>
  );
}
