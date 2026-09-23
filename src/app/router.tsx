// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));

export const router = createBrowserRouter([
  {
    path: "/",
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
]);
