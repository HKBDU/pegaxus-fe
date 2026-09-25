import type { AuthPrincipal, Permission, Role } from '@/features/auth/types'

export interface AccessPolicy {
  anyRole?: Role[]
  allRoles?: Role[]
  anyPermission?: Permission[]
  allPermissions?: Permission[]
}

function normalizeRole(role: Role) {
  return role.trim().toUpperCase().replace(/^ROLE_/, "")
}

export function canAccess(principal: AuthPrincipal | null, policy?: AccessPolicy) {
  if (!principal) return false
  if (!policy) return true

  const roles = principal.roles.map(normalizeRole)
  if (policy.anyRole && !policy.anyRole.some((role) => roles.includes(normalizeRole(role)))) return false
  if (policy.allRoles && !policy.allRoles.every((role) => roles.includes(normalizeRole(role)))) return false
  if (
    policy.anyPermission &&
    !policy.anyPermission.some((permission) => principal.permissions.includes(permission))
  ) {
    return false
  }
  if (
    policy.allPermissions &&
    !policy.allPermissions.every((permission) => principal.permissions.includes(permission))
  ) {
    return false
  }

  return true
}
