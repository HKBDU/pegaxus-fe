import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { approvedBookingKeys } from "@/features/transport-plan/hooks/useApprovedBookings";
import { transportPlanKeys } from "@/features/transport-plan/hooks/useTransportPlans";
import { getApiErrorInfo } from "@/features/transport-plan/services";
import { dossierKeys } from "@/features/dossier/hooks/useDossier";
import { requirementKeys } from "@/features/compliance-catalog/hooks/useDossierRequirements";
import type { ApprovedBookingDetail } from "@/features/transport-plan/types";
import { vehicleKeys } from "@/features/fleet/hooks/useVehicles";
import { personnelKeys } from "@/features/personnel/hooks";
import { executeEmergencyAction, routeViewService } from "../services";
import { getEmergencyActions } from "../emergency-policy";
import { routeViewKeys, useRoutePlanAlternatives } from "./useRoutePlanDetail";
import { returnActivationResultSchema } from "../schemas";
import type {
  EmergencyAction,
  EmergencyRequestMap,
  RoutePlanDetail,
  RoutePlanSummary,
} from "../types";
import type { RouteWorkspaceContext } from "../workspace-actions";
import { refreshTransportProgress } from "@/features/ongoing-transport/hooks/useTransportProgressRefresh";

export type EmergencyContext = {
  workspace: RouteWorkspaceContext;
  transportCode: string;
  activeRoutes: RoutePlanSummary[];
  primaryRoute?: RoutePlanSummary;
  dossierId?: string;
  legalDossier?: NonNullable<ApprovedBookingDetail["complianceDossier"]>;
  horseCount?: number;
  transportId: string;
  extraDossierStatus?: string;
};

export function useEmergencyContext(plan?: RoutePlanDetail, enabled = true) {
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const signedIn = useAuthStore((state) => Boolean(state.accessToken));
  const ready = enabled && signedIn && Boolean(plan);
  const transport = useQuery({
    queryKey: [
      "route-view",
      "emergency-workspace",
      "transport",
      plan?.transportPlanId,
      principal?.id,
      sessionVersion,
    ],
    queryFn: ({ signal }) =>
      routeViewService.getEmergencyTransportPlan(plan!.transportPlanId, signal),
    enabled: ready,
    retry: false,
  });
  const booking = useQuery({
    queryKey: [
      "route-view",
      "emergency-workspace",
      "booking",
      plan?.bookingId,
      principal?.id,
      sessionVersion,
    ],
    queryFn: ({ signal }) =>
      routeViewService.getEmergencyBooking(plan!.bookingId, signal),
    enabled: ready,
    retry: false,
  });
  const routes = useRoutePlanAlternatives(
    plan?.transportPlanId ?? "",
    {},
    ready,
  );
  const error = transport.isError
    ? transport.error
    : booking.isError
      ? booking.error
      : routes.isError
        ? routes.error
        : null;
  const loading =
    ready && (transport.isPending || booking.isPending || routes.isPending);
  let data: EmergencyContext | undefined;
  const matches =
    plan &&
    transport.data?.booking.bookingId === plan.bookingId &&
    booking.data?.transportPlan?.transportPlanId === plan.transportPlanId &&
    booking.data.transport?.transportId ===
      transport.data.transport.transportId;
  if (ready && !error && !loading && matches && routes.data) {
    const legalDossier =
      plan.routeType === "RETURN"
        ? booking.data!.complianceDossiers.find(
            (dossier) => dossier.dossierType === "EXTRA",
          )
        : booking.data!.complianceDossier;
    data = {
      workspace: {
        principal,
        planStatus: transport.data!.status,
        transportStatus: transport.data!.transport.status,
        dossierStatus: booking.data!.complianceDossier?.status,
        hasActivePrimary: routes.data.items.some(
          (route) => route.routeType === "PRIMARY" && route.status === "ACTIVE",
        ),
        hasOpenReturn: routes.data.items.some(
          (route) =>
            route.routeType === "RETURN" &&
            route.status !== "CANCELLED" &&
            route.status !== "REJECTED_BY_MANAGER",
        ),
      },
      transportCode: transport.data!.transport.transportCode,
      activeRoutes: routes.data.items.filter(
        (route) => route.status === "ACTIVE",
      ),
      primaryRoute: routes.data.items.find(
        (route) =>
          route.routeType === "PRIMARY" && route.status !== "CANCELLED",
      ),
      dossierId: booking.data!.complianceDossier?.complianceDossierId,
      legalDossier: legalDossier?.complianceDossierId.trim()
        ? legalDossier
        : undefined,
      horseCount: transport.data!.booking.totalHorses,
      transportId: transport.data!.transport.transportId,
      extraDossierStatus: booking.data!.complianceDossiers.find(
        (dossier) => dossier.dossierType === "EXTRA",
      )?.status,
    };
  }
  const mismatch =
    ready && !error && !loading && !matches
      ? new Error(
          "This route does not belong to the current authorized transport workspace.",
        )
      : null;
  return { data, error: error ?? mismatch, loading };
}

export async function refreshEmergencyQueries(
  client: QueryClient,
  plan: Pick<RoutePlanDetail, "routePlanId" | "transportPlanId" | "bookingId">,
  action: EmergencyAction | "management" | "change-vehicles",
  dossierId?: string,
  changedVehicleIds: readonly string[] = [],
  transportId?: string,
  changeContext?: {
    accountId: string;
    sessionVersion: number;
    incidentReportId?: string;
  },
) {
  const changesVehicles = action === "change-vehicles";
  const auth = useAuthStore.getState();
  if (
    changesVehicles &&
    (!transportId ||
      !changeContext ||
      !auth.accessToken ||
      auth.principal?.id !== changeContext.accountId ||
      auth.sessionVersion !== changeContext.sessionVersion)
  )
    throw new Error(
      "Reload the transport in the original account/session before refreshing vehicle changes.",
    );
  const keys: readonly (readonly unknown[])[] = [
    routeViewKeys.detail(plan.routePlanId),
    ["route-view", "list", plan.transportPlanId],
  ];
  const updatesWorkspace =
    action === "decision" ||
    action === "activation" ||
    action === "management" ||
    changesVehicles;
  const previousRoute = client.getQueryData<RoutePlanDetail>(
    routeViewKeys.detail(plan.routePlanId),
  );
  const vehiclesToRefresh = new Set([
    ...changedVehicleIds,
    ...(previousRoute?.segments.flatMap((segment) =>
      segment.vehicles.map((vehicle) => vehicle.vehicleId),
    ) ?? []),
  ]);
  await Promise.all([
    ...(updatesWorkspace
      ? [
          client.invalidateQueries({
            queryKey: ["route-view", "emergency-workspace"],
            predicate: (query) =>
              query.queryKey[2] === "transport"
                ? query.queryKey[3] === plan.transportPlanId
                : query.queryKey[2] === "booking" &&
                  query.queryKey[3] === plan.bookingId,
          }),
        ]
      : []),
    ...(updatesWorkspace && transportId
      ? [refreshTransportProgress(client, transportId)]
      : []),
    ...(changesVehicles && transportId
      ? ["snapshot", "segments", "overview"].map((part) =>
          client.invalidateQueries({
            queryKey: ["transport-tracking", part, transportId],
          }),
        )
      : []),
    ...(changesVehicles && changeContext?.incidentReportId
      ? [
          client.invalidateQueries({
            queryKey: [
              "incidents",
              "detail",
              changeContext.incidentReportId,
              changeContext.sessionVersion,
            ],
            exact: true,
          }),
          client.invalidateQueries({
            queryKey: ["incident-response"],
            predicate: ({ queryKey }) => {
              const matchesIncident =
                (queryKey[1] === "reroute-context" &&
                  queryKey[4] === changeContext.incidentReportId) ||
                (queryKey[1] === "emergency-costs" &&
                  queryKey[4] === "incident-context" &&
                  queryKey[5] === changeContext.incidentReportId);
              if (!matchesIncident || typeof queryKey[3] !== "string")
                return false;
              try {
                const scope: unknown = JSON.parse(queryKey[3]);
                return (
                  Array.isArray(scope) &&
                  scope[0] === changeContext.accountId &&
                  scope[1] === changeContext.sessionVersion
                );
              } catch {
                return false;
              }
            },
          }),
        ]
      : []),
    ...keys.map((queryKey) => client.invalidateQueries({ queryKey })),
    ...(updatesWorkspace
      ? [
          client.invalidateQueries({
            queryKey: transportPlanKeys.detail(plan.transportPlanId),
          }),
          client.invalidateQueries({ queryKey: ["transport-plans", "list"] }),
          client.invalidateQueries({
            queryKey: approvedBookingKeys.detail(plan.bookingId),
          }),
          client.invalidateQueries({ queryKey: ["approved-bookings", "list"] }),
          client.invalidateQueries({
            queryKey: dossierKeys.booking(plan.bookingId),
          }),
          client.invalidateQueries({
            queryKey: personnelKeys.plan(plan.transportPlanId),
          }),
          client.invalidateQueries({
            queryKey: personnelKeys.assignments(plan.transportPlanId),
          }),
          client.invalidateQueries({
            queryKey: personnelKeys.primaryRoute(plan.transportPlanId),
          }),
          client.invalidateQueries({
            queryKey: personnelKeys.routePlan(plan.routePlanId),
          }),
          ...(dossierId
            ? [
                client.invalidateQueries({
                  queryKey: dossierKeys.overview(dossierId),
                }),
                client.invalidateQueries({
                  queryKey: dossierKeys.requirementsRoot(dossierId),
                }),
                client.invalidateQueries({
                  queryKey: requirementKeys.ofDossier(dossierId),
                }),
                client.invalidateQueries({
                  queryKey: dossierKeys.all,
                  predicate: (query) =>
                    query.queryKey[1] === "dashboard" ||
                    (query.queryKey[1] === "audit" &&
                      query.queryKey[2] === dossierId),
                }),
              ]
            : []),
          // Invalidate only already-cached route details of this transport, not every route.
          client.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === "route-view" &&
              query.queryKey[1] === "detail" &&
              query.queryKey[2] !== plan.routePlanId &&
              (query.state.data as RoutePlanDetail | undefined)
                ?.transportPlanId === plan.transportPlanId,
          }),
        ]
      : []),
    ...(action === "activation" || changesVehicles
      ? [
          ...(!changesVehicles
            ? [
                client.invalidateQueries({
                  queryKey: [
                    "route-view",
                    "activation-resources",
                    plan.routePlanId,
                  ],
                }),
              ]
            : []),
          client.invalidateQueries({ queryKey: vehicleKeys.lists() }),
          client.invalidateQueries({
            queryKey: vehicleKeys.details(),
            predicate: (query) =>
              // K-03's callback is not available yet; refresh all cached details when new IDs are unknown.
              changesVehicles ||
              vehiclesToRefresh.has(String(query.queryKey[3])),
          }),
        ]
      : []),
  ]);
}

export function useEmergencyMutation<A extends EmergencyAction>(
  action: A,
  plan: RoutePlanDetail,
  context: EmergencyContext,
) {
  const client = useQueryClient();
  const account = useAuthStore((state) => state.principal?.id);
  const session = useAuthStore((state) => state.sessionVersion);
  const request = useRef<AbortController | null>(null);
  const scope = `${account}:${session}:${plan.routePlanId}:${action}`;
  const currentScope = useRef(scope);
  const generation = useRef(0);
  const mounted = useRef(false);
  const currentSession = () => {
    const auth = useAuthStore.getState();
    return (
      Boolean(auth.accessToken) &&
      mounted.current &&
      currentScope.current === scope &&
      auth.principal?.id === account &&
      auth.sessionVersion === session
    );
  };
  useLayoutEffect(() => {
    mounted.current = true;
    currentScope.current = scope;
    const unsubscribe = useAuthStore.subscribe((auth) => {
      if (
        !auth.accessToken ||
        auth.principal?.id !== account ||
        auth.sessionVersion !== session
      )
        request.current?.abort();
    });
    return () => {
      mounted.current = false;
      generation.current += 1;
      unsubscribe();
      request.current?.abort();
    };
  }, [account, session, scope]);
  return useMutation({
    mutationKey: ["route-view", "emergency", scope],
    onMutate: () => ({ scope, generation: generation.current }),
    retry: false,
    networkMode: "always",
    gcTime: 0,
    mutationFn: async (input: EmergencyRequestMap[A]) => {
      if (!currentSession() || request.current || !navigator.onLine)
        throw new Error(
          "Connect and reload the route in your current session before submitting.",
        );
      const workspace = {
        ...context.workspace,
        principal: useAuthStore.getState().principal,
      };
      if (!getEmergencyActions(plan, workspace).includes(action))
        throw new Error(
          "This emergency action is not available for the current route and transport.",
        );
      const controller = new AbortController();
      request.current = controller;
      try {
        return await executeEmergencyAction(
          action,
          plan.routePlanId,
          input,
          controller.signal,
        );
      } finally {
        if (request.current === controller) request.current = null;
      }
    },
    onSuccess: async (response, _input, mutationContext) => {
      const stillCurrent = () =>
        currentSession() &&
        mutationContext?.scope === scope &&
        mutationContext.generation === generation.current;
      if (!stillCurrent())
        throw new Error(
          "The route or account changed before the result could be applied.",
        );
      await refreshEmergencyQueries(
        client,
        plan,
        action,
        context.dossierId,
        action === "activation"
          ? returnActivationResultSchema
              .parse(response)
              .segments.flatMap((segment) =>
                segment.vehicles.map((vehicle) => vehicle.vehicleId),
              )
          : [],
        context.transportId,
      );
      if (!stillCurrent())
        throw new Error(
          "The route or account changed while the workspace was refreshing.",
        );
    },
    onError: async (error) => {
      if (!currentSession()) return;
      const { code } = getApiErrorInfo(error);
      if (
        [
          "ROUTE_PLAN_MODIFIED",
          "INVALID_ROUTE_PLAN_STATUS",
          "TRANSPORT_NOT_IN_TRANSIT",
          "DOSSIER_NOT_APPROVED",
          "RETURN_DOSSIER_NOT_APPROVED",
        ].includes(code ?? "")
      ) {
        // Refresh, but never resubmit. The form retains its input/version until explicit review.
        await refreshEmergencyQueries(
          client,
          plan,
          action,
          context.dossierId,
          [],
          context.transportId,
        );
      }
    },
  });
}
