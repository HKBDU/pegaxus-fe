import type { OnTimeReport } from "./schemas";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const reportLabel = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());
const vnd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
export const reportMoney = (value: number | null) =>
  value === null ? "—" : vnd.format(value);
export const reportNumber = (value: number | null) =>
  value === null ? "—" : number.format(value);
export const reportRate = (value: number | null) =>
  value === null ? "—" : `${reportNumber(value)}%`;
export const signedNumber = (value: number | null) =>
  value === null ? "—" : `${value > 0 ? "+" : ""}${reportNumber(value)}`;
export function reportTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date) + " UTC"
    : "—";
}
export const bucketLabels = {
  ON_TIME: "On time",
  MINOR_DELAY: "Minor delay",
  MAJOR_DELAY: "Major delay",
};
export const causeLabels = {
  VEHICLE_INCIDENT: "Vehicle incident",
  HORSE_HEALTH_INCIDENT: "Horse health",
  ROUTE_CHANGE: "Route change",
  UNKNOWN: "Unknown",
};
export function reportMeta(
  report: Pick<
    OnTimeReport,
    "pageIndex" | "pageSize" | "totalItems" | "totalPages"
  >,
) {
  return {
    currentPage: report.pageIndex,
    itemsPerPage: report.pageSize,
    totalItems: report.totalItems,
    totalPages: report.totalPages,
    hasPreviousPage: report.pageIndex > 1,
    hasNextPage: report.pageIndex < report.totalPages,
  };
}
