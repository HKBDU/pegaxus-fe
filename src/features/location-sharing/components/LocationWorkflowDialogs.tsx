import { Link, useLocation } from "react-router-dom";
import { formatUtcDateTime } from "@/shared/utils/datetime";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { handoverPaths } from "@/features/handover/constants";
import { useTransportSegments } from "@/features/ongoing-transport/hooks/useTransportSegments";
import { isSameDriverBoundary } from "@/features/ongoing-transport/timeline";
import { useDriverLocationSession } from "../hooks/useDriverLocationSession";
import { driverLocationSharingPath } from "../navigation";
import { FEATURES } from "../features";
import { useSegmentArrival } from "../hooks/useSegmentArrival";

export function LocationWorkflowDialogs({
  transportId,
}: {
  transportId: string;
}) {
  const {
    state,
    gate,
    canStart,
    start,
    stop,
    dismissArrival,
    freshPosition,
    reload,
    source,
  } = useDriverLocationSession();
  const { pathname } = useLocation();
  const arrival = state.arrival;
  const {
    busy,
    failure,
    confirm: confirmArrival,
    close: dismiss,
  } = useSegmentArrival({
    transportId,
    arrival,
    locked: gate.locked,
    active: state.active,
    freshPosition,
    dismiss: dismissArrival,
    reload,
  });
  const segments = useTransportSegments(
    transportId,
    undefined,
    "crew",
    "data",
    source === "real" && Boolean(arrival?.handoverRequired),
  );
  const boundary =
    !segments.isError && !segments.isFetching
      ? segments.data?.handoverBoundaries.find(
        (item) =>
          item.boundaryNo === arrival?.boundaryNo &&
          item.fromRoutePlanRouteId === arrival.fromRoutePlanRouteId &&
          item.toRoutePlanRouteId === arrival.toRoutePlanRouteId,
      )
      : undefined;
  const record = boundary?.existingHandover ?? arrival?.existingHandover;
  const handoverLink =
    record && (record.status === "PLANNED" || record.status === "IN_PROGRESS")
      ? handoverPaths.record("crew", transportId, record.handoverRecordId)
      : !record &&
        boundary?.handoverRequired === true &&
        !isSameDriverBoundary(boundary, segments.data?.segments ?? []) &&
        boundary.canCreate &&
        boundary.createModes?.includes("START_NOW")
        ? handoverPaths.start("crew", transportId, {
          from: arrival?.fromRoutePlanRouteId,
          to: arrival?.toRoutePlanRouteId,
          handoverType:
            boundary.allowedHandoverTypes.length === 1
              ? boundary.allowedHandoverTypes[0]
              : undefined,
        })
        : null;
  if (gate.applicable && gate.locked && pathname.startsWith("/crew/") && pathname !== "/crew")
    return (
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="rounded-xs"
        >
          <DialogHeader>
            <DialogTitle>
              Enable location sharing to start the segment
            </DialogTitle>
            <DialogDescription>
              The current segment requires your location. Unlock only after the
              server returns accepted=true; GPS permission or the legacy ACK is
              not sufficient.
            </DialogDescription>
          </DialogHeader>
          <p
            role={state.permissionStatus === "denied" ? "alert" : "status"}
            className={
              state.permissionStatus === "denied"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {state.message ??
              "Enable location sharing after the vehicle has safely stopped."}
          </p>
          {state.notification !== "none" ? (
            <p className="text-sm" role="status">
              {state.notification === "notified"
                ? "The server notified the dispatcher."
                : state.notification === "sending"
                  ? "Reporting the denied location permission…"
                  : state.notification === "not_notified"
                    ? "The server did not send a new notification."
                    : "Unable to confirm notification to the dispatcher."}
            </p>
          ) : null}
          <DialogFooter>
            {!pathname.endsWith("/location") ? (
              <Button asChild variant="outline">
                <Link to={driverLocationSharingPath(transportId)}>
                  Open location sharing
                </Link>
              </Button>
            ) : null}
            <Button onClick={reload} variant="outline">
              Reload segment information
            </Button>
            {state.active ? (
              <Button onClick={stop} variant="outline">
                Stop sharing
              </Button>
            ) : (
              <Button disabled={!canStart} onClick={start}>
                Enable location sharing
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  return (
    <>
      {state.acceptance === "rejected" ? (
        <p
          role="status"
          className="mx-auto max-w-4xl px-4 py-3 text-sm text-muted-foreground"
        >
          {state.message}
        </p>
      ) : null}
      <Dialog
        open={Boolean(arrival)}
        onOpenChange={(open) => {
          if (!open) dismiss();
        }}
      >
        <DialogContent
          className="rounded-xs"
          showCloseButton={!busy}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {arrival?.handoverRequired
                ? "Handover point"
                : "Arrival time update"}
            </DialogTitle>
            <DialogDescription>
              Boundary {arrival?.boundaryNo} · {arrival?.location.locationName}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm">
            {arrival?.handoverRequired
              ? "A handover record is required. GPS cannot confirm handover completion or record the official time."
              : `Provisional arrival time recorded by the server: ${arrival?.arrivalAt ? formatUtcDateTime(arrival.arrivalAt) : "Not available"}. Closing this window keeps the server-recorded time.`}
          </p>
          {state.arrivalWarning ? (
            <p role="status" className="text-sm text-amber-800">
              The vehicle is leaving the arrival point (
              {state.arrivalWarning.distanceMeters} m).{" "}
              {state.arrivalWarning.secondsRemaining !== null
                ? `Estimated ${state.arrivalWarning.secondsRemaining} seconds remaining within the radius.`
                : "It will close after leaving the allowed radius."}
            </p>
          ) : null}
          {failure ? (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={dismiss}>
              Close
            </Button>
            {arrival?.handoverRequired ? (
              handoverLink ? (
                <Button asChild onClick={dismiss}>
                  <Link to={handoverLink}>
                    {record?.status === "PLANNED"
                      ? "Start handover"
                      : record?.status === "IN_PROGRESS"
                        ? "Open record"
                        : "Create record"}
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" onClick={dismiss}>
                  <Link to={handoverPaths.list("crew", transportId)}>
                    View Handovers tab
                  </Link>
                </Button>
              )
            ) : (
              <Button
                disabled={
                  busy ||
                  !FEATURES.segmentArrival ||
                  !arrival?.fromRoutePlanRouteId ||
                  !arrival.toRoutePlanRouteId ||
                  !arrival.arrivalAt ||
                  !freshPosition()
                }
                onClick={() => void confirmArrival()}
              >
                {busy
                  ? "Confirming…"
                  : FEATURES.segmentArrival
                    ? "Confirm arrival time"
                    : "Arrival confirmation is not available yet"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
