import type { AccessPolicy } from "@/features/auth/access-control"
import { normalizeRole } from "@/features/auth/access-control"
import { matchPath } from "react-router-dom"

export const ROLE_ROUTES = {
  home: "/",
  managerHome: "/admin",
  approvedBookings: "/admin/approved-bookings",
  transportPlans: "/admin/transport-plans",
  managerUsers: "/admin/users",
  managerCreateUser: "/admin/users/new",
  customerHorses: "/my-horses",
  customerProfile: "/profile-settings",
  complianceRequirements: "/compliance-requirements",
  dossierTemplates: "/dossier-templates",
  complianceDossiers: "/compliance-dossiers",
  managerDossiers: "/admin/compliance-dossiers",
  vehicles: "/vehicles",
  transportProviders: "/transport-providers",
  routePlans: "/admin/route-plans",
  mapAssets: "/admin/map-assets",
  personnelAssignment: "/admin/personnel-assignment",
  invoices: "/admin/invoices",
  notifications: "/notifications",
} as const

export const routePlanDetail = (routePlanId: string) => `${ROLE_ROUTES.routePlans}/${encodeURIComponent(routePlanId)}`
export const routePlanCreate = (transportPlanId: string) => `${ROLE_ROUTES.routePlans}/new/${encodeURIComponent(transportPlanId)}`
export const routePlanEdit = (routePlanId: string) => `${ROLE_ROUTES.routePlans}/${encodeURIComponent(routePlanId)}/edit`
export const contingencyRouteCreate = (transportPlanId: string) => `${ROLE_ROUTES.routePlans}/new/${encodeURIComponent(transportPlanId)}/contingency`
export const returnRouteCreate = (transportPlanId: string) => `${ROLE_ROUTES.routePlans}/new/${encodeURIComponent(transportPlanId)}/return`

export const invoiceDetail = (invoiceId: string) => `${ROLE_ROUTES.invoices}/${encodeURIComponent(invoiceId)}`
export const invoiceEdit = (invoiceId: string) => `${invoiceDetail(invoiceId)}/edit`
export const invoiceCreate = (bookingId: string) => `${ROLE_ROUTES.invoices}/new/${encodeURIComponent(bookingId)}`

export const personnelAssignmentPath = (transportPlanId: string) => `${ROLE_ROUTES.personnelAssignment}/${encodeURIComponent(transportPlanId)}`

export const accountDetail = (id: string | number) => `${ROLE_ROUTES.managerUsers}/${encodeURIComponent(id)}`
export const approvedBookingDetail = (id: string | number) => `${ROLE_ROUTES.approvedBookings}/${encodeURIComponent(id)}`
export const transportPlanDetail = (id: string | number) => `${ROLE_ROUTES.transportPlans}/${encodeURIComponent(id)}`
export const accountEdit = (id: string | number) => `${accountDetail(id)}/edit`
export function dossierDetail(id: string | number, role?: string) {
  const encodedId = encodeURIComponent(id)
  if (role && normalizeRole(role) === "LOGISTICS_MANAGER") return `${ROLE_ROUTES.managerDossiers}/${encodedId}`
  if (role && normalizeRole(role) === "TRANSPORT_SPECIALIST") return `${ROLE_ROUTES.complianceDossiers}/${encodedId}/details`
  return `${ROLE_ROUTES.complianceDossiers}/${encodedId}`
}

export function getPostLoginPath(role: string, requestedPath = ROLE_ROUTES.home as string) {
  const safePath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") && !/^\/logout\/?$/i.test(requestedPath) ? requestedPath : ROLE_ROUTES.home
  if (normalizeRole(role) === "LOGISTICS_MANAGER") {
    return /^\/admin(?:\/|$)/.test(safePath) ? safePath : ROLE_ROUTES.managerHome
  }
  if (normalizeRole(role) === "TRANSPORT_SPECIALIST" && safePath === ROLE_ROUTES.home) {
    return ROLE_ROUTES.complianceRequirements
  }
  if (normalizeRole(role) === "FLEET_ROUTE_COORDINATOR" && safePath === ROLE_ROUTES.home) {
    return ROLE_ROUTES.vehicles
  }
  return safePath
}

const adminHeaderRoutes = [
  { path: `${ROLE_ROUTES.vehicles}/new`, label: "VEHICLES", href: ROLE_ROUTES.vehicles, title: "ADD NEW VEHICLE" },
  { path: `${ROLE_ROUTES.vehicles}/:vehicleId/edit`, label: "VEHICLES", href: ROLE_ROUTES.vehicles, title: "EDIT VEHICLE" },
  { path: `${ROLE_ROUTES.vehicles}/:vehicleId`, label: "VEHICLES", href: ROLE_ROUTES.vehicles, title: "VEHICLE DETAILS" },
  { path: `${ROLE_ROUTES.transportProviders}/:providerId/edit`, label: "TRANSPORT PROVIDERS", href: ROLE_ROUTES.transportProviders, title: "EDIT PROVIDER" },
  { path: `${ROLE_ROUTES.transportProviders}/:providerId`, label: "TRANSPORT PROVIDERS", href: ROLE_ROUTES.transportProviders, title: "PROVIDER DETAILS" },
  { path: ROLE_ROUTES.vehicles, label: "VEHICLES", href: ROLE_ROUTES.vehicles, title: "" },
  { path: ROLE_ROUTES.transportProviders, label: "TRANSPORT PROVIDERS", href: ROLE_ROUTES.transportProviders, title: "" },
  { path: `${ROLE_ROUTES.transportPlans}/:transportPlanId`, label: "TRANSPORT PLANS", href: ROLE_ROUTES.transportPlans, title: "TRANSPORT PLAN DETAILS" },
  { path: ROLE_ROUTES.transportPlans, label: "TRANSPORT PLANS", href: ROLE_ROUTES.transportPlans, title: "" },
  { path: `${ROLE_ROUTES.approvedBookings}/:bookingId`, label: "APPROVED BOOKINGS", href: ROLE_ROUTES.approvedBookings, title: "APPROVED BOOKING DETAILS" },
  { path: ROLE_ROUTES.approvedBookings, label: "APPROVED BOOKINGS", href: ROLE_ROUTES.approvedBookings, title: "" },
  { path: "/admin/ongoing-transports/:transportId/handovers/new", label: "HANDOVER RECORDS", href: "/admin/ongoing-transports", title: "START HANDOVER" },
  { path: "/admin/ongoing-transports/:transportId/handovers/:handoverId", label: "HANDOVER RECORDS", href: "/admin/ongoing-transports", title: "HANDOVER RECORD" },
  { path: "/admin/ongoing-transports/:transportId/handovers", label: "HANDOVER RECORDS", href: "/admin/ongoing-transports", title: "" },
  { path: `${ROLE_ROUTES.managerDossiers}/:dossierId`, label: "DOSSIER TRACKING", href: ROLE_ROUTES.complianceDossiers, title: "COMPLIANCE DOSSIER" },
  { path: `${ROLE_ROUTES.complianceDossiers}/:dossierId/details`, label: "DOSSIER TRACKING", href: ROLE_ROUTES.complianceDossiers, title: "COMPLIANCE DOSSIER" },
  { path: ROLE_ROUTES.managerCreateUser, label: "USERS", href: ROLE_ROUTES.managerUsers, title: "CREATE EMPLOYEE ACCOUNT" },
  { path: "/admin/users/:employeeId/edit", label: "USERS", href: ROLE_ROUTES.managerUsers, title: "EDIT EMPLOYEE ACCOUNT" },
  { path: "/admin/users/:employeeId", label: "USERS", href: ROLE_ROUTES.managerUsers, title: "VIEW EMPLOYEE ACCOUNT" },
  { path: "/admin/users", label: "USERS", href: ROLE_ROUTES.managerUsers, title: "MANAGE EMPLOYEE ACCOUNTS" },
  { path: "/admin/transport-requests/:bookingId", label: "TRANSPORT REQUESTS", href: "/admin/transport-requests", title: "BOOKING DETAILS" },
  { path: "/admin/transport-requests", label: "TRANSPORT REQUESTS", href: "/admin/transport-requests", title: "" },
  { path: `${ROLE_ROUTES.complianceRequirements}/new`, label: "COMPLIANCE REQUIREMENTS", href: ROLE_ROUTES.complianceRequirements, title: "CREATE REQUIREMENT" },
  { path: `${ROLE_ROUTES.complianceRequirements}/:complianceRequirementId/edit`, label: "COMPLIANCE REQUIREMENTS", href: ROLE_ROUTES.complianceRequirements, title: "EDIT REQUIREMENT" },
  { path: ROLE_ROUTES.complianceRequirements, label: "COMPLIANCE REQUIREMENTS", href: ROLE_ROUTES.complianceRequirements, title: "" },
  { path: `${ROLE_ROUTES.dossierTemplates}/new`, label: "DOSSIER TEMPLATES", href: ROLE_ROUTES.dossierTemplates, title: "CREATE TEMPLATE" },
  { path: `${ROLE_ROUTES.dossierTemplates}/:dossierTemplateId/edit`, label: "DOSSIER TEMPLATES", href: ROLE_ROUTES.dossierTemplates, title: "EDIT TEMPLATE" },
  { path: ROLE_ROUTES.dossierTemplates, label: "DOSSIER TEMPLATES", href: ROLE_ROUTES.dossierTemplates, title: "" },
  { path: `${ROLE_ROUTES.complianceDossiers}/new/:bookingId`, label: "DOSSIER TEMPLATES", href: ROLE_ROUTES.dossierTemplates, title: "APPLY TEMPLATE" },
  { path: `${ROLE_ROUTES.complianceDossiers}/:dossierId/audit-history`, label: "DOSSIER TRACKING", href: ROLE_ROUTES.complianceDossiers, title: "AUDIT HISTORY" },
  { path: `${ROLE_ROUTES.complianceDossiers}/:dossierId/requirements`, label: "DOSSIER TRACKING", href: ROLE_ROUTES.complianceDossiers, title: "REQUIREMENTS" },
  { path: ROLE_ROUTES.complianceDossiers, label: "DOSSIER TRACKING", href: ROLE_ROUTES.complianceDossiers, title: "" },
  { path: ROLE_ROUTES.notifications, label: "NOTIFICATIONS", href: ROLE_ROUTES.notifications, title: "" },
  { path: `${ROLE_ROUTES.invoices}/new/:bookingId`, label: "INVOICES", href: ROLE_ROUTES.invoices, title: "CREATE INVOICE" },
  { path: `${ROLE_ROUTES.invoices}/:invoiceId/edit`, label: "INVOICES", href: ROLE_ROUTES.invoices, title: "EDIT INVOICE" },
  { path: `${ROLE_ROUTES.invoices}/:invoiceId`, label: "INVOICES", href: ROLE_ROUTES.invoices, title: "INVOICE DETAILS" },
  { path: ROLE_ROUTES.invoices, label: "INVOICES", href: ROLE_ROUTES.invoices, title: "" },
  { path: `${ROLE_ROUTES.personnelAssignment}/:transportPlanId`, label: "TRANSPORT PLANS", href: "/admin/transport-plans", title: "PERSONNEL ASSIGNMENT" },
  ...["profile", "staff", "transport-plans", "reports", "settings"].map((name) => ({ path: `/admin/${name}`, label: name.replaceAll("-", " ").toUpperCase(), href: `/admin/${name}`, title: "" })),
]

export function getAdminHeaderContext(pathname: string) {
  return adminHeaderRoutes.find(({ path }) => matchPath({ path, end: true }, pathname)) ?? { label: "MANAGER", href: ROLE_ROUTES.managerHome, title: "" }
}

export const CUSTOMER_ONLY: AccessPolicy = { anyRole: ["CUSTOMER"] }
export const APPROVED_BOOKINGS_ACCESS: AccessPolicy = { anyRole: ["FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"] }
export const TRANSPORT_PLANS_ACCESS: AccessPolicy = { anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"] }
export const LOGISTICS_MANAGER_READ: AccessPolicy = { anyRole: ["LOGISTICS_MANAGER"] }
export const PROFILE_ROLES: AccessPolicy = { anyRole: ["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_ROUTE_COORDINATOR", "DRIVER", "ESCORT"] }
