import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { getRoutePlanError, updateRoutePlan } from "../services";
import type { RouteSegmentInput, UpdateRoutePlanRequest } from "../types";

/** The parts of a saved route plan (RP3) the update call needs. */
type SavedRoutePlan = {
  routePlanId: string;
  updatedAt: string;
  routeNote?: string | null;
  segments: {
    sequenceNo: number;
    routeType: RouteSegmentInput["routeType"];
    route: { routeId: string };
    plannedDepartureAt: string | null;
    plannedArrivalAt: string | null;
    vehicles: { vehicleId: string }[];
    outsourcing: { provider: { transportProviderId: string } } | null;
    note?: string | null;
  }[];
};

const UPDATE_REASON = "Submitted for legal review";

/**
 * RP4 replaces the whole plan, so the saved segments are sent back as they are (vehicles, provider, note, times and
 * type) with only `action` changed. Returns null when a segment has no planned times, which RP4 would reject.
 */
export function buildSubmitForReviewRequest(
  plan: SavedRoutePlan,
): UpdateRoutePlanRequest | null {
  const segments: RouteSegmentInput[] = [];
  for (const segment of [...plan.segments].sort(
    (left, right) => left.sequenceNo - right.sequenceNo,
  )) {
    if (!segment.plannedDepartureAt || !segment.plannedArrivalAt) return null;
    segments.push({
      sequenceNo: segment.sequenceNo,
      routeType: segment.routeType,
      routeId: segment.route.routeId,
      plannedDepartureAt: segment.plannedDepartureAt,
      plannedArrivalAt: segment.plannedArrivalAt,
      // A segment never carries both: an outsourced one has a provider and no vehicles.
      ...(segment.outsourcing
        ? {
            outsourcing: {
              transportProviderId:
                segment.outsourcing.provider.transportProviderId,
            },
          }
        : segment.vehicles.length
          ? { vehicleIds: segment.vehicles.map((vehicle) => vehicle.vehicleId) }
          : {}),
      ...(segment.note ? { note: segment.note } : {}),
    });
  }
  return {
    lastUpdatedAt: plan.updatedAt,
    updateReason: UPDATE_REASON,
    segments,
    ...(plan.routeNote ? { routeNote: plan.routeNote } : {}),
    action: "SUBMIT_FOR_LEGAL_REVIEW",
  };
}

/**
 * Sends a saved DRAFT route plan to legal review straight from its page (RP4 with `SUBMIT_FOR_LEGAL_REVIEW`), without
 * opening the builder. The Transport Specialist is notified and `submittedForReviewAt` is set.
 */
export function SubmitForLegalReviewButton({
  plan,
  disabled = false,
  onSubmitted,
}: {
  plan: SavedRoutePlan;
  disabled?: boolean;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const request = buildSubmitForReviewRequest(plan);

  async function submit() {
    if (!request) return;
    setPending(true);
    try {
      await updateRoutePlan(plan.routePlanId, request);
      toast.success("Route plan submitted for legal review.");
      setOpen(false);
      onSubmitted();
    } catch (error) {
      const mapped = getRoutePlanError(error);
      toast.error(mapped.message);
      // The plan changed under us (or is locked): close the dialog and let the page reload the latest version.
      if (mapped.code === "ROUTE_PLAN_MODIFIED" || mapped.code === "ROUTE_LOCKED") {
        setOpen(false);
        onSubmitted();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || !request}
        title={
          request
            ? undefined
            : "A segment has no planned times. Open Edit to complete the route first."
        }
        onClick={() => setOpen(true)}
      >
        Submit for legal review
      </Button>
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for legal review?</AlertDialogTitle>
            <AlertDialogDescription>
              The route plan is sent to the Transport Specialist as it is saved now. Edit it first if anything must change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button type="button" disabled={pending} onClick={() => void submit()}>
              {pending ? "Submitting..." : "Submit"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
