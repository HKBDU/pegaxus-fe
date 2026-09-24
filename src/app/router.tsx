// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { LoadingState, NotFoundPage } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ForgotPasswordOtpPage = lazy(() => import("@/features/auth/pages/ForgotPasswordOtpPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
const ChangePasswordPage = lazy(
  () => import("@/features/auth/pages/ChangePasswordPage"),
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
    path: "/login",
    element: (
      <Suspense fallback={<LoadingState />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/register",
    element: (
      <Suspense fallback={<LoadingState />}>
        <RegisterPage />
      </Suspense>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <Suspense fallback={<LoadingState />}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: "/verify-email",
    element: (
      <Suspense fallback={<LoadingState />}>
        <VerifyEmailPage />
      </Suspense>
    ),
  },
  {
    path: "/forgot-password/verify-otp",
    element: (
      <Suspense fallback={<LoadingState />}>
        <ForgotPasswordOtpPage />
      </Suspense>
    ),
  },
  {
    path: "/reset-password",
    element: (
      <Suspense fallback={<LoadingState />}>
        <ResetPasswordPage />
      </Suspense>
    ),
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingState />}>
          <ChangePasswordPage />
        </Suspense>
      </ProtectedRoute>
    ),
  },
]);
