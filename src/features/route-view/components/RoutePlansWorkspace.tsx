import { useState } from "react";
import { Link } from "react-router-dom";
import { Route } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthPrincipal } from "@/features/auth/types";
import { transportPlanDetail } from "@/app/route-config";
import { Button } from "@/shared/components/ui/button";
import { ErrorState } from "@/shared/components/common";
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails";
import { useRoutePlanAlternatives } from "../hooks/useRoutePlanDetail";
import { canViewRoute, getRouteViewError } from "../services";
import { routePlanIdSchema } from "../schemas";
import { getRouteDetailPath } from "../navigation";
import type { RouteDetailPath } from "../types";
import { beforeDeparture, getPendingRouteCreation, hasActivePrimary } from "../route-policy";
import { RoutePlansTable } from "./RoutePlansTable";
import { getRoutePlan, getRoutePlanError, updateRoutePlan } from "@/features/route-plan/services";
import type { RoutePlanSummary } from "../types";

function UnavailableAction({
  label,
  reason,
  href,
}: {
  label: string;
  reason: string;
  href?: string;
}) {
  if (href)
    return (
      <Button
        asChild
        size="sm"
        className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
      >
        <Link to={href}>{label}</Link>
      </Button>
    );
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        disabled
        title={reason}
        className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
      >
        {label}
      </Button>
      <p className="max-w-sm text-[11px] text-slate-500">{reason}</p>
    </div>
  );
}

// RP2 is scoped to one selected plan, never fetched for each row of the transport list.
export function RoutePlansWorkspace({
  transportPlanId,
  planStatus,
  transportStatus,
  dossierStatus,
  principal,
  routeDetailPath = getRouteDetailPath(),
}: {
  transportPlanId: string;
  planStatus: string;
  transportStatus?: string | null;
  principal: AuthPrincipal | null;
  routeDetailPath?: RouteDetailPath;
  dossierStatus?: string | null;
}) {
  const queryClient = useQueryClient();
  const [submittingRoutePlanId, setSubmittingRoutePlanId] = useState<string | null>(null);
  const allowed = canViewRoute(principal);
  const validId = routePlanIdSchema.safeParse(transportPlanId).success;
  const query = useRoutePlanAlternatives(
    transportPlanId,
    {},
    allowed && validId,
  );
  const role = getWorkspaceRole(principal);
  const manager = role === "manager",
    coordinator = role === "coordinator",
    specialist = role === "specialist";
  const unlocked = beforeDeparture(transportStatus);
  const items = query.data?.items ?? [];
  const context = {
    principal,
    planStatus,
    transportStatus,
    dossierStatus,
    hasActivePrimary: hasActivePrimary(items),
    routeDetailPath,
  };
  const primary = items.find(
    (item) => item.routeType === "PRIMARY" && item.status !== "CANCELLED",
  );
  const title = specialist
    ? "Route Legal Review"
    : manager
      ? "Route Monitoring"
      : "Route Plans";
  const creation = getPendingRouteCreation(items, context, transportPlanId);
  async function submitForLegalReview(route: RoutePlanSummary) {
    if (submittingRoutePlanId) return;
    setSubmittingRoutePlanId(route.routePlanId);
    try {
      const detail = await getRoutePlan(route.routePlanId);
      await updateRoutePlan(route.routePlanId, {
        lastUpdatedAt: detail.updatedAt,
        updateReason: "Submitted for legal review.",
        action: "SUBMIT_FOR_LEGAL_REVIEW",
        routeNote: detail.routeNote ?? undefined,
        segments: detail.segments.map((segment) => ({
          sequenceNo: segment.sequenceNo,
          ...(detail.routeType === "PRIMARY" ? {} : { routeType: segment.routeType }),
          routeId: segment.route.routeId,
          plannedDepartureAt: segment.plannedDepartureAt || detail.plannedDepartureAt,
          plannedArrivalAt: segment.plannedArrivalAt || detail.plannedArrivalAt,
          dwellAfterMinutes: segment.dwellAfterMinutes ?? 0,
          ...(!segment.isOutsourced
            ? { vehicleIds: segment.vehicles.map((vehicle) => vehicle.vehicleId) }
            : {}),
          ...(segment.isOutsourced && segment.outsourcing
            ? {
                outsourcing: {
                  transportProviderId: segment.outsourcing.provider.transportProviderId,
                  note: segment.note ?? undefined,
                },
              }
            : {}),
          note: segment.note ?? undefined,
        })),
      });
      toast.success("Submitted for legal review.");
    } catch (error) {
      toast.error(getRoutePlanError(error).message);
    } finally {
      setSubmittingRoutePlanId(null);
    }
    // The submit request is complete once the backend has sent the notification.
    // A failed cache refresh must not turn that successful submission into an error.
    try {
      await queryClient.invalidateQueries({ queryKey: ["route-view", "list", transportPlanId] });
    } catch {
      // The next normal query refresh will reconcile the route status.
    }
  }
  const error = query.isError ? getRouteViewError(query.error) : null;
  return (
    <Section
      unframed
      title={title}
      icon={Route}
      description="Primary journey, backup alternatives and emergency return routes."
      actions={
        allowed && validId && query.isSuccess && creation ? (
          <UnavailableAction {...creation} />
        ) : undefined
      }
    >
      {!allowed ? (
        <ErrorState message="You do not have permission to view route plans." />
      ) : !validId ? (
        <ErrorState message="A valid transport plan is required to load route plans." />
      ) : error ? (
        <ErrorState
          message={error.message}
          onRetry={error.retryable ? () => void query.refetch() : undefined}
        />
      ) : (
        <>
          {coordinator && !unlocked && (
            <p className="text-xs text-slate-500">
              Standard editing is locked. Available emergency actions appear in
              each route's menu.
            </p>
          )}
          {coordinator && planStatus !== "APPROVED" && (
            <p className="text-xs text-slate-500">
              Route planning requires an APPROVED transport plan and Phase 1
              assignment.
            </p>
          )}
          <RoutePlansTable
            routes={items}
            context={context}
            routeDetailPath={routeDetailPath}
            onSubmitForLegalReview={submitForLegalReview}
            submittingRoutePlanId={submittingRoutePlanId}
            isLoading={query.isPending}
          />
          {!routeDetailPath && (
            <p className="text-xs text-slate-500">
              Route detail navigation is not available in this environment yet.
            </p>
          )}
          {specialist && dossierStatus != null && dossierStatus !== "DRAFT" && (
            <p className="text-xs text-slate-500">
              Legal review is unavailable until the dossier is in DRAFT.
            </p>
          )}
          {manager && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-slate-600">
                Phase 2 assigns Driver and Escort per internal segment only
                after the PRIMARY route is CONFIRMED. Outsourced segments use
                their Provider.
              </p>
              {planStatus === "APPROVED" &&
              unlocked &&
              primary?.status === "CONFIRMED" ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
                >
                  <Link
                    to={`${transportPlanDetail(transportPlanId)}?tab=personnel`}
                  >
                    View Phase 2 Personnel Workspace
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-slate-500">
                  Phase 2 is unavailable until the plan is APPROVED and the
                  PRIMARY route is CONFIRMED before departure.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Section>
  );
}
