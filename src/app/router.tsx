// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { ROLE_ROUTES } from "./route-config";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const ProfileSettingsPage = lazy(
  () => import("@/features/profile/pages/ProfileSettingsPage"),
);
const HorsesPage = lazy(() => import("@/features/horse/pages/HorsesPage"));
const AddHorsePage = lazy(() => import("@/features/horse/pages/AddHorsePage"));
const EditHorsePage = lazy(() => import("@/features/horse/pages/EditHorsePage"));
const HorseDetailPage = lazy(() => import("@/features/horse/pages/HorseDetailPage"));

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
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      {
        path: "profile",
        element: (
          <Suspense fallback={<LoadingState />}>
            <ProfileSettingsPage />
          </Suspense>
        ),
      },
    ],
  },
]);
