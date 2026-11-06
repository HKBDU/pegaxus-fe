// oxlint-disable react/only-export-components -- route modules intentionally declare lazy pages and export configuration
import { lazy, Suspense, type ReactNode } from "react"
import type { RouteObject } from "react-router-dom"

import { LOGISTICS_MANAGER_READ } from "@/app/route-config"
import { LoadingState } from "@/shared/components/common"
import { ProtectedRoute } from "@/shared/components/guards"
import { AdminLayout } from "@/shared/layouts/AdminLayout"

const PriceListDetailPage = lazy(() => import("./pages/PriceListDetailPage"))

const page = (element: ReactNode) => <Suspense fallback={<LoadingState />}>{element}</Suspense>

/** Flow 6 price lists (UC-78, UC-79), Logistics Manager only. This file holds the detail page; the list page adds its own `index` child. */
export const priceListRoutes: RouteObject[] = [
  {
    path: "/admin/price-lists",
    element: (
      <ProtectedRoute allowedRoles={LOGISTICS_MANAGER_READ.anyRole}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ path: ":priceListId", element: page(<PriceListDetailPage />) }],
  },
]
