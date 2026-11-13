import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { GpsSimulatorDrawer } from "../simulator/GpsSimulatorDrawer";

const DEMO_ASSIGNMENT = {
  transportId: "demo",
  transportCode: "TR-2026-DEMO",
  bookingCode: "BK-2026-DEMO",
  complianceDossierId: null,
  status: "IN_TRANSIT" as const,
  myRole: "DRIVER" as const,
  horseCount: 4,
  departureAt: "2026-10-26T00:00:00.000Z",
  etaAt: "2026-10-27T12:00:00.000Z",
  currentSegment: {
    routePlanRouteId: "seg-demo-01",
    displayOrder: 1,
    fromLocationName: "Chantilly Equine Quarantine Facility",
    toLocationName: "Dover Equine Transit Terminal",
    status: "IN_TRANSIT" as const,
    isMine: true,
  },
};

const DEMO_SEGMENT = {
  routePlanRouteId: "seg-demo-01",
  routePlanId: "rp-demo-01",
  routePlanCode: "RP-DEMO",
  sequenceNo: 1,
  displayOrder: 1,
  routeType: "PRIMARY" as const,
  transportMode: "ROAD" as const,
  fromLocation: {
    locationId: "loc-hn",
    locationName: "Chantilly Equine Quarantine Facility",
    locationType: "STABLE" as const,
    city: "Chantilly",
    country: "France",
    latitude: 49.1944,
    longitude: 2.4858,
  },
  toLocation: {
    locationId: "loc-dn",
    locationName: "Dover Equine Transit Terminal",
    locationType: "STABLE" as const,
    city: "Dover",
    country: "United Kingdom",
    latitude: 51.1279,
    longitude: 1.3134,
  },
  distanceKm: 760,
  status: "IN_TRANSIT" as const,
  isCurrent: true,
  plannedDepartureAt: "2026-10-26T00:00:00.000Z",
  plannedArrivalAt: "2026-10-27T12:00:00.000Z",
  actualDepartureAt: "2026-10-26T01:00:00.000Z",
  actualArrivalAt: null,
  driver: {
    employeeId: "driver-demo-01",
    employeeCode: "DRV-001",
    fullName: "Marc Dubois",
    role: "DRIVER" as const,
    phone: "+33612345678",
  },
  escort: null,
  isOutsourced: false,
  provider: null,
  vehicles: [
    {
      vehicleId: "veh-01",
      vehicleCode: "TRUCK-99A",
      licensePlate: "29C-123.45",
    },
  ],
  note: "Transporting 4 thoroughbred racehorses from Chantilly to Dover",
  updatedAt: "2026-10-26T01:00:00.000Z",
};

export function DriverLocationSession({ children }: { children: ReactNode }) {
  const route = useMatch("/crew/transports/:transportId/*");
  const { pathname, state: navigationState } = useLocation();
  const principal = useAuthStore((state) => state.principal);
  const sessionVersion = useAuthStore((state) => state.sessionVersion);
  const [selectedTransport, setSelectedTransport] = useState<{ accountId?: string; sessionVersion: number; transportId: string }>();
  const driver = canAccess(principal, { anyRole: ["DRIVER"] });
  const crewRoute = pathname === "/crew" || pathname.startsWith("/crew/");
  const routeTransportId = route?.params.transportId;
  const isDemo = routeTransportId === "demo";
  const source = "real";
  const assigned = useAssignedDriverContext(crewRoute && !isDemo);
  const incidentTransportId = pathname.startsWith("/crew/incidents/") &&
    navigationState && typeof navigationState === "object" && "transportId" in navigationState &&
    typeof navigationState.transportId === "string" ? navigationState.transportId : undefined;
  const retainedTransportId = crewRoute && driver && selectedTransport?.accountId === principal?.id &&
    selectedTransport?.sessionVersion === sessionVersion && assigned.data?.items.some((item) => item.transportId === selectedTransport.transportId && item.status === "IN_TRANSIT" && item.myRole === "DRIVER") ? selectedTransport.transportId : undefined;
  const transportId =
    routeTransportId ??
    incidentTransportId ??
    retainedTransportId ??
    (pathname === "/crew"
      ? assigned.data?.items.find(
          (item) => item.status === "IN_TRANSIT" && item.myRole === "DRIVER",
        )?.transportId
      : undefined);
  useEffect(() => {
    if (!driver || !crewRoute || !transportId || isDemo || !assigned.data?.items.some((item) => item.transportId === transportId && item.status === "IN_TRANSIT" && item.myRole === "DRIVER")) return;
    setSelectedTransport((current) => current && current.transportId === transportId && current.sessionVersion === sessionVersion && current.accountId === principal?.id
      ? current : { transportId, sessionVersion, accountId: principal?.id });
  }, [driver, crewRoute, isDemo, transportId, sessionVersion, principal?.id, assigned.data]);
  const effectiveDriver = isDemo ? true : driver;
  const query = useTransportOverview(
    isDemo ? undefined : transportId,
    undefined,
    "crew",
    "data",
    false,
  );
  const client = useQueryClient();
  const refetchAssignment = assigned.refetch;
  const assignment = isDemo
    ? DEMO_ASSIGNMENT
    : assigned.isError
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
  if (isDemo) {
    context = {
      kind: "available",
      stale: false,
      transport: {
        transportId: "demo",
        transportCode: "TR-2026-DEMO",
        status: "IN_TRANSIT",
        serverTime: "2026-10-26T04:00:00.000Z",
        currentSegmentId: "seg-demo-01",
        currentLeg: {
          displayOrder: 1,
          from: "Chantilly - Equine Quarantine Facility",
          to: "Dover - Equine Transit Terminal",
        },
      },
    };
  } else if (!transportId)
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
    driver: effectiveDriver,
    assignment,
    state: sharing.state,
    start: sharing.start,
    observedSegmentId: isDemo ? DEMO_SEGMENT.routePlanRouteId : query.data?.currentSegment?.routePlanRouteId,
  });
  return (
    <DriverLocationSessionContext.Provider
      value={{
        ...sharing,
        gate,
        context,
        source,
        reload,
        currentSegment: isDemo ? DEMO_SEGMENT : query.data?.currentSegment,
      }}
    >
      {children}
      {driver ? (
        <GpsSimulatorDrawer
          currentSegment={
            isDemo ? DEMO_SEGMENT : query.data?.currentSegment ?? null
          }
          onMockGpsEnabled={sharing.restart}
          onMockGpsDisabled={sharing.restart}
        />
      ) : null}
      {driver && transportId ? (
        <LocationWorkflowDialogs key={transportId} transportId={transportId} />
      ) : null}
    </DriverLocationSessionContext.Provider>
  );
}
