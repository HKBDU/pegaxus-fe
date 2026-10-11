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
import { APPROVED_BOOKINGS_ACCESS, TRANSPORT_PLANS_ACCESS, ROLE_ROUTES } from "./route-config";
import BookingListPage from "@/features/booking/pages/BookingListPage";
import BookingDetailsPage from "@/features/booking/pages/BookingDetailsPage";
import BookingFormPage from "@/features/booking/pages/BookingFormPage";
import { AuthShell } from "@/features/auth/components/AuthShell";
import BcpQuarantineProofPage from "@/features/quarantine/pages/BcpQuarantineProofPage";
import QuarantineReviewPage from "@/features/quarantine/pages/QuarantineReviewPage";
import AuthoritySubmissionPage from "@/features/authority/pages/AuthoritySubmissionPage";
import AuthorityReviewPage from "@/features/authority/pages/AuthorityReviewPage";
import CustomsClearanceProofPage from "@/features/clearance/pages/CustomsClearanceProofPage";
import CustomsClearanceReviewPage from "@/features/clearance/pages/CustomsClearanceReviewPage";

const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const ManageUserAccountsPage = lazy(
  () => import("@/features/accounts/pages/ManageUserAccountsPage"),
);
const CreateEmployeeAccountPage = lazy(
  () => import("@/features/accounts/pages/CreateEmployeeAccountPage"),
);
const ViewUserAccountPage = lazy(
  () => import("@/features/accounts/pages/ViewUserAccountPage"),
);
const EditUserAccountPage = lazy(
  () => import("@/features/accounts/pages/EditUserAccountPage"),
);
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
const DossierDetailsPage = lazy(
  () => import("@/features/dossier/pages/DossierDetailsPage"),
);
const DossierAuditHistoryPage = lazy(
  () => import("@/features/dossier/pages/DossierAuditHistoryPage"),
);
const DossierRequirementsPage = lazy(
  () => import("@/features/compliance-catalog/pages/DossierRequirementsPage"),
);
const CreateRoutePlanPage = lazy(() => import("@/features/route-plan/pages/CreateRoutePlanPage"));
const CreateContingencyRoutePage = lazy(() => import("@/features/route-plan/pages/CreateContingencyRoutePage"));
const CreateReturnRoutePage = lazy(() => import("@/features/route-plan/pages/CreateReturnRoutePage"));
const EditRoutePlanPage = lazy(() => import("@/features/route-plan/pages/EditRoutePlanPage"));
const MapAssetsPage = lazy(() => import("@/features/route-plan/pages/MapAssetsPage"));
const ApprovedBookingsPage = lazy(
  () => import("@/features/transport-plan/pages/ApprovedBookingsPage"),
);
const ApprovedBookingDetailsPage = lazy(
  () => import("@/features/transport-plan/pages/ApprovedBookingDetailsPage"),
);
const TransportPlansPage = lazy(
  () => import("@/features/transport-plan/pages/TransportPlansPage"),
);
const TransportPlanDetailsPage = lazy(
  () => import("@/features/transport-plan/pages/TransportPlanDetailsPage"),
);
const DevRoutePlanDetailPage = lazy(
  () => import("@/features/route-view/pages/RoutePlanDetailPage"),
);
const bookingHistoryPage = (
  <Suspense fallback={<LoadingState />}>
    <BookingStatusHistoryPage />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: ROLE_ROUTES.transportPlans,
    element: <ProtectedRoute allowedRoles={TRANSPORT_PLANS_ACCESS.anyRole}><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Suspense fallback={<LoadingState />}><TransportPlansPage /></Suspense> },
      { path: ":transportPlanId", element: <Suspense fallback={<LoadingState />}><TransportPlanDetailsPage /></Suspense> },
    ],
  },
  {
    // A separate guarded branch keeps the other admin pages manager-only.
    path: ROLE_ROUTES.approvedBookings,
    element: <ProtectedRoute allowedRoles={APPROVED_BOOKINGS_ACCESS.anyRole}><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Suspense fallback={<LoadingState />}><ApprovedBookingsPage /></Suspense> },
      { path: ":bookingId", element: <Suspense fallback={<LoadingState />}><ApprovedBookingDetailsPage /></Suspense> },
    ],
  },
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
            path: "compliance-dossiers/:dossierId",
            element: <ProtectedRoute allowedRoles={["CUSTOMER"]}><Suspense fallback={<LoadingState />}><DossierDetailsPage /></Suspense></ProtectedRoute>,
          },
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
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <BookingListPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "bookings/new",
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <BookingFormPage mode="create" />
              </ProtectedRoute>
            ),
          },
          {
            path: "bookings/:bookingId",
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <BookingDetailsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "bookings/:bookingId/edit",
            element: (
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <BookingFormPage mode="edit" />
              </ProtectedRoute>
            ),
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
      { path: "compliance-dossiers/:dossierId", element: <Suspense fallback={<LoadingState />}><DossierDetailsPage /></Suspense> },
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
        element: (
          <Suspense fallback={<LoadingState />}>
            <CreateEmployeeAccountPage />
          </Suspense>
        ),
      },
      {
        path: "users/:employeeId",
        element: (
          <Suspense fallback={<LoadingState />}>
            <ViewUserAccountPage />
          </Suspense>
        ),
      },
      {
        path: "users/:employeeId/edit",
        element: (
          <Suspense fallback={<LoadingState />}>
            <EditUserAccountPage />
          </Suspense>
        ),
      },
      {
        path: "transport-requests/:bookingId",
        element: <BookingDetailsPage audience="manager" />,
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: ROLE_ROUTES.mapAssets,
    element: (
      <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<LoadingState />}><MapAssetsPage /></Suspense> },
    ],
  },
  {
    path: "/admin/route-plans",
    element: (
      <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "new/:transportPlanId", element: <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}><Suspense fallback={<LoadingState />}><CreateRoutePlanPage /></Suspense></ProtectedRoute> },
      { path: ":routePlanId/edit", element: <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}><Suspense fallback={<LoadingState />}><EditRoutePlanPage /></Suspense></ProtectedRoute> },
      { path: "new/:transportPlanId/contingency", element: <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}><Suspense fallback={<LoadingState />}><CreateContingencyRoutePage /></Suspense></ProtectedRoute> },
      { path: "new/:transportPlanId/return", element: <ProtectedRoute allowedRoles={["FLEET_ROUTE_COORDINATOR"]}><Suspense fallback={<LoadingState />}><CreateReturnRoutePage /></Suspense></ProtectedRoute> },
    ],
  },
  {
    // Flow 2 catalog: TS manages it, LM reads it (API contract C1-C6).
    path: ROLE_ROUTES.complianceRequirements,
    element: (
      <ProtectedRoute
        allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}
      >
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <ComplianceListPage />
          </Suspense>
        ),
      },
      {
        path: "new",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}>
              <ComplianceFormPage mode="create" />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ":complianceRequirementId/edit",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}>
              <ComplianceFormPage mode="edit" />
            </Suspense>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    // Flow 2 templates (UC-17): TS manages them, LM reads them (API contract T1-T6).
    path: ROLE_ROUTES.dossierTemplates,
    element: (
      <ProtectedRoute
        allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}
      >
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <TemplateListPage />
          </Suspense>
        ),
      },
      {
        path: "new",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}>
              <TemplateFormPage mode="create" />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: ":dossierTemplateId/edit",
        element: (
          <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
            <Suspense fallback={<LoadingState />}>
              <TemplateFormPage mode="edit" />
            </Suspense>
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
        element: (
          <Suspense fallback={<LoadingState />}>
            <ApplyTemplatePage />
          </Suspense>
        ),
      },
    ],
  },
  {
    // Flow 2: tracking dashboard (UC-30), requirement management (UC-19) and audit history (UC-31). TS and LM only.
    path: ROLE_ROUTES.complianceDossiers,
    element: (
      <ProtectedRoute
        allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}
      >
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Suspense fallback={<LoadingState />}><DossierDashboardPage /></Suspense> },
      { path: ":dossierId/details", element: <Suspense fallback={<LoadingState />}><DossierDetailsPage /></Suspense> },
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
    path: "/compliance-dossiers/:dossierId",
    element: (
      <ProtectedRoute
        allowedRoles={["CUSTOMER", "TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}
      >
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingState />}>
            <DossierDetailsPage />
          </Suspense>
        ),
      },
    ],
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
      {
        element: (
          <ProtectedRoute allowedRoles={["DRIVER", "ESCORT"]}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "/compliance-dossiers/:dossierId/bcp-quarantine-proof",
            element: (
              <ProtectedRoute allowedRoles={["ESCORT"]}>
                <BcpQuarantineProofPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/compliance-dossiers/:dossierId/quarantine-proof",
            element: (
              <ProtectedRoute allowedRoles={["ESCORT"]}>
                <BcpQuarantineProofPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/compliance-dossiers/:dossierId/customs-clearance-proof",
            element: (
              <ProtectedRoute allowedRoles={["DRIVER"]}>
                <CustomsClearanceProofPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        element: (
          <ProtectedRoute
            allowedRoles={["TRANSPORT_SPECIALIST", "LOGISTICS_MANAGER"]}
          >
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: "/quarantine-proofs/:proofId/verify",
            element: <QuarantineReviewPage />,
          },
          {
            path: "/compliance-dossiers/:dossierId/authority-submission",
            element: (
              <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
                <AuthoritySubmissionPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/authority-submissions/:submissionId/review",
            element: (
              <ProtectedRoute allowedRoles={["TRANSPORT_SPECIALIST"]}>
                <AuthorityReviewPage />
              </ProtectedRoute>
            ),
          },
          {
            path: "/customs-clearance-proofs/:proofId/verify",
            element: <CustomsClearanceReviewPage />,
          },
        ],
      },
    ],
  },
  ...(import.meta.env.DEV
    ? [
        // BEGIN TEMP UC-38 LOCAL PREVIEW — remove only this route object after testing.
        {
          path: "/__dev/flow3/route-plans/:routePlanId",
          element: <ProtectedRoute allowedRoles={["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"]}><AdminLayout /></ProtectedRoute>,
          children: [{ index: true, element: <Suspense fallback={<LoadingState />}>
            <DevRoutePlanDetailPage routeDetailPath={(id: string) => `/__dev/flow3/route-plans/${encodeURIComponent(id)}`} />
          </Suspense> }],
        },
        // END TEMP UC-38 LOCAL PREVIEW
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
