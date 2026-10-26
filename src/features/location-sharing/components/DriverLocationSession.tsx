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

const DEMO_ASSIGNMENT = {
  transportId: "demo",
  transportCode: "TR-2026-DEMO",
  status: "IN_TRANSIT" as const,
  myRole: "DRIVER" as const,
  currentSegment: {
    routePlanRouteId: "seg-demo-01",
    isMine: true,
  },
};

const DEMO_SEGMENT = {
  routePlanRouteId: "seg-demo-01",
  routePlanId: "rp-demo-01",
  routePlanCode: "RP-DEMO",
  sequenceNo: 1,
  displayOrder: 1,
  routeType: "DOMESTIC" as const,
  transportMode: "ROAD" as const,
  fromLocation: {
    locationId: "loc-hn",
    locationName: "Hanoi Equine Quarantine Facility",
    locationType: "STABLE" as const,
    city: "Hanoi",
    country: "Vietnam",
    latitude: 21.0285,
    longitude: 105.8544,
  },
  toLocation: {
    locationId: "loc-dn",
    locationName: "Danang Transit Terminal",
    locationType: "STABLE" as const,
    city: "Danang",
    country: "Vietnam",
    latitude: 16.0544,
    longitude: 108.2022,
  },
  distanceKm: 760,
  status: "IN_PROGRESS" as const,
  isCurrent: true,
  plannedDepartureAt: "2026-10-26T00:00:00.000Z",
  plannedArrivalAt: "2026-10-27T12:00:00.000Z",
  actualDepartureAt: "2026-10-26T01:00:00.000Z",
  actualArrivalAt: null,
  driver: {
    employeeId: "driver-demo-01",
    employeeCode: "DRV-001",
    fullName: "Nguyễn Văn Tuấn (Tài xế)",
    role: "DRIVER" as const,
    phone: "+84901234567",
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
  note: "Chở 4 ngựa đua thuần chủng từ Sóc Sơn đi Đà Nẵng",
  updatedAt: "2026-10-26T01:00:00.000Z",
};

export function DriverLocationSession({ children }: { children: ReactNode }) {
  const route = useMatch("/crew/transports/:transportId/*");
  const { pathname } = useLocation();
  const principal = useAuthStore((state) => state.principal);
  const driver = canAccess(principal, { anyRole: ["DRIVER"] });
  const crewRoute = pathname === "/crew" || pathname.startsWith("/crew/");
  const routeTransportId = route?.params.transportId;
  const isDemo = routeTransportId === "demo";
  const source = "real";
  const assigned = useAssignedDriverContext(crewRoute && !isDemo);
  const transportId =
    routeTransportId ??
    (pathname === "/crew"
      ? assigned.data?.items.find(
          (item) => item.status === "IN_TRANSIT" && item.myRole === "DRIVER",
        )?.transportId
      : undefined);
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
          from: "Hà Nội - Trại ngựa Sóc Sơn",
          to: "Đà Nẵng - Trại trung chuyển Liên Chiểu",
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
      {driver && transportId ? (
        <LocationWorkflowDialogs key={transportId} transportId={transportId} />
      ) : null}
    </DriverLocationSessionContext.Provider>
  );
}
