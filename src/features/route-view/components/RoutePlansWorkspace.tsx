import { Link } from "react-router-dom";
import { Route } from "lucide-react";
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
import { beforeDeparture, getPendingRouteCreation } from "../workspace-actions";
import { RoutePlansTable } from "./RoutePlansTable";

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
    hasActivePrimary: items.some(
      (route) => route.routeType === "PRIMARY" && route.status === "ACTIVE",
    ),
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
            isLoading={query.isPending}
          />
          {!routeDetailPath && (
            <p className="text-xs text-slate-500">
              Route detail navigation is not available in this environment yet.
            </p>
          )}
          {specialist && dossierStatus !== "DRAFT" && (
            <p className="text-xs text-slate-500">
              Legal review requires a draft dossier and a draft route. Existing
              review results remain available in route details.
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
