// oxlint-disable react/only-export-components -- route modules intentionally declare lazy pages and export configuration
import { lazy, Suspense, type ReactNode } from "react"
import type { RouteObject } from "react-router-dom"

import { INCIDENT_ADMIN_ACCESS } from "@/app/route-config"
import { LoadingState } from "@/shared/components/common"
import { ProtectedRoute } from "@/shared/components/guards"
import { AdminLayout } from "@/shared/layouts/AdminLayout"
import { MainLayout } from "@/shared/layouts/MainLayout"

const IncidentListPage = lazy(() => import("./pages/IncidentListPage"))
const IncidentDetailPage = lazy(() => import("./pages/IncidentDetailPage"))
const CustomerIncidentPage = lazy(() => import("./pages/CustomerIncidentPage"))

const page = (element: ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>

/** SCR-F5-001 / 002 / 003. The reroute page (`/admin/incidents/:id/reroute`) belongs to the incident-response feature. */
export const incidentManagementRoutes: RouteObject[] = [
  {
    path: "/admin/incidents",
    element: (
      <ProtectedRoute allowedRoles={INCIDENT_ADMIN_ACCESS.anyRole}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: page(<IncidentListPage />) },
      { path: ":incidentReportId", element: page(<IncidentDetailPage audience="admin" />) },
    ],
  },
  {
    path: "/crew/incidents/:incidentReportId",
    element: (
      <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<IncidentDetailPage audience="crew" />) }],
  },
  {
    path: "/bookings/:bookingId/transports/:transportId/incidents/:incidentReportId",
    element: (
      <ProtectedRoute allowedRoles={["CUSTOMER"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<CustomerIncidentPage />) }],
  },
]
