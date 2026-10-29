import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useAuthStore } from "@/features/auth/store";
import { getWorkspaceRole } from "@/features/transport-plan/workspace-role";
import { isFlow3MockMode } from "@/features/transport-plan/source";
import { useEmergencyCostScope } from "@/features/incident-response/hooks/useEmergencyCostScope";
import {
  emergencyCostAuthScope,
  emergencyCostService,
} from "@/features/incident-response/services";
import { getRerouteContext } from "@/features/incident-response/reroute-services";
import { collectVehicleChangeCandidates } from "../vehicle-change";
import { getEmergencyError, routeViewService } from "../services";
import type { RoutePlanDetail } from "../types";
import type { EmergencyContext } from "./useEmergencyRoute";

type Failure =
  | "permission_denied"
  | "invalid_incident"
  | "cost_not_approved"
  | "route_mismatch"
  | "no_active_route"
  | "read_failure";
class VehicleChangeReadError extends Error {
  readonly kind: Failure;

  constructor(kind: Failure, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function useVehicleChangeContext(
  plan: RoutePlanDetail,
  context: EmergencyContext,
  incidentReportId: string | null,
) {
  const { principal, signedIn, source, scope } = useEmergencyCostScope();
  const authorized = signedIn && getWorkspaceRole(principal) === "coordinator";
  const validId =
    incidentReportId !== null && incidentReportId.trim().length > 0;
  const transit = context.workspace.transportStatus === "IN_TRANSIT";
  const query = useQuery({
    queryKey: [
      "route-view",
      "vehicle-change-context",
      source,
      scope,
      plan.routePlanId,
      plan.updatedAt,
      context.transportId,
      incidentReportId,
    ],
    enabled: authorized && validId && plan.status === "ACTIVE" && transit,
    retry: false,
    staleTime: 0,
    queryFn: async ({ signal }) => {
      const ensureCurrent = () => {
        signal.throwIfAborted();
        const auth = useAuthStore.getState();
        if (
          !auth.accessToken ||
          emergencyCostAuthScope() !== scope ||
          getWorkspaceRole(auth.principal) !== "coordinator"
        )
          throw new VehicleChangeReadError(
            "permission_denied",
            "Your session changed. Reopen the authorized route workspace.",
          );
      };
      ensureCurrent();
      if (source !== "real" || isFlow3MockMode())
        throw new VehicleChangeReadError(
          "read_failure",
          "Vehicle replacement requires live incident and route data. Demo data is not combined with live reads.",
        );
      if (incidentReportId === null)
        throw new VehicleChangeReadError(
          "invalid_incident",
          "Incident information is missing.",
        );
      const [incident, costs, route] = await Promise.all([
        emergencyCostService.getIncidentContext(
          incidentReportId,
          signal,
          scope,
        ),
        emergencyCostService.list(
          {
            incidentReportId,
            transportId: context.transportId,
            category: "REPLACEMENT_VEHICLE",
            status: "APPROVED",
            pageIndex: 1,
            pageSize: 1,
          },
          signal,
          scope,
        ),
        routeViewService.getRoute(plan.routePlanId, signal),
      ]);
      ensureCurrent();
      const same = (left: string, right: string) =>
        left.toLowerCase() === right.toLowerCase();
      if (
        !same(incident.incidentReportId, incidentReportId) ||
        !same(incident.transport.transportId, context.transportId) ||
        !["REPORTED", "PENDING"].includes(incident.status) ||
        !["VEHICLE", "BOTH"].includes(incident.category) ||
        !incident.vehicleDetail ||
        incident.transport.status !== "IN_TRANSIT"
      )
        throw new VehicleChangeReadError(
          "invalid_incident",
          "Use an open vehicle incident belonging to this transport while it is in transit.",
        );
      if (
        !costs.items.some(
          (cost) =>
            cost.category === "REPLACEMENT_VEHICLE" &&
            cost.status === "APPROVED" &&
            same(cost.incident.incidentReportId, incidentReportId) &&
            same(cost.incident.transportId, context.transportId),
        )
      )
        throw new VehicleChangeReadError(
          "cost_not_approved",
          "Waiting for replacement vehicle cost approval.",
        );
      if (
        route.status !== "ACTIVE" ||
        !same(route.transportPlanId, plan.transportPlanId)
      )
        throw new VehicleChangeReadError(
          "route_mismatch",
          "The canonical route is no longer ACTIVE in this transport plan.",
        );
      const reroute = await getRerouteContext(incidentReportId, scope, signal);
      ensureCurrent();
      if (
        !same(reroute.incident.incidentReportId, incidentReportId) ||
        !reroute.transport.transportPlanId ||
        !same(reroute.transport.transportPlanId, route.transportPlanId) ||
        !same(reroute.transport.transportId, context.transportId) ||
        reroute.transport.status !== "IN_TRANSIT" ||
        !["REPORTED", "PENDING"].includes(reroute.incident.status) ||
        reroute.incident.category !== incident.category
      )
        throw new VehicleChangeReadError(
          "route_mismatch",
          "Incident, transport and active transport plan could not be matched.",
        );
      const summaries = await routeViewService.getRoutes(
        route.transportPlanId,
        {},
        signal,
      );
      ensureCurrent();
      if (!summaries.items.some((item) => item.status === "ACTIVE"))
        throw new VehicleChangeReadError(
          "no_active_route",
          "No ACTIVE route is available in this transport plan.",
        );
      if (
        !summaries.items.some(
          (item) =>
            item.status === "ACTIVE" &&
            same(item.routePlanId, route.routePlanId),
        )
      )
        throw new VehicleChangeReadError(
          "route_mismatch",
          "This route is not in the current ACTIVE route list.",
        );
      const alternatives = summaries.items.filter(
        (item) =>
          !same(item.routePlanId, route.routePlanId) &&
          (item.status === "ACTIVE" ||
            (item.status === "CONFIRMED" &&
              ["BACKUP", "RETURN"].includes(item.routeType))),
      );
      const details = await Promise.all(
        alternatives.map((item) =>
          routeViewService.getRoute(item.routePlanId, signal),
        ),
      );
      ensureCurrent();
      if (
        details.some(
          (item) => !same(item.transportPlanId, route.transportPlanId),
        )
      )
        throw new VehicleChangeReadError(
          "route_mismatch",
          "An alternative route belongs to a different transport plan.",
        );
      return {
        incident,
        route,
        selection: collectVehicleChangeCandidates(
          [route, ...details],
          route.transportPlanId,
          reroute,
        ),
      };
    },
  });

  if (incidentReportId === null) return { kind: "idle" as const };
  if (!authorized)
    return {
      kind: "permission_denied" as const,
      message: "Only the assigned Route Coordinator can replace vehicles.",
    };
  if (!validId)
    return {
      kind: "invalid_incident" as const,
      message:
        "The changeVehicle parameter must contain an incident identifier.",
    };
  if (plan.status !== "ACTIVE" || !transit)
    return {
      kind: "route_mismatch" as const,
      message:
        "Mid-trip replacement requires an ACTIVE route and an IN_TRANSIT transport.",
    };
  if (query.isError) {
    if (query.error instanceof VehicleChangeReadError)
      return { kind: query.error.kind, message: query.error.message };
    const status = isAxiosError(query.error)
      ? query.error.response?.status
      : query.error instanceof Error && "status" in query.error
        ? Number(query.error.status)
        : undefined;
    return {
      kind:
        status === 401 || status === 403
          ? ("permission_denied" as const)
          : ("read_failure" as const),
      message:
        status === 401 || status === 403
          ? "Your session or assignment no longer permits this replacement context."
          : getEmergencyError(query.error).message,
    };
  }
  if (!query.data)
    return {
      kind: "loading" as const,
      message: "Checking incident, cost approval and route eligibility…",
    };
  return {
    kind: "ready" as const,
    data: query.data,
    refreshing: query.isFetching,
    reload: () => query.refetch({ throwOnError: true }),
  };
}
