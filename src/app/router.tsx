import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { ProtectedRoute } from "@/shared/components/guards";
import { BookingHistoryRoleLayout } from "@/features/bookings/components/BookingHistoryRoleLayout";
import { ROLE_ROUTES } from "./route-config";
import BookingListPage from "@/features/booking/pages/BookingListPage";
import BookingDetailsPage from "@/features/booking/pages/BookingDetailsPage";
import BookingFormPage from "@/features/booking/pages/BookingFormPage";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const ProfileSettingsPage = lazy(
  () => import("@/features/profile/pages/ProfileSettingsPage"),
);
const HorsesPage = lazy(() => import("@/features/horse/pages/HorsesPage"));
const AddHorsePage = lazy(() => import("@/features/horse/pages/AddHorsePage"));
const EditHorsePage = lazy(() => import("@/features/horse/pages/EditHorsePage"));
const HorseDetailPage = lazy(() => import("@/features/horse/pages/HorseDetailPage"));
const BookingStatusHistoryPage = lazy(
  () => import("@/features/bookings/pages/BookingStatusHistoryPage"),
);
const bookingHistoryPage = (
  <Suspense fallback={<LoadingState />}>
    <BookingStatusHistoryPage />
  </Suspense>
);

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
        element: <Suspense fallback={<LoadingState />}><HomePage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.customerHorses + "/:horseId",
        element: <Suspense fallback={<LoadingState />}><HorseDetailPage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.customerHorses + "/:horseId/edit",
        element: <Suspense fallback={<LoadingState />}><EditHorsePage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.customerHorses + "/new",
        element: <Suspense fallback={<LoadingState />}><AddHorsePage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.customerHorses,
        element: <Suspense fallback={<LoadingState />}><HorsesPage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.customerProfile,
        element: <Suspense fallback={<LoadingState />}><ProfileSettingsPage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.managerCustomerProfile,
        element: <Suspense fallback={<LoadingState />}><ProfileSettingsPage /></Suspense>,
      },
      {
        path: ROLE_ROUTES.managerHorseDetail,
        element: <Suspense fallback={<LoadingState />}><HorseDetailPage /></Suspense>,
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
        path: "profile",
        element: (
          <Suspense fallback={<LoadingState />}>
            <ProfileSettingsPage />
          </Suspense>
        ),
      },
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
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <BookingHistoryRoleLayout />,
        children: [
          {
            path: "/bookings/:bookingId/history",
            element: bookingHistoryPage,
          },
        ],
      },
    ],
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: "/__dev/customer/bookings/:bookingId/history",
          element: <MainLayout />,
          children: [{ index: true, element: bookingHistoryPage }],
        },
        {
          path: "/__dev/admin/bookings/:bookingId/history",
          element: <AdminLayout />,
          children: [{ index: true, element: bookingHistoryPage }],
        },
      ]
    : []),
]);
