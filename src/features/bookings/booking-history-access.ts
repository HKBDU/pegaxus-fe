export type BookingHistoryShell = "admin" | "customer";

export function bookingHistoryDetailsPath(bookingId: string, shell: BookingHistoryShell) {
  const encodedId = encodeURIComponent(bookingId);
  return shell === "admin"
    ? `/admin/transport-requests/${encodedId}`
    : `/bookings/${encodedId}`;
}

export function resolveBookingHistoryShell(roles: readonly string[] | null | undefined): BookingHistoryShell | null {
  const activeRoles = roles
    ?.map((role) => role.trim().toUpperCase().replace(/^ROLE_/, ""))
    .filter(Boolean) ?? [];
  if (activeRoles.length === 0) return null;
  return activeRoles.some((role) => role !== "CUSTOMER") ? "admin" : "customer";
}
