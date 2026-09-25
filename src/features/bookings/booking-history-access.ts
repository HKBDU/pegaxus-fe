export type BookingHistoryShell = "admin" | "customer";

export function resolveBookingHistoryShell(roles: readonly string[] | null | undefined): BookingHistoryShell | null {
  const activeRoles = roles?.map((role) => role.trim()).filter(Boolean) ?? [];
  if (activeRoles.length === 0) return null;
  return activeRoles.some((role) => role !== "CUSTOMER") ? "admin" : "customer";
}
