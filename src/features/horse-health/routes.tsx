import type { RouteObject } from "react-router-dom"

import { ProtectedRoute } from "@/shared/components/guards"
import { MainLayout } from "@/shared/layouts/MainLayout"

import CrewHomePage from "./pages/CrewHomePage"
import AssignedTransportsPage from "./pages/AssignedTransportsPage"
import HealthTabPage from "./pages/HealthTabPage"
import HealthLogPage from "./pages/HealthLogPage"
import HealthHistoryPage from "./pages/HealthHistoryPage"

/** Crew entry pages: the mobile Home with the big buttons and the list of assigned transports. */
export const horseHealthRoutes: RouteObject[] = [{
  path: "/crew",
  element: <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <CrewHomePage /> }],
}, {
  path: "/crew/transports",
  element: <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}><MainLayout /></ProtectedRoute>,
  children: [{ index: true, element: <AssignedTransportsPage /> }],
}]

/** Horse Health tab, relative to the transport URL; it renders inside the transport shell and works for every audience. */
export const horseHealthTabRoutes: RouteObject[] = [
  { path: "health", element: <HealthTabPage /> },
  { path: "health/:horseId", element: <HealthHistoryPage /> },
]

/** Escort-only form to record a health check: a full page under the crew transport URL, outside the tab shell. */
export const horseHealthCrewFormRoutes: RouteObject[] = [{
  path: "health/new",
  element: <ProtectedRoute allowedRoles={["ESCORT"]}><HealthLogPage /></ProtectedRoute>,
}]
