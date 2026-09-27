// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ErrorState, LoadingState, NotFoundPage } from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { ROLE_ROUTES } from "./route-config";
import BookingListPage from "@/features/booking/pages/BookingListPage";
import BookingDetailsPage from "@/features/booking/pages/BookingDetailsPage";
import BookingFormPage from "@/features/booking/pages/BookingFormPage";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const GoogleCallbackPage = lazy(() => import("@/features/auth/pages/GoogleCallbackPage"));
const LogoutPage = lazy(() => import("@/features/auth/pages/LogoutPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ForgotPasswordOtpPage = lazy(() => import("@/features/auth/pages/ForgotPasswordOtpPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("@/features/auth/pages/VerifyEmailPage"));
const ChangePasswordPage = lazy(
  () => import("@/features/auth/pages/ChangePasswordPage"),
);
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
        element: <ProtectedRoute />,
        children: [
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
        ],
      },
      {
        path: "unauthorized",
        element: <ErrorState message="You do not have permission to view this page." />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
  {
    path: "/admin",
    element: (
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
    path: "/login",
    element: (
      <Suspense fallback={<LoadingState />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/auth/google/callback",
    element: (
      <Suspense fallback={<LoadingState />}>
        <GoogleCallbackPage />
      </Suspense>
    ),
  },
  {
    path: "/logout",
    element: (
      <ProtectedRoute>
        <Suspense fallback={<LoadingState />}>
          <LogoutPage />
        </Suspense>
      </ProtectedRoute>
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
