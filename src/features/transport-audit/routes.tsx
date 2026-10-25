import { lazy } from "react";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
const TransportArchivePage = lazy(() => import("./pages/TransportArchivePage"));
const TransportAuditDetailPage = lazy(
  () => import("./pages/TransportAuditDetailPage"),
);
const CustomerTransportHistoryPage = lazy(
  () => import("./pages/CustomerTransportHistoryPage"),
);
export const transportAuditAdminRoutes = {
  path: "transport-archive",
  element: <TransportArchivePage />,
};
export const transportAuditDetailRoute = {
  path: "transports/:transportId/audit",
  element: <TransportAuditDetailPage />,
};
export const transportAuditCustomerRoutes = {
  path: "bookings/:bookingId/transports/:transportId/history",
  element: <CustomerTransportHistoryPage />,
};
export const transportAuditRoutes = [
  {
    path: "/admin/transport-archive",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <TransportArchivePage /> }],
  },
  {
    path: "/admin/transports/:transportId/audit",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <TransportAuditDetailPage /> }],
  },
  {
    path: "/bookings/:bookingId/transports/:transportId/history",
    element: (
      <ProtectedRoute allowedRoles={["CUSTOMER"]}>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: <CustomerTransportHistoryPage /> }],
  },
];
