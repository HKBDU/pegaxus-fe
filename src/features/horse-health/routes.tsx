import type { RouteObject } from "react-router-dom"

import { ProtectedRoute } from "@/shared/components/guards"
import { MainLayout } from "@/shared/layouts/MainLayout"

import CrewHomePage from "./pages/CrewHomePage"
import AssignedTransportsPage from "./pages/AssignedTransportsPage"
import HealthTabPage from "./pages/HealthTabPage"
import HealthLogPage from "./pages/HealthLogPage"

export const horseHealthRoutes: RouteObject[] = [{
  path: "/crew",
  element: <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <CrewHomePage /> }],
}, {
  path: "/crew/transports",
  element: <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <AssignedTransportsPage /> }],
}, {
  path: "/crew/transports/:transportId/health",
  element: <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <HealthTabPage /> }],
}, {
  path: "/crew/transports/:transportId/health/new",
  element: <ProtectedRoute allowedRoles={["ESCORT"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <HealthLogPage /> }],
}, {
  path: "/admin/ongoing-transports/:transportId/health",
  element: <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <HealthTabPage /> }],
}, {
  path: "/bookings/:bookingId/transports/:transportId/health",
  element: <ProtectedRoute allowedRoles={["CUSTOMER"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <HealthTabPage /> }],
}]
