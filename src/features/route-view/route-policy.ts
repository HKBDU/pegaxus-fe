import { routePlanCreate, routePlanEdit, contingencyRouteCreate } from "@/app/route-config";
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import type { RoutePlanSummary, RouteWorkspaceContext } from "./types";

export type PendingRouteAction = { label: string; reason: string; href?: string };

export const beforeDeparture = (status?: string | null) =>
  Boolean(status && ["CREATED", "PLANNING", "READY"].includes(status));

export const isDossierReady = (status?: string | null) =>
  status == null || status === "DRAFT";

export function hasActivePrimary(routes: readonly Pick<RoutePlanSummary, "routeType" | "status">[]) {
  return routes.some((route) => route.routeType === "PRIMARY" && route.status === "ACTIVE");
}

export function hasOpenReturn(routes: readonly Pick<RoutePlanSummary, "routeType" | "status">[]) {
  return routes.some((route) => route.routeType === "RETURN" && ["DRAFT", "CONFIRMED", "ACTIVE"].includes(route.status));
}

export function hasOpenBackup(routes: readonly Pick<RoutePlanSummary, "routeType" | "status">[]) {
  return routes.some((route) => route.routeType === "BACKUP" && ["DRAFT", "CONFIRMED", "ACTIVE"].includes(route.status));
}

export function canSpecialistReviewRoute(
  route: Pick<RoutePlanSummary, "routeType" | "status" | "legalReviewRequested">,
  context: RouteWorkspaceContext,
) {
  if (getWorkspaceRole(context.principal) !== "specialist" || route.status !== "DRAFT") return false;
  if (!isDossierReady(context.dossierStatus)) return false;
  if (route.routeType === "RETURN") return context.transportStatus === "IN_TRANSIT";
  return route.legalReviewRequested === true;
}

export function getPendingRouteActions(route: RoutePlanSummary, context: RouteWorkspaceContext): PendingRouteAction[] {
  if (context.planStatus !== "APPROVED" || route.status !== "DRAFT") return [];
  const role = getWorkspaceRole(context.principal);
  if (role === "coordinator") {
    if (!beforeDeparture(context.transportStatus)) return [];
    const actions: PendingRouteAction[] = [
      { label: "Edit Route", reason: "Edit this draft route.", href: routePlanEdit(route.routePlanId) },
      { label: "Cancel Draft Route", reason: "Cancel this draft route." },
    ];
    if (route.routeType !== "RETURN" && route.legalReviewRequested !== true)
      actions.push({ label: "Submit for Legal Review", reason: "Submit this draft route for specialist review." });
    return actions;
  }
  if (canSpecialistReviewRoute(route, context)) return [{
    label: "Review Legal Feasibility",
    reason: "Review the route's legal feasibility.",
    href: context.routeDetailPath?.(route.routePlanId),
  }];
  return [];
}

export function getPendingRouteCreation(routes: RoutePlanSummary[], context: RouteWorkspaceContext, transportPlanId?: string): PendingRouteAction | null {
  if (getWorkspaceRole(context.principal) !== "coordinator" || context.planStatus !== "APPROVED" || !beforeDeparture(context.transportStatus) || !isDossierReady(context.dossierStatus)) return null;
  if (!hasActivePrimary(routes)) return { label: "Create Primary Route", reason: "Create the primary route.", ...(transportPlanId ? { href: routePlanCreate(transportPlanId) } : {}) };
  if (hasOpenBackup(routes)) return null;
  return { label: "Add Backup Route", reason: "Add a backup route.", ...(transportPlanId ? { href: contingencyRouteCreate(transportPlanId) } : {}) };
}
