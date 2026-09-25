import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { ProtectedRoute } from "@/shared/components/guards";
import { BookingHistoryRoleLayout } from "@/features/bookings/components/BookingHistoryRoleLayout";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const BookingStatusHistoryPage = lazy(
  () => import("@/features/bookings/pages/BookingStatusHistoryPage"),
);
const bookingHistoryPage = (
  <Suspense fallback={<LoadingState />}>
    <BookingStatusHistoryPage />
  </Suspense>
);

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
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
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
