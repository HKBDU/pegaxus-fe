// oxlint-disable react/only-export-components -- route configuration owns lazy page declarations
import { lazy, Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import { ROLE_ROUTES } from "@/app/route-config";
import { ProtectedRoute } from "@/shared/components/guards";
import { LoadingState } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

const OnTimeDeliveryPage = lazy(() => import("./pages/OnTimeDeliveryPage"));
const IncidentClaimReportPage = lazy(
  () => import("./pages/IncidentClaimReportPage"),
);
const TransitTimePage = lazy(() => import("./pages/TransitTimePage"));
export const managementReportRoutes: RouteObject[] = [
  {
    path: ROLE_ROUTES.dashboard,
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <Navigate to={ROLE_ROUTES.onTimeReport} replace />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/reports/transit-time",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <TransitTimePage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/admin/reports/incident-claim-frequency",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <IncidentClaimReportPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "/admin/reports/on-time-delivery",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <OnTimeDeliveryPage />
          </Suspense>
        ),
      },
    ],
  },
];
