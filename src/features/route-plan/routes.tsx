// oxlint-disable react/only-export-components -- route-plan module exports router configuration
import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

import { ROLE_ROUTES, routePlanDetail } from "@/app/route-config";
import { normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

const CreateRoutePlanPage = lazy(
  () => import("@/features/route-plan/pages/CreateRoutePlanPage"),
);
const CreateContingencyRoutePage = lazy(
  () => import("@/features/route-plan/pages/CreateContingencyRoutePage"),
);
const CreateReturnRoutePage = lazy(
  () => import("@/features/route-plan/pages/CreateReturnRoutePage"),
);
const EditRoutePlanPage = lazy(
  () => import("@/features/route-plan/pages/EditRoutePlanPage"),
);
const RoutePlanDetailPage = lazy(
  () => import("@/features/route-view/pages/RoutePlanDetailPage"),
);

function RoutePlansIndexRedirect() {
  const principal = useAuthStore((state) => state.principal);
  const isLogisticsManager = principal?.roles.some(
    (role) => normalizeRole(role) === "LOGISTICS_MANAGER",
  );
  return (
    <Navigate
      to={isLogisticsManager ? ROLE_ROUTES.transportPlans : ROLE_ROUTES.approvedBookings}
      replace
    />
  );
}

const page = (element: ReactNode) => (
  <Suspense fallback={<LoadingState />}>{element}</Suspense>
);

export const routePlanRoutes: RouteObject[] = [
  {
    path: ROLE_ROUTES.routePlans,
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
    children: [
      // Route coordinators start from approved bookings; logistics managers use the transport plans list.
      { index: true, element: <RoutePlansIndexRedirect /> },
      {
        path: "new/:transportPlanId",
        element: (
          <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}>
            {page(<CreateRoutePlanPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: ":routePlanId/edit",
        element: (
          <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}>
            {page(<EditRoutePlanPage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "new/:transportPlanId/contingency",
        element: (
          <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}>
            {page(<CreateContingencyRoutePage />)}
          </ProtectedRoute>
        ),
      },
      {
        path: "new/:transportPlanId/return",
        element: (
          <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}>
            {page(<CreateReturnRoutePage />)}
          </ProtectedRoute>
        ),
      },
      // UC-38: page checks route-plan assignment through the backend.
      {
        path: ":routePlanId",
        element: page(<RoutePlanDetailPage routeDetailPath={routePlanDetail} />),
      },
      // Notification deep links for Logistics Managers.
      {
        path: ":routePlanId/change-decision",
        element: (
          <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
            {page(
              <RoutePlanDetailPage
                emergencyView="decision"
                routeDetailPath={routePlanDetail}
              />,
            )}
          </ProtectedRoute>
        ),
      },
      {
        path: ":routePlanId/return-activation",
        element: (
          <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
            {page(
              <RoutePlanDetailPage
                emergencyView="activation"
                routeDetailPath={routePlanDetail}
              />,
            )}
          </ProtectedRoute>
        ),
      },
    ],
  },
];
