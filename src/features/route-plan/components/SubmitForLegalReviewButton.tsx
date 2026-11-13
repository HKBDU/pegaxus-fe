import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { refreshRouteAfterSubmit } from "@/features/route-view/hooks/useRoutePlanDetail";
import { currentBlockedSegments } from "../legal-blocks";

/** The parts of a saved route plan (RP3) the update call needs. */
type SavedRoutePlan = {
  routePlanId: string;
  transportPlanId: string;
  routeType: "PRIMARY" | "BACKUP" | "RETURN";
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
  legalReview?: { isFeasible: boolean; blockedSegments?: number[] | null; reviewedAt?: string | null } | null;
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
 * opening the builder. BE returns the authoritative legal-review request state.
 */
export function SubmitForLegalReviewButton({
  plan,
  disabled = false,
  onSubmitted,
}: {
  plan: SavedRoutePlan;
  disabled?: boolean;
  onSubmitted: () => Promise<void> | void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const request = buildSubmitForReviewRequest(plan);
  // Unchanged since the review that blocked these segments: submitting as is would only be rejected again.
  const blocked = currentBlockedSegments(plan);
  const blockedReason = blocked.length
    ? `${blocked.length === 1 ? "Segment" : "Segments"} ${blocked.join(", ")} ${blocked.length === 1 ? "was" : "were"} blocked by the Transport Specialist. Edit the route plan to change ${blocked.length === 1 ? "it" : "them"} first.`
    : null;

  async function submit() {
    if (!request) return;
    setPending(true);
    try {
      await updateRoutePlan(plan.routePlanId, request);
      toast.success("Route plan submitted for legal review.");
      try {
        const refreshResult = await refreshRouteAfterSubmit(
          queryClient,
          plan.routePlanId,
        );
        if (!refreshResult.synced) {
          toast.warning("Submission succeeded, but the route view is still synchronizing.");
        }
      } catch {
        toast.warning("Submission succeeded, but the route view could not be refreshed yet.");
      }
      setOpen(false);
      await onSubmitted();
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
        disabled={disabled || !request || Boolean(blockedReason)}
        title={
          blockedReason ??
          (request
            ? undefined
            : "A segment has no planned times. Open Edit to complete the route first.")
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
