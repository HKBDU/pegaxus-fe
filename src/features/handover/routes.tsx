// oxlint-disable react/only-export-components -- route modules intentionally declare lazy pages and export configuration
import { lazy, Suspense } from "react"
import type { RouteObject } from "react-router-dom"
import { LoadingState } from "@/shared/components/common"
import type { HandoverAudience } from "./constants"

const HandoverListPage = lazy(() => import("./pages/HandoverListPage"))
const HandoverStartPage = lazy(() => import("./pages/HandoverStartPage"))
const HandoverRecordPage = lazy(() => import("./pages/HandoverRecordPage"))

const page = (element: React.ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>

/**
 * Handovers tab, relative to the transport URL; it renders inside the transport shell, which already guards the audience.
 * The list is the first screen, a record opens in the screen that matches its status. `new` is declared before `:handoverId`
 * so the literal wins (React Router ranks static segments higher anyway).
 */
export const handoverTabRoutes = (audience: HandoverAudience): RouteObject[] => [
  { path: "handovers", element: page(<HandoverListPage audience={audience} />) },
  { path: "handovers/new", element: page(<HandoverStartPage audience={audience} />) },
  { path: "handovers/:handoverId", element: page(<HandoverRecordPage audience={audience} />) },
]
