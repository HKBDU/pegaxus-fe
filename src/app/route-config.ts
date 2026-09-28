import type { AccessPolicy } from "@/features/auth/access-control"

export const ROLE_ROUTES = {
  home: "/",
  customerHorses: "/my-horses",
  customerProfile: "/profile-settings",
} as const

export const CUSTOMER_ONLY: AccessPolicy = { anyRole: ["CUSTOMER"] }
export const LOGISTICS_MANAGER_READ: AccessPolicy = { anyRole: ["LOGISTICS_MANAGER"] }
export const PROFILE_ROLES: AccessPolicy = { anyRole: ["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_ROUTE_COORDINATOR", "DRIVER", "ESCORT"] }
