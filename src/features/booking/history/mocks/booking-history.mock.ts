import { bookingHistoryListSchema } from "../schema";
import type { BookingHistoryMockScenario } from "../source";
export const bookingHistoryMock = bookingHistoryListSchema.parse([
  {
    historyId: "00000000-0000-4000-8000-000000005001", action: "CREATED", previousStatus: null, newStatus: "DRAFT", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-10T08:30:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005002", action: "UPDATED", previousStatus: "DRAFT", newStatus: "DRAFT", reason: "Added veterinary documents for Silver Arrow.",
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-11T09:15:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005003", action: "SUBMITTED", previousStatus: "DRAFT", newStatus: "PENDING", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-12T11:30:15Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005004", action: "UPDATED", previousStatus: "PENDING", newStatus: "PENDING", reason: "Updated the airport arrival window.",
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-12T13:15:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005005", action: "CANCELLED", previousStatus: "PENDING", newStatus: "CANCELLED", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-13T10:00:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005006", action: "SUBMITTED", previousStatus: "CANCELLED", newStatus: "PENDING", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-14T08:45:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005007", action: "REJECTED", previousStatus: "PENDING", newStatus: "REJECTED",
    reason: "Quarantine clearance is incomplete. The horse's microchip number does not match the supporting veterinary certificate and must be corrected before transport can be approved.",
    changedBy: { accountId: "00000000-0000-4000-8000-000000000402", fullName: "David O'Connor", role: "LOGISTICS_MANAGER" },
    changedAt: "2026-09-15T09:12:44Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005008", action: "UPDATED", previousStatus: "REJECTED", newStatus: "REJECTED", reason: "Uploaded corrected veterinary certificate.",
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-15T14:20:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005009", action: "SUBMITTED", previousStatus: "REJECTED", newStatus: "PENDING", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000501", fullName: "Khang Nguyen", role: "CUSTOMER" },
    changedAt: "2026-09-16T10:45:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005010", action: "UNDER_REVIEW", previousStatus: "PENDING", newStatus: "UNDER_REVIEW", reason: "Customs papers are under review.",
    changedBy: { accountId: "00000000-0000-4000-8000-000000000402", fullName: "David O'Connor", role: "LOGISTICS_MANAGER" },
    changedAt: "2026-09-16T13:00:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005011", action: "UPDATED", previousStatus: "UNDER_REVIEW", newStatus: "UNDER_REVIEW", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000402", fullName: "David O'Connor", role: "LOGISTICS_MANAGER" },
    changedAt: "2026-09-17T06:40:00Z",
  },
  {
    historyId: "00000000-0000-4000-8000-000000005012", action: "APPROVED", previousStatus: "UNDER_REVIEW", newStatus: "APPROVED", reason: null,
    changedBy: { accountId: "00000000-0000-4000-8000-000000000402", fullName: "David O'Connor", role: "LOGISTICS_MANAGER" },
    changedAt: "2026-09-17T07:00:00Z",
  },
]);

const longHistoryMock = bookingHistoryListSchema.parse(
  bookingHistoryMock.map((item) => ({
    ...item,
    reason:
      item.reason ??
      "The transport documentation requires a detailed review of veterinary certificates, customs clearance, quarantine requirements, and the revised arrival schedule before this booking can proceed.",
    changedBy: {
      ...item.changedBy,
      fullName: `${item.changedBy.fullName} — International Logistics Coordination Team`,
    },
  })),
);

export function loadMockBookingHistory(scenario: BookingHistoryMockScenario) {
  switch (scenario) {
    case "empty":
      return bookingHistoryListSchema.parse([]);
    case "long":
      return longHistoryMock;
    case "error":
      throw new Error("Simulated booking history request failure");
    default:
      return bookingHistoryMock;
  }
}
