// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { ProtectedRoute } from "@/shared/components/guards";
import BookingListPage from "@/features/booking/pages/BookingListPage";
import BookingDetailsPage from "@/features/booking/pages/BookingDetailsPage";
import BookingFormPage from "@/features/booking/pages/BookingFormPage";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));

// Dev preview: /admin skips the login requirement so the admin UI can be viewed without signing in.
// Production builds always enforce the guard; set VITE_ENFORCE_AUTH=true to test the guard locally.
const skipAdminAuth = import.meta.env.DEV && import.meta.env.VITE_ENFORCE_AUTH !== "true";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: "bookings",
        element: <BookingListPage />,
      },
      {
        path: "bookings/new",
        element: <BookingFormPage mode="create" />,
      },
      {
        path: "bookings/:bookingId",
        element: <BookingDetailsPage />,
      },
      {
        path: "bookings/:bookingId/edit",
        element: <BookingFormPage mode="edit" />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: skipAdminAuth ? (
      <AdminLayout />
    ) : (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="transport-requests" replace /> },
      { path: "booking", element: <Navigate to="/admin/transport-requests" replace /> },
      { path: "bookings", element: <Navigate to="/admin/transport-requests" replace /> },
      {
        path: "transport-requests",
        element: <BookingListPage audience="manager" />,
      },
      {
        path: "transport-requests/:bookingId",
        element: <BookingDetailsPage audience="manager" />,
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
