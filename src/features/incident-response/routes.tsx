// oxlint-disable react/only-export-components -- route module declares lazy pages and exports route configuration
import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { CrewShell } from "@/features/ongoing-transport/components/CrewShell";
import type { EmergencyCostAudience } from "./navigation";

const ListPage = lazy(() => import("./pages/EmergencyCostListPage"));
const CreatePage = lazy(() => import("./pages/EmergencyCostCreatePage"));
const DetailPage = lazy(() => import("./pages/EmergencyCostDetailPage"));
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
    element: (
      <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
        <CrewShell />
      </ProtectedRoute>
    ),
    children: children("crew"),
  },
];
