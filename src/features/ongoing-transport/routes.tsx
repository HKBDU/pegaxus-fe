// oxlint-disable react/only-export-components -- route modules intentionally declare lazy pages and export configuration
import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { ONGOING_TRANSPORT_ACCESS, ROLE_ROUTES } from "@/app/route-config";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { CrewShell } from "./components/CrewShell";
import { TransportDetailLayout } from "./components/TransportDetailLayout";
import type { TransportAudience } from "./types";

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

const page = (element: ReactNode) => (
  <Suspense fallback={<LoadingState />}>{element}</Suspense>
);

/**
 * Pages the other tabs add to a transport. Each list holds RELATIVE routes (`health`, `gps`, `handovers/:id`…) that render
 * inside the transport shell; the router passes them in so this feature never imports the features that own those tabs.
 */
export interface TransportTabRoutes {
  admin: RouteObject[];
  crew: RouteObject[];
  customer: RouteObject[];
  /** Crew pages that live under the transport URL but outside the tab shell (for example the Escort's health log form). */
  crewStandalone?: RouteObject[];
}

/** Shared shell of a transport: the Overview and Route Tracking tabs plus the tabs of the other features. */
const transportDetail = (
  audience: TransportAudience,
  tabs: RouteObject[],
): RouteObject => ({
  element: <TransportDetailLayout audience={audience} />,
  children: [
    {
      index: true,
      element: page(<TransportOverviewPage audience={audience} />),
    },
    {
      path: "segments",
      element: page(<TransportRouteTrackingPage audience={audience} />),
    },
    ...tabs,
  ],
});

export const ongoingTransportRoutes = (
  tabs: TransportTabRoutes,
): RouteObject[] => [
  {
    path: ROLE_ROUTES.ongoingTransports,
    element: (
      <ProtectedRoute allowedRoles={ONGOING_TRANSPORT_ACCESS.anyRole}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: page(<OngoingTransportListPage />) },
      {
        path: ":transportId",
        children: [transportDetail("admin", tabs.admin)],
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
        path: "location",
        element: (
          <ProtectedRoute allowedRoles={["DRIVER"]}>
            {page(<DriverLocationSharingPage />)}
          </ProtectedRoute>
        ),
      },
      ...(tabs.crewStandalone ?? []),
      transportDetail("crew", tabs.crew),
    ],
  },
  {
    path: "/bookings/:bookingId/transports/:transportId",
    element: (
      <ProtectedRoute allowedRoles={["CUSTOMER"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [transportDetail("customer", tabs.customer)],
  },
];
