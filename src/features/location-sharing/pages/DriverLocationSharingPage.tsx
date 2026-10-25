import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { LocationSharingControl } from "../components/LocationSharingControl";
import { LocationSharingSummary } from "../components/LocationSharingDetails";
import { useDriverLocationSession } from "../hooks/useDriverLocationSession";
import { driverTransportOverviewPath } from "../navigation";
import { FEATURES } from "../features";
import "../ui.css";

export default function DriverLocationSharingPage() {
  const { transportId } = useParams<{ transportId: string }>();
  const {
    environment,
    state,
    canStart,
    start,
    stop,
    context,
    source,
    reload,
    gate,
  } = useDriverLocationSession();
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
          {!FEATURES.segmentArrival ? (
            <p role="status" className="m-0 text-sm text-muted-foreground">
              Arrival confirmation is unavailable on the verified backend
              version. GPS sharing remains separate; this page does not confirm
              arrival locally.
            </p>
          ) : null}
          {state.message ? (
            <p role="status" className="m-0 text-sm text-muted-foreground">
              {state.message}
            </p>
          ) : null}
          {state.notification !== "none" ? (
            <p role="status" className="m-0 text-sm text-muted-foreground">
              {state.notification === "notified"
                ? "The coordinator was notified by the server."
                : state.notification === "not_notified"
                  ? "The server did not send a new notification."
                  : state.notification === "sending"
                    ? "Reporting permission denial…"
                    : "Coordinator notification could not be confirmed."}
            </p>
          ) : null}
          {source === "mock" ||
          !gate.ownershipKnown ||
          context.kind === "error" ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {source === "mock"
                  ? "MOCK DATA — real GPS sharing is disabled."
                  : "C9 is waiting for verified current-segment ownership from the backend."}
              </p>
              <Button type="button" variant="outline" onClick={reload}>
                Reload journey context
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
