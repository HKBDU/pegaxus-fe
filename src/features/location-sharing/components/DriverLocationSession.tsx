import { useCallback, useEffect, type ReactNode } from "react";
import { useMatch, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { useTransportOverview } from "@/features/ongoing-transport/hooks/useTransportOverview";
import { refreshTransportProgress } from "@/features/ongoing-transport/hooks/useTransportProgressRefresh";
import { getOngoingTransportError } from "@/features/ongoing-transport/services";
import { useLocationSharing } from "../hooks/useLocationSharing";
import {
  useAssignedDriverContext,
  useLocationGate,
} from "../hooks/useLocationGate";
import { DriverLocationSessionContext } from "../hooks/useDriverLocationSession";
import { LocationWorkflowDialogs } from "./LocationWorkflowDialogs";
import type { DriverTransportReadState } from "../types";

export function DriverLocationSession({ children }: { children: ReactNode }) {
  const route = useMatch("/crew/transports/:transportId/*");
  const { pathname } = useLocation();
  const principal = useAuthStore((state) => state.principal);
  const driver = canAccess(principal, { anyRole: ["DRIVER"] });
  const crewRoute = pathname === "/crew" || pathname.startsWith("/crew/");
  const source = "real";
  const assigned = useAssignedDriverContext(crewRoute);
  const transportId =
    route?.params.transportId ??
    (pathname === "/crew"
      ? assigned.data?.items.find(
          (item) => item.status === "IN_TRANSIT" && item.myRole === "DRIVER",
        )?.transportId
      : undefined);
  const query = useTransportOverview(
    transportId,
    undefined,
    "crew",
    "data",
    false,
  );
  const client = useQueryClient();
  const refetchAssignment = assigned.refetch;
  const assignment = assigned.isError
    ? undefined
    : assigned.data?.items.find((item) => item.transportId === transportId);
  const assignedSegmentId = assignment?.currentSegment?.routePlanRouteId;
  const observedSegmentId = query.data?.currentSegment?.routePlanRouteId;
  useEffect(() => {
    if (
      transportId &&
      assignedSegmentId &&
      observedSegmentId &&
      assignedSegmentId !== observedSegmentId
    )
      void refreshTransportProgress(client, transportId);
  }, [client, transportId, assignedSegmentId, observedSegmentId]);
  const reload = useCallback(() => {
    if (driver && source === "real") void refetchAssignment();
    if (transportId) void refreshTransportProgress(client, transportId);
  }, [client, transportId, refetchAssignment, driver, source]);
  let context: DriverTransportReadState;
  if (!transportId)
    context = {
      kind: "error",
      message: "Transport route information is missing.",
      retryable: false,
    };
  else if (query.isError)
    context = {
      kind: "error",
      ...getOngoingTransportError(query.error, "overview"),
    };
  else if (query.data) {
    const { transport, currentSegment, serverTime } = query.data;
    context = {
      kind: "available",
      stale: !query.online,
      transport: {
        transportId: transport.transportId,
        transportCode: transport.transportCode,
        status: transport.status,
        serverTime,
        currentSegmentId: currentSegment?.routePlanRouteId,
        currentLeg: currentSegment
          ? {
              displayOrder: currentSegment.displayOrder,
              from: currentSegment.fromLocation.locationName,
              to: currentSegment.toLocation.locationName,
            }
          : null,
      },
    };
  } else if (!query.online)
    context = {
      kind: "unavailable",
      message:
        "You are offline and no journey context is cached. Reconnect to load this transport.",
    };
  else context = { kind: "loading" };
  const sharing = useLocationSharing(
    {
      transportId,
      context,
      refreshing: query.isFetching,
      source,
      onReloadContext: reload,
    },
    assignment?.currentSegment?.routePlanRouteId,
    assignment?.currentSegment?.isMine,
  );
  const gate = useLocationGate({
    driver,
    assignment,
    state: sharing.state,
    start: sharing.start,
    observedSegmentId: query.data?.currentSegment?.routePlanRouteId,
  });
  return (
    <DriverLocationSessionContext.Provider
      value={{ ...sharing, gate, context, source, reload }}
    >
      {children}
      {driver && transportId ? (
        <LocationWorkflowDialogs key={transportId} transportId={transportId} />
      ) : null}
    </DriverLocationSessionContext.Provider>
  );
}
