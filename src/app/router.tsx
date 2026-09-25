// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const ProfileSettingsPage = lazy(
  () => import("@/features/profile/pages/ProfileSettingsPage"),
);
const HorsesPage = lazy(() => import("@/features/horse/pages/HorsesPage"));
const AddHorsePage = lazy(() => import("@/features/horse/pages/AddHorsePage"));
const EditHorsePage = lazy(() => import("@/features/horse/pages/EditHorsePage"));

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
        path: "my-horses/:horseId/edit",
        element: (
          <Suspense fallback={<LoadingState />}>
            <EditHorsePage />
          </Suspense>
        ),
      },
      {
        path: "my-horses/new",
        element: (
          <Suspense fallback={<LoadingState />}>
            <AddHorsePage />
          </Suspense>
        ),
      },
      {
        path: "my-horses",
        element: (
          <Suspense fallback={<LoadingState />}>
            <HorsesPage />
          </Suspense>
        ),
      },
      {
        path: "profile-settings",
        element: (
          <Suspense fallback={<LoadingState />}>
            <ProfileSettingsPage />
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
