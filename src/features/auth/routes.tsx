// oxlint-disable react/only-export-components -- auth route module exports router configuration
import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";

import { LoadingState } from "@/shared/components/common";
import { GuestRoute, ProtectedRoute } from "@/shared/components/guards";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { AuthShell } from "@/features/auth/components/AuthShell";

const LogoutPage = lazy(() => import("@/features/auth/pages/LogoutPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const GoogleCallbackPage = lazy(
  () => import("@/features/auth/pages/GoogleCallbackPage"),
);
const ForgotPasswordPage = lazy(
  () => import("@/features/auth/pages/ForgotPasswordPage"),
);
const ForgotPasswordOtpPage = lazy(
  () => import("@/features/auth/pages/ForgotPasswordOtpPage"),
);
const ResetPasswordPage = lazy(
  () => import("@/features/auth/pages/ResetPasswordPage"),
);
const VerifyEmailPage = lazy(
  () => import("@/features/auth/pages/VerifyEmailPage"),
);
const ChangePasswordPage = lazy(
  () => import("@/features/auth/pages/ChangePasswordPage"),
);

const page = (element: ReactNode) => (
  <Suspense fallback={<LoadingState />}>{element}</Suspense>
);

export const authRoutes: RouteObject[] = [
  {
    path: "/logout",
    element: <ProtectedRoute>{page(<LogoutPage />)}</ProtectedRoute>,
  },
  {
    path: "/change-password",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [{ index: true, element: page(<ChangePasswordPage />) }],
  },
  {
    element: <AuthShell />,
    children: [
      { path: "/login", element: <GuestRoute>{page(<LoginPage />)}</GuestRoute> },
      { path: "/auth/google/callback", element: page(<GoogleCallbackPage />) },
      { path: "/register", element: <GuestRoute>{page(<RegisterPage />)}</GuestRoute> },
      {
        path: "/forgot-password",
        element: <GuestRoute>{page(<ForgotPasswordPage />)}</GuestRoute>,
      },
      {
        path: "/verify-email",
        element: <GuestRoute>{page(<VerifyEmailPage />)}</GuestRoute>,
      },
      {
        path: "/forgot-password/verify-otp",
        element: <GuestRoute>{page(<ForgotPasswordOtpPage />)}</GuestRoute>,
      },
      {
        path: "/reset-password",
        element: <GuestRoute>{page(<ResetPasswordPage />)}</GuestRoute>,
      },
    ],
  },
];
