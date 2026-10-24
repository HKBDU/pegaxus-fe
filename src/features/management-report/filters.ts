import { reportFiltersSchema, type ReportFilters } from "./schemas";

export const reportPath = "/admin/reports/on-time-delivery";
export const filterKeys = [
  "dateFrom",
  "dateTo",
  "originCountry",
  "destinationCountry",
  "routeId",
  "transportProviderId",
  "driverEmployeeId",
  "trendBy",
  "bucket",
  "sortBy",
  "pageIndex",
  "pageSize",
] as const;

export function defaultFilters(now = new Date()): ReportFilters {
  const year = now.getUTCFullYear(),
    month = now.getUTCMonth();
  return {
    dateFrom: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    dateTo: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
    originCountry: "",
    destinationCountry: "",
    routeId: "",
    transportProviderId: "",
    driverEmployeeId: "",
    trendBy: "WEEK",
    bucket: "",
    sortBy: "delayMinutes:desc",
    pageIndex: 1,
    pageSize: 20,
  };
}

export function readFilters(params: URLSearchParams) {
  const defaults = defaultFilters();
  const explicitDates = params.has("dateFrom") || params.has("dateTo");
  const raw = Object.fromEntries(
    filterKeys.map((key) => [
      key,
      params.get(key) ??
        (explicitDates && (key === "dateFrom" || key === "dateTo")
          ? ""
          : defaults[key]),
    ]),
  );
  for (const key of ["pageIndex", "pageSize"])
    raw[key] = /^\d+$/.test(String(raw[key])) ? Number(raw[key]) : NaN;
  return { raw, parsed: reportFiltersSchema.safeParse(raw) };
}

export function writeFilters(current: URLSearchParams, filters: ReportFilters) {
  const next = new URLSearchParams(current);
  for (const key of filterKeys) {
    const value = filters[key];
    if (value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}

export function reportParams(
  filters: ReportFilters,
  exportFormat?: "xlsx" | "pdf",
) {
  const parsed = reportFiltersSchema.parse(filters);
  const params: Record<string, string | number> = {};
  for (const key of filterKeys) {
    if (exportFormat && (key === "pageIndex" || key === "pageSize")) continue;
    if (parsed[key] !== "") params[key] = parsed[key];
  }
  if (exportFormat) params.format = exportFormat;
  return params;
}

export function cohortKey(filters: ReportFilters) {
  const {
    pageIndex: _page,
    pageSize: _size,
    sortBy: _sort,
    bucket: _bucket,
    ...cohort
  } = filters;
  return JSON.stringify(cohort);
}
