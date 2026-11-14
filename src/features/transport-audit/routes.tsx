import { lazy, Suspense, type ReactNode } from "react";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { LoadingState } from "@/shared/components/common";
const TransportArchivePage = lazy(() => import("./pages/TransportArchivePage"));
const TransportAuditDetailPage = lazy(
  () => import("./pages/TransportAuditDetailPage"),
);
const CustomerTransportHistoryPage = lazy(
  () => import("./pages/CustomerTransportHistoryPage"),
);
const page = (element: ReactNode) => (
  <Suspense fallback={<LoadingState />}>{element}</Suspense>
);
export const transportAuditAdminRoutes = {
  path: "transport-archive",
  element: page(<TransportArchivePage />),
};
export const transportAuditDetailRoute = {
  path: "transports/:transportId/audit",
  element: page(<TransportAuditDetailPage />),
};
export const transportAuditCustomerRoutes = {
  path: "bookings/:bookingId/transports/:transportId/history",
  element: page(<CustomerTransportHistoryPage />),
};
export const transportAuditRoutes = [
  {
    path: "/admin/transport-archive",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<TransportArchivePage />) }],
  },
  {
    path: "/admin/transports/:transportId/audit",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<TransportAuditDetailPage />) }],
  },
  {
    path: "/bookings/:bookingId/transports/:transportId/history",
    element: (
      <ProtectedRoute allowedRoles={["CUSTOMER"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<CustomerTransportHistoryPage />) }],
  },
];
