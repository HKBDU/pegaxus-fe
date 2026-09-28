import type { AccessPolicy } from "@/features/auth/access-control"
import { normalizeRole } from "@/features/auth/access-control"
import { matchPath } from "react-router-dom"

export const ROLE_ROUTES = {
  home: "/",
  managerHome: "/admin",
  managerUsers: "/admin/users",
  managerCreateUser: "/admin/users/new",
  customerHorses: "/my-horses",
  customerProfile: "/profile-settings",
  managerCustomerProfile: "/customers/:customerId/profile",
  managerHorseDetail: "/horses/:horseId",
} as const

export const accountDetail = (id: string | number) => `${ROLE_ROUTES.managerUsers}/${encodeURIComponent(id)}`
export const accountEdit = (id: string | number) => `${accountDetail(id)}/edit`

export function getPostLoginPath(role: string, requestedPath = ROLE_ROUTES.home as string) {
  const safePath = requestedPath.startsWith("/") && !requestedPath.startsWith("//") && !/^\/logout\/?$/i.test(requestedPath) ? requestedPath : ROLE_ROUTES.home
  if (normalizeRole(role) === "LOGISTICS_MANAGER") {
    return /^\/admin(?:\/|$)/.test(safePath) ? safePath : ROLE_ROUTES.managerHome
  }
  return safePath
}

const adminHeaderRoutes = [
  { path: ROLE_ROUTES.managerCreateUser, label: "USERS", href: ROLE_ROUTES.managerUsers, title: "CREATE EMPLOYEE ACCOUNT" },
  { path: "/admin/users/:employeeId/edit", label: "USERS", href: ROLE_ROUTES.managerUsers, title: "EDIT EMPLOYEE ACCOUNT" },
  { path: "/admin/users/:employeeId", label: "USERS", href: ROLE_ROUTES.managerUsers, title: "VIEW EMPLOYEE ACCOUNT" },
  { path: "/admin/users", label: "USERS", href: ROLE_ROUTES.managerUsers, title: "MANAGE EMPLOYEE ACCOUNTS" },
  { path: "/admin/transport-requests/:bookingId", label: "TRANSPORT REQUESTS", href: "/admin/transport-requests", title: "BOOKING DETAILS" },
  { path: "/admin/transport-requests", label: "TRANSPORT REQUESTS", href: "/admin/transport-requests", title: "" },
  ...["profile", "staff", "transport-plans", "transport-partners", "reports", "settings"].map((name) => ({ path: `/admin/${name}`, label: name.replaceAll("-", " ").toUpperCase(), href: `/admin/${name}`, title: "" })),
]

export function getAdminHeaderContext(pathname: string) {
  return adminHeaderRoutes.find(({ path }) => matchPath({ path, end: true }, pathname)) ?? { label: "MANAGER", href: ROLE_ROUTES.managerHome, title: "" }
}

export const CUSTOMER_ONLY: AccessPolicy = { anyRole: ["CUSTOMER"] }
export const LOGISTICS_MANAGER_READ: AccessPolicy = { anyRole: ["LOGISTICS_MANAGER"] }
export const PROFILE_ROLES: AccessPolicy = { anyRole: ["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_ROUTE_COORDINATOR", "DRIVER", "ESCORT"] }
