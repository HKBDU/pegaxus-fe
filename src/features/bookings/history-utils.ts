import type { BookingHistoryItem } from "./schemas/booking-history.schema";

export type HistoryOrder = "newest" | "oldest";
export interface HistoryFilters {
  action: string;
  fromStatus: string;
  toStatus: string;
  order: HistoryOrder;
}

export const initialHistoryFilters: HistoryFilters = {
  action: "",
  fromStatus: "",
  toStatus: "",
  order: "newest",
};

export function formatHistoryLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const utcFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatHistoryTimestamp(value: string) {
  const parts = utcFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("day")} ${part("month")}, ${part("year")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export function filterAndSortHistory(
  data: BookingHistoryItem[],
  filters: HistoryFilters,
) {
  return data
    .filter(
      (item) =>
        (!filters.action || item.action === filters.action) &&
        (!filters.fromStatus || item.previousStatus === filters.fromStatus) &&
        (!filters.toStatus || item.newStatus === filters.toStatus),
    )
    .sort((a, b) => {
      const difference = Date.parse(a.changedAt) - Date.parse(b.changedAt);
      return (
        (filters.order === "oldest" ? 1 : -1) *
        (difference || a.historyId - b.historyId)
      );
    });
}

export function historyToCsv(rows: BookingHistoryItem[]) {
  const escape = (value: string) => {
    const safe = /^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(value)
      ? `'${value}`
      : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const values = [
    [
      "Action",
      "From Status",
      "To Status",
      "Audit Note",
      "Changed By",
      "Role",
      "Timestamp UTC",
    ],
    ...rows.map((row) => [
      row.action,
      row.previousStatus ?? "",
      row.newStatus,
      row.reason ?? "",
      row.changedBy.fullName,
      row.changedBy.role,
      formatHistoryTimestamp(row.changedAt),
    ]),
  ];
  return "\uFEFF" + values.map((row) => row.map(escape).join(",")).join("\r\n");
}
