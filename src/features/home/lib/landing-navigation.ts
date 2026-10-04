import { ROLE_ROUTES } from "@/app/route-config";

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
) {
  if (!authenticated || roles.includes("CUSTOMER"))
    return { to: "/bookings/new", label: "Plan a transport" };
  if (roles.includes("LOGISTICS_MANAGER"))
    return { to: ROLE_ROUTES.managerHome, label: "Open workspace" };
  // No confirmed public transport-planning destination for other employee roles.
  return null;
}
