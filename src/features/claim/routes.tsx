// oxlint-disable react/only-export-components -- route modules intentionally declare lazy pages and export configuration
import { lazy, Suspense, type ReactNode } from "react"
import type { RouteObject } from "react-router-dom"

import { LOGISTICS_MANAGER_READ } from "@/app/route-config"
import { LoadingState } from "@/shared/components/common"
import { ProtectedRoute } from "@/shared/components/guards"
import { AdminLayout } from "@/shared/layouts/AdminLayout"
import { MainLayout } from "@/shared/layouts/MainLayout"

const ClaimListPage = lazy(() => import("./pages/ClaimListPage"))
const CustomerClaimNewPage = lazy(() => import("./pages/CustomerClaimNewPage"))
const CustomerClaimDetailPage = lazy(() => import("./pages/CustomerClaimDetailPage"))

const page = (element: ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>

/** Flow 6 claims (UC-63, UC-64): the manager list + detail modal, and the customer form and detail. */
export const claimRoutes: RouteObject[] = [
  {
    path: "/admin/claims",
    element: (
      <ProtectedRoute allowedRoles={LOGISTICS_MANAGER_READ.anyRole}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: page(<ClaimListPage />) },
      { path: ":claimId", element: page(<ClaimListPage />) },
    ],
  },
  {
    path: "/bookings/:bookingId/claims",
    element: (
      <ProtectedRoute allowedRoles={["CUSTOMER"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "new", element: page(<CustomerClaimNewPage />) },
      { path: ":claimId", element: page(<CustomerClaimDetailPage />) },
    ],
  },
]
