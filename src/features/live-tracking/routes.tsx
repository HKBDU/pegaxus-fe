// oxlint-disable react/only-export-components -- route modules intentionally export configuration
import { lazy, Suspense } from "react"
import type { RouteObject } from "react-router-dom"
import { LoadingState } from "@/shared/components/common"
import { ProtectedRoute } from "@/shared/components/guards"
import { AdminLayout } from "@/shared/layouts/AdminLayout"
import { MainLayout } from "@/shared/layouts/MainLayout"
import { trackingPaths, TRACKING_ADMIN_ROLES, TRACKING_CUSTOMER_ROLES } from "./constants"

const GpsTabPage = lazy(() => import("./pages/GpsTabPage"))

/**
 * Tab 4 (GPS) routes. Only `admin` and `customer` have one: crew gets no route, so the map library never loads on a
 * phone and a Driver/Escort who types the URL is sent away by the guard (the BE also answers 403).
 */
export const liveTrackingRoutes: RouteObject[] = [
  {
    path: trackingPaths.adminPattern,
    element: (
      <ProtectedRoute allowedRoles={[...TRACKING_ADMIN_ROLES]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <Suspense fallback={<LoadingState />}><GpsTabPage audience="admin" /></Suspense> }],
  },
  {
    path: trackingPaths.customerPattern,
    element: (
      <ProtectedRoute allowedRoles={[...TRACKING_CUSTOMER_ROLES]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <Suspense fallback={<LoadingState />}><GpsTabPage audience="customer" /></Suspense> }],
  },
]
