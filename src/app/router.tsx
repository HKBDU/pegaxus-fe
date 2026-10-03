// oxlint-disable react/only-export-components -- router modules intentionally export configuration
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import {
  ErrorState,
  LoadingState,
  NotFoundPage,
} from "@/shared/components/common";
import { ProtectedRoute } from "@/shared/components/guards";
import { AdminLayout } from "@/shared/layouts/AdminLayout";
import { MainLayout } from "@/shared/layouts/MainLayout";
import { BookingHistoryRoleLayout } from "@/features/booking/components/history/BookingHistoryRoleLayout";
import { ROLE_ROUTES } from "./route-config";
import BookingListPage from "@/features/booking/pages/BookingListPage";
import BookingDetailsPage from "@/features/booking/pages/BookingDetailsPage";
import BookingFormPage from "@/features/booking/pages/BookingFormPage";
import { AuthShell } from "@/features/auth/components/AuthShell";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const ManageUserAccountsPage = lazy(() => import("@/features/accounts/pages/ManageUserAccountsPage"));
const CreateEmployeeAccountPage = lazy(() => import("@/features/accounts/pages/CreateEmployeeAccountPage"));
const ViewUserAccountPage = lazy(() => import("@/features/accounts/pages/ViewUserAccountPage"));
const EditUserAccountPage = lazy(() => import("@/features/accounts/pages/EditUserAccountPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const GoogleCallbackPage = lazy(
  () => import("@/features/auth/pages/GoogleCallbackPage"),
);
const LogoutPage = lazy(() => import("@/features/auth/pages/LogoutPage"));
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
const ProfileSettingsPage = lazy(
  () => import("@/features/profile/pages/ProfileSettingsPage"),
);
const HorsesPage = lazy(() => import("@/features/horse/pages/HorsesPage"));
const AddHorsePage = lazy(() => import("@/features/horse/pages/AddHorsePage"));
const EditHorsePage = lazy(
  () => import("@/features/horse/pages/EditHorsePage"),
);
const HorseDetailPage = lazy(
  () => import("@/features/horse/pages/HorseDetailPage"),
);
const BookingStatusHistoryPage = lazy(
  () => import("@/features/booking/pages/BookingStatusHistoryPage"),
);
const ComplianceListPage = lazy(
  () => import("@/features/compliance-catalog/pages/ComplianceListPage"),
);
const ComplianceFormPage = lazy(
  () => import("@/features/compliance-catalog/pages/ComplianceFormPage"),
);
const TemplateListPage = lazy(
  () => import("@/features/compliance-catalog/pages/TemplateListPage"),
);
const TemplateFormPage = lazy(
  () => import("@/features/compliance-catalog/pages/TemplateFormPage"),
);
const ApplyTemplatePage = lazy(
  () => import("@/features/compliance-catalog/pages/ApplyTemplatePage"),
);
const DossierDashboardPage = lazy(
  () => import("@/features/dossier/pages/DossierDashboardPage"),
);
const DossierAuditHistoryPage = lazy(
  () => import("@/features/dossier/pages/DossierAuditHistoryPage"),
);
const DossierRequirementsPage = lazy(
  () => import("@/features/compliance-catalog/pages/DossierRequirementsPage"),
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
        element: <ProtectedRoute />,
        children: [
          {
            path: ROLE_ROUTES.customerHorses + "/:horseId",
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <Suspense fallback={<LoadingState />}>
                  <HorseDetailPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: ROLE_ROUTES.customerHorses + "/:horseId/edit",
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <Suspense fallback={<LoadingState />}>
                  <EditHorsePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: ROLE_ROUTES.customerHorses + "/new",
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <Suspense fallback={<LoadingState />}>
                  <AddHorsePage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: ROLE_ROUTES.customerHorses,
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <Suspense fallback={<LoadingState />}>
                  <HorsesPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: ROLE_ROUTES.customerProfile,
            element: (
              <ProtectedRoute>
                <Suspense fallback={<LoadingState />}>
                  <ProfileSettingsPage />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: "bookings",
            element: <ProtectedRoute allowedRoles={["CUSTOMER"]}><BookingListPage /></ProtectedRoute>,
          },
          {
            path: "bookings/new",
            element: <ProtectedRoute allowedRoles={["CUSTOMER"]}><BookingFormPage mode="create" /></ProtectedRoute>,
          },
          {
            path: "bookings/:bookingId",
            element: <ProtectedRoute allowedRoles={["CUSTOMER"]}><BookingDetailsPage /></ProtectedRoute>,
          },
          {
            path: "bookings/:bookingId/edit",
            element: <ProtectedRoute allowedRoles={["CUSTOMER"]}><BookingFormPage mode="edit" /></ProtectedRoute>,
          },
        ],
      },
      {
        path: "unauthorized",
        element: (
          <ErrorState message="You do not have permission to view this page." />
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
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="transport-requests" replace /> },
      {
        path: "booking",
        element: <Navigate to="/admin/transport-requests" replace />,
      },
      {
        path: "bookings",
        element: <Navigate to="/admin/transport-requests" replace />,
      },
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
        path: ROLE_ROUTES.managerUsers,
        element: (
          <Suspense fallback={<LoadingState />}>
            <ManageUserAccountsPage />
          </Suspense>
        ),
      },
      {
        path: ROLE_ROUTES.managerCreateUser,
        element: <Suspense fallback={<LoadingState />}><CreateEmployeeAccountPage /></Suspense>,
      },
      {
        path: "users/:employeeId",
        element: <Suspense fallback={<LoadingState />}><ViewUserAccountPage /></Suspense>,
      },
      {
        path: "users/:employeeId/edit",
        element: <Suspense fallback={<LoadingState />}><EditUserAccountPage /></Suspense>,
      },
      {
        path: "transport-requests/:bookingId",
        element: <BookingDetailsPage audience="manager" />,
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    // Flow 2 catalog: TS manages it, LM reads it (API contract C1-C6).
    path: ROLE_ROUTES.complianceRequirements,
    element: (
      <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={<LoadingState />}><ComplianceListPage /></Suspense>,
      },
      {
        path: "new",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}><ComplianceFormPage mode="create" /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ":complianceRequirementId/edit",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}><ComplianceFormPage mode="edit" /></Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    // Flow 2 templates (UC-17): TS manages them, LM reads them (API contract T1-T6).
    path: ROLE_ROUTES.dossierTemplates,
    element: (
      <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={<LoadingState />}><TemplateListPage /></Suspense>,
      },
      {
        path: "new",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}><TemplateFormPage mode="create" /></Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ":dossierTemplateId/edit",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}><TemplateFormPage mode="edit" /></Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    // Flow 2, UC-18: the TS creates the ComplianceDossier of an APPROVED booking.
    path: `${ROLE_ROUTES.complianceDossiers}/new/:bookingId`,
    element: (
      <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Suspense fallback={<LoadingState />}><ApplyTemplatePage /></Suspense>,
      },
    ],
  },
  {
    // Flow 2: tracking dashboard (UC-30), requirement management (UC-19) and audit history (UC-31). TS and LM only.
    path: ROLE_ROUTES.complianceDossiers,
    element: (
      <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<LoadingState />}><DossierDashboardPage /></Suspense> },
      { path: ":dossierId/requirements", element: <Suspense fallback={<LoadingState />}><DossierRequirementsPage /></Suspense> },
      { path: ":dossierId/audit-history", element: <Suspense fallback={<LoadingState />}><DossierAuditHistoryPage /></Suspense> },
    ],
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
    element: <AuthShell />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/auth/google/callback", element: <GoogleCallbackPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/verify-email", element: <VerifyEmailPage /> },
      {
        path: "/forgot-password/verify-otp",
        element: <ForgotPasswordOtpPage />,
      },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      {
        path: "/change-password",
        element: (
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        ),
      },
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
