// oxlint-disable react/only-export-components -- route modules intentionally declare lazy pages and export configuration
import { lazy, Suspense } from "react"
import { Outlet, type RouteObject } from "react-router-dom"
import { ProtectedRoute } from "@/shared/components/guards/ProtectedRoute"
import { LoadingState } from "@/shared/components/common"
import { AdminLayout } from "@/shared/layouts/AdminLayout"
import { MainLayout } from "@/shared/layouts/MainLayout"
import { ADMIN_ROLES, CREW_ROLES, CUSTOMER_ROLES, handoverPaths, type HandoverAudience } from "./constants"

const HandoverListPage = lazy(() => import("./pages/HandoverListPage"))
const HandoverStartPage = lazy(() => import("./pages/HandoverStartPage"))
const HandoverRecordPage = lazy(() => import("./pages/HandoverRecordPage"))

const page = (element: React.ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>

const children = (audience: HandoverAudience): RouteObject[] => [
  { index: true, element: page(<HandoverListPage audience={audience} />) },
  // `new` is declared before `:handoverId` so the literal wins; React Router ranks static segments higher anyway.
  { path: "new", element: page(<HandoverStartPage audience={audience} />) },
  { path: ":handoverId", element: page(<HandoverRecordPage audience={audience} />) },
]

/**
 * Handover routes, three groups with their own guard and layout: admin (LM, RC, TS) in the desktop shell, the crew in a
 * phone shell that each page draws itself, and the customer (read only) in the customer shell.
 */
export const handoverRoutes: RouteObject[] = [
  {
    path: handoverPaths.adminPattern,
    element: <ProtectedRoute allowedRoles={ADMIN_ROLES}><AdminLayout /></ProtectedRoute>,
    children: children("admin"),
  },
  {
    path: handoverPaths.crewPattern,
    element: <ProtectedRoute allowedRoles={CREW_ROLES}><Outlet /></ProtectedRoute>,
    children: children("crew"),
  },
  {
    path: handoverPaths.customerPattern,
    element: <ProtectedRoute allowedRoles={CUSTOMER_ROLES}><MainLayout /></ProtectedRoute>,
    children: children("customer"),
  },
]
