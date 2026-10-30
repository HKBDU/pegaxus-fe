// oxlint-disable react/only-export-components -- route modules intentionally export configuration
import { lazy, Suspense } from "react"
import type { RouteObject } from "react-router-dom"
import { LoadingState } from "@/shared/components/common"
import type { TrackingAudience } from "./constants"

const GpsTabPage = lazy(() => import("./pages/GpsTabPage"))

/**
 * GPS Map tab, relative to the transport URL (`gps`); it renders inside the transport shell for every audience, crew included.
 */
export const liveTrackingTabRoutes = (audience: TrackingAudience): RouteObject[] => [
  { path: "gps", element: <Suspense fallback={<LoadingState />}><GpsTabPage audience={audience} /></Suspense> },
]
