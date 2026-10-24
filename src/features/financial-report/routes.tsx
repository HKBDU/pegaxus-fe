// oxlint-disable react/only-export-components -- route module exports configuration with lazy pages
import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import { LoadingState } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";

const FinancialSummaryPage = lazy(() => import("./pages/FinancialSummaryPage"));

export const financialReportRoutes: RouteObject[] = [
  {
    path: "/admin/transports/:transportId/financial-summary",
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
            <FinancialSummaryPage />
          </Suspense>
        ),
      },
    ],
  },
];
