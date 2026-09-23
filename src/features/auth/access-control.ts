import type { AuthPrincipal, Permission, Role } from '@/features/auth/types'

export interface AccessPolicy {
  anyRole?: Role[]
  allRoles?: Role[]
  anyPermission?: Permission[]
  allPermissions?: Permission[]
}

export function canAccess(principal: AuthPrincipal | null, policy?: AccessPolicy) {
  if (!principal) return false
  if (!policy) return true

  if (policy.anyRole && !policy.anyRole.some((role) => principal.roles.includes(role))) return false
  if (policy.allRoles && !policy.allRoles.every((role) => principal.roles.includes(role))) return false
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
