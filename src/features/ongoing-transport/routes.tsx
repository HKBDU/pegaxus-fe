// oxlint-disable react/only-export-components -- route modules intentionally export configuration
import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { ONGOING_TRANSPORT_ACCESS, ROLE_ROUTES } from "@/app/route-config";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { CrewShell } from "./components/CrewShell";

const OngoingTransportListPage = lazy(
  () => import("./pages/OngoingTransportListPage"),
);
const TransportOverviewPage = lazy(
  () => import("./pages/TransportOverviewPage"),
);
const TransportRouteTrackingPage = lazy(
  () => import("./pages/TransportRouteTrackingPage"),
);

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
