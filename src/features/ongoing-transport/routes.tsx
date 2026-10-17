// oxlint-disable react/only-export-components -- route modules intentionally export configuration
import { lazy, Suspense } from "react";
import { useParams, type RouteObject } from "react-router-dom";
import { ONGOING_TRANSPORT_ACCESS, ROLE_ROUTES } from "@/app/route-config";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { CrewShell } from "./components/CrewShell";
import { useTransportOverview } from "./hooks/useTransportOverview";
import { getOngoingTransportError } from "./services";
import { isOngoingTransportMockMode } from "./source";
import type { DriverTransportReadState } from "@/features/location-sharing/types";

const OngoingTransportListPage = lazy(
  () => import("./pages/OngoingTransportListPage"),
);
const TransportOverviewPage = lazy(
  () => import("./pages/TransportOverviewPage"),
);
const TransportRouteTrackingPage = lazy(
  () => import("./pages/TransportRouteTrackingPage"),
);
const DriverLocationSharingPage = lazy(
  () => import("@/features/location-sharing/pages/DriverLocationSharingPage"),
);

// Route-only adapter: reuse the authorized OT3 query/cache, not internal UC-49 imports inside the sender feature.
function DriverLocationSharingRoute() {
  const { transportId } = useParams<{ transportId: string }>();
  const query = useTransportOverview(
    transportId,
    undefined,
    "crew",
    "data",
    false,
  );
  let context: DriverTransportReadState;
  if (transportId === undefined) {
    context = {
      kind: "error",
      message: "Transport route information is missing.",
      retryable: false,
    };
  } else if (query.isError) {
    const error = getOngoingTransportError(query.error, "overview");
    context = { kind: "error", ...error };
  } else if (query.data) {
    const { transport, currentSegment, serverTime } = query.data;
    context = {
      kind: "available",
      stale: !query.online,
      transport: {
        transportId: transport.transportId,
        transportCode: transport.transportCode,
        status: transport.status,
        serverTime,
        currentLeg: currentSegment
          ? {
              displayOrder: currentSegment.displayOrder,
              from: currentSegment.fromLocation.locationName,
              to: currentSegment.toLocation.locationName,
            }
          : null,
      },
    };
  } else if (!query.online) {
    context = {
      kind: "unavailable",
      message:
        "You are offline and no journey context is cached. Reconnect to load this transport.",
    };
  } else {
    context = { kind: "loading" };
  }
  return (
    <Suspense fallback={<LoadingState />}>
      <DriverLocationSharingPage
        transportId={transportId}
        context={context}
        refreshing={query.isFetching}
        source={isOngoingTransportMockMode() ? "mock" : "real"}
        onReloadContext={() => void query.refetch()}
      />
    </Suspense>
  );
}

export const ongoingTransportRoutes: RouteObject[] = [
  {
    path: ROLE_ROUTES.ongoingTransports,
    element: (
      <ProtectedRoute allowedRoles={ONGOING_TRANSPORT_ACCESS.anyRole}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <OngoingTransportListPage />
          </Suspense>
        ),
      },
      {
        path: ":transportId",
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransportOverviewPage audience="admin" />
          </Suspense>
        ),
      },
      {
        path: ":transportId/segments",
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransportRouteTrackingPage audience="admin" />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/crew/transports/:transportId",
    element: (
      <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
        <CrewShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransportOverviewPage audience="crew" />
          </Suspense>
        ),
      },
      {
        path: "segments",
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransportRouteTrackingPage audience="crew" />
          </Suspense>
        ),
      },
      {
        path: "location",
        element: (
          <ProtectedRoute allowedRoles={["DRIVER"]}>
            <DriverLocationSharingRoute />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/bookings/:bookingId/transports/:transportId",
    element: (
      <ProtectedRoute allowedRoles={["CUSTOMER"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransportOverviewPage audience="customer" />
          </Suspense>
        ),
      },
      {
        path: "segments",
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransportRouteTrackingPage audience="customer" />
          </Suspense>
        ),
      },
    ],
  },
];
