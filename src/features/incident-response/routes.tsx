// oxlint-disable react/only-export-components -- route module declares lazy pages and exports route configuration
import { lazy, Suspense, type ReactNode } from "react";
import { Outlet, type RouteObject } from "react-router-dom";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import type { EmergencyCostAudience } from "./navigation";

const ListPage = lazy(() => import("./pages/EmergencyCostListPage"));
const CreatePage = lazy(() => import("./pages/EmergencyCostCreatePage"));
const DetailPage = lazy(() => import("./pages/EmergencyCostDetailPage"));
const ReroutePage = lazy(() => import("./pages/EmergencyReroutePage"));
const page = (element: ReactNode) => (
  <Suspense fallback={<LoadingState />}>{element}</Suspense>
);

function children(audience: EmergencyCostAudience): RouteObject[] {
  return [
    { index: true, element: page(<ListPage audience={audience} />) },
    {
      path: "new",
      element: (
        <ProtectedRoute
          allowedRoles={
            audience === "admin"
              ? ["FLEET_ROUTE_COORDINATOR"]
              : ["DRIVER", "ESCORT"]
          }
        >
          {page(<CreatePage audience={audience} />)}
        </ProtectedRoute>
      ),
    },
    {
      path: ":emergencyCostRequestId",
      element: page(<DetailPage audience={audience} />),
    },
  ];
}

export const emergencyCostRoutes: RouteObject[] = [
  {
    path: "/admin/emergency-costs",
    element: (
      <ProtectedRoute
        allowedRoles={[
          "LOGISTICS_MANAGER",
          "FLEET_ROUTE_COORDINATOR",
          "TRANSPORT_SPECIALIST",
        ]}
      >
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: children("admin"),
  },
  {
    path: "/crew/emergency-costs",
    // MainLayout, like the crew's incident page they come from (/crew/incidents/:id) and /crew, /crew/transports. The
    // CrewShell (admin sidebar on a desktop, dark "Crew workspace" bar on a phone) changed the whole header in between.
    element: (
      <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        // MainLayout has no page background: give these pages the web's warm one, as the incident page has.
        element: (
          <div className="booking-page-shell min-h-[70dvh] bg-[#f4f2ed]">
            <Outlet />
          </div>
        ),
        children: children("crew"),
      },
    ],
  },
];

export const emergencyRerouteRoutes: RouteObject[] = [
  {
    path: "/admin/incidents/:incidentReportId/reroute",
    element: (
      <ProtectedRoute
        allowedRoles={["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"]}
      >
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<ReroutePage />) }],
  },
];
