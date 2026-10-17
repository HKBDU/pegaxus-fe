// oxlint-disable react/only-export-components -- route modules intentionally export configuration
import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { ONGOING_TRANSPORT_ACCESS, ROLE_ROUTES } from "@/app/route-config";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

const OngoingTransportListPage = lazy(
  () => import("./pages/OngoingTransportListPage"),
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
    ],
  },
];
