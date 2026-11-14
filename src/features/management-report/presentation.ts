import type { OnTimeReport } from "./schemas";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
export const reportLabel = (value: string) =>
  value === "BOTH"
    ? "Vehicle & horse health"
    : value
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/^./, (first) => first.toUpperCase());

const filterLabels: Readonly<Record<string, string>> = {
  dateFrom: "From date",
  dateTo: "To date",
  originCountry: "Origin country",
  destinationCountry: "Destination country",
  routeId: "Route",
  transportProviderId: "Provider",
  driverEmployeeId: "Driver",
  trendBy: "Trend grouping",
  bucket: "Delivery category",
  sortBy: "Sorting",
  pageIndex: "Page",
  pageSize: "Rows per page",
  incidentCategory: "Incident categories",
  severity: "Severity",
  claimType: "Claim types",
  vehicleId: "Vehicle",
  horseId: "Horse",
  delayFilter: "Duration deviation",
};
export const reportFilterLabel = (key: string) =>
  Object.hasOwn(filterLabels, key) ? filterLabels[key] : reportLabel(key);
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
/**
 * A deviation from the committed arrival in words, in the one unit that reads best:
 * "50.9 days early", "3.3 h late", "45 min late", "On schedule".
 */
export function deviationText(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "—";
  if (Math.round(minutes) === 0) return "On schedule";
  return `${durationText(Math.abs(minutes))} ${minutes < 0 ? "early" : "late"}`;
}

/** The change of a deviation between two periods: "2.1 h later", "3 min earlier", "No change". */
export function deviationChangeText(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "—";
  if (Math.round(minutes) === 0) return "No change";
  return `${durationText(Math.abs(minutes))} ${minutes < 0 ? "earlier" : "later"}`;
}

function durationText(minutes: number) {
  if (minutes >= 1440) return `${reportNumber(Math.round((minutes / 1440) * 10) / 10)} days`;
  if (minutes >= 60) return `${reportNumber(Math.round((minutes / 60) * 10) / 10)} h`;
  return `${reportNumber(Math.round(minutes))} min`;
}

export const bucketLabels = {
  EARLY: "Early",
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
