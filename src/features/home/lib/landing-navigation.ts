import { getPostLoginPath, ROLE_ROUTES } from "@/app/route-config";
import { normalizeRole } from "@/features/auth/access-control";

export const LANDING_NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "journey", label: "Journey" },
  { id: "compliance", label: "Compliance" },
  { id: "platform", label: "Platform" },
  { id: "about", label: "About" },
] as const;

export const HORSE_CHAPTERS = [
  "home",
  "journey",
  "compliance",
  "platform",
  "care",
  "movement",
  "about",
] as const;
export type LandingChapter = (typeof HORSE_CHAPTERS)[number];

export function getTransportCta(
  authenticated: boolean,
  roles: readonly string[],
  accountRole?: string,
) {
  if (!authenticated) return { to: "/bookings/new", label: "Plan a transport" };
  const normalized = roles.map(normalizeRole);
  // Login resolves the account's role, not an invented priority across roles.
  const role =
    accountRole && normalized.includes(normalizeRole(accountRole))
      ? normalizeRole(accountRole)
      : normalized.length === 1
        ? normalized[0]
        : undefined;
  if (!role) return null;
  if (role === "CUSTOMER")
    return { to: "/bookings/new", label: "Book a transport" };
  const to = getPostLoginPath(role);
  if (to !== ROLE_ROUTES.home) return { to, label: "My workspace" };
  return null;
}
