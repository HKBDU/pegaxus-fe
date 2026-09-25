// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const BookingStatusHistoryPage = lazy(
  () => import("@/features/bookings/pages/BookingStatusHistoryPage"),
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
    path: "/bookings/:bookingId/history",
    element: (
      <Suspense fallback={<LoadingState />}>
        <BookingStatusHistoryPage />
      </Suspense>
    ),
  },
]);
