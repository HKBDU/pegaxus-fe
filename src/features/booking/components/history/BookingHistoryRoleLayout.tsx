import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { resolveBookingHistoryShell } from "../../history/access";

export function BookingHistoryRoleLayout() {
  const roles = useAuthStore((state) => state.principal?.roles);
  const shell = resolveBookingHistoryShell(roles);

  if (!shell) return <Navigate to="/unauthorized" replace />;
  return shell === "admin" ? <AdminLayout /> : <MainLayout />;
}
