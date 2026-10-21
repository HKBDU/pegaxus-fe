import type { RouteObject } from "react-router-dom";

import { ProtectedRoute } from "@/shared/components/guards";
import { MainLayout } from "@/shared/layouts/MainLayout";

import HorseHealthIncidentPage from "./pages/HorseHealthIncidentPage";
import VehicleIncidentPage from "./pages/VehicleIncidentPage";

export const incidentRoutes: RouteObject[] = [
  {
    path: "/crew/incidents/new/vehicle",
    element: (
      <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <VehicleIncidentPage /> }],
  },
  {
    path: "/crew/incidents/new/horse-health",
    element: (
      <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <HorseHealthIncidentPage /> }],
  },
];
