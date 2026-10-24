// oxlint-disable react/only-export-components -- route configuration owns lazy page declarations
import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/shared/components/guards";
import { LoadingState } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

const OnTimeDeliveryPage = lazy(() => import("./pages/OnTimeDeliveryPage"));
const IncidentClaimReportPage = lazy(
  () => import("./pages/IncidentClaimReportPage"),
);
export const managementReportRoutes: RouteObject[] = [
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
