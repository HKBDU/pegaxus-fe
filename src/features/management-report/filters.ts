import {
  reportFiltersSchema,
  incidentFiltersSchema,
  transitFiltersSchema,
  type TransitFilters,
  type IncidentFilters,
  type ReportFilters,
} from "./schemas";

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
  const raw = readFilterValues(params, defaultFilters(), filterKeys);
  return { raw, parsed: reportFiltersSchema.safeParse(raw) };
}
function readFilterValues(
  params: URLSearchParams,
  defaults: Record<string, string | number>,
  keys: readonly string[],
) {
  const explicitDates = params.has("dateFrom") || params.has("dateTo");
  const raw = Object.fromEntries(
    keys.map((key) => [
      key,
      params.get(key) ??
        (explicitDates && (key === "dateFrom" || key === "dateTo")
          ? ""
          : defaults[key]),
    ]),
  );
  for (const key of ["pageIndex", "pageSize"])
    raw[key] = /^\d+$/.test(String(raw[key])) ? Number(raw[key]) : NaN;
  return raw;
}

export function writeFilters(current: URLSearchParams, filters: ReportFilters) {
  return writeFilterValues(current, filters, filterKeys);
}
function writeFilterValues(
  current: URLSearchParams,
  filters: Record<string, string | number>,
  keys: readonly string[],
) {
  const next = new URLSearchParams(current);
  for (const key of keys) {
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
  return serializeReportParams(parsed, filterKeys, exportFormat);
}
function serializeReportParams(
  parsed: Record<string, string | number>,
  keys: readonly string[],
  exportFormat?: "xlsx" | "pdf",
) {
  const params: Record<string, string | number> = {};
  for (const key of keys) {
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

export const incidentFilterKeys = [
  "dateFrom",
  "dateTo",
  "originCountry",
  "destinationCountry",
  "routeId",
  "transportProviderId",
  "incidentCategory",
  "severity",
  "vehicleId",
  "horseId",
  "claimType",
  "sortBy",
  "pageIndex",
  "pageSize",
] as const;
export function defaultIncidentFilters(now = new Date()): IncidentFilters {
  const {
    dateFrom,
    dateTo,
    originCountry,
    destinationCountry,
    routeId,
    transportProviderId,
    pageIndex,
    pageSize,
  } = defaultFilters(now);
  return {
    dateFrom,
    dateTo,
    originCountry,
    destinationCountry,
    routeId,
    transportProviderId,
    pageIndex,
    pageSize,
    incidentCategory: "",
    severity: "",
    vehicleId: "",
    horseId: "",
    claimType: "",
    sortBy: "occurredAt:desc",
  };
}
export function readIncidentFilters(params: URLSearchParams) {
  const raw = readFilterValues(
    params,
    defaultIncidentFilters(),
    incidentFilterKeys,
  );
  return { raw, parsed: incidentFiltersSchema.safeParse(raw) };
}
export function writeIncidentFilters(
  current: URLSearchParams,
  filters: IncidentFilters,
) {
  return writeFilterValues(current, filters, incidentFilterKeys);
}
export function incidentReportParams(
  filters: IncidentFilters,
  exportFormat?: "xlsx" | "pdf",
) {
  return serializeReportParams(
    incidentFiltersSchema.parse(filters),
    incidentFilterKeys,
    exportFormat,
  );
}
export function incidentCohortKey(filters: IncidentFilters) {
  const {
    pageIndex: _page,
    pageSize: _size,
    sortBy: _sort,
    ...cohort
  } = filters;
  return JSON.stringify(cohort);
}

export const transitFilterKeys = [
  "dateFrom",
  "dateTo",
  "originCountry",
  "destinationCountry",
  "routeId",
  "transportProviderId",
  "delayFilter",
  "sortBy",
  "pageIndex",
  "pageSize",
] as const;
export function defaultTransitFilters(now = new Date()): TransitFilters {
  const shared = defaultFilters(now);
  return {
    dateFrom: shared.dateFrom,
    dateTo: shared.dateTo,
    originCountry: shared.originCountry,
    destinationCountry: shared.destinationCountry,
    routeId: shared.routeId,
    transportProviderId: shared.transportProviderId,
    pageIndex: shared.pageIndex,
    pageSize: shared.pageSize,
    delayFilter: "",
    sortBy: "deltaDays:desc",
  };
}
export function readTransitFilters(params: URLSearchParams) {
  const raw = readFilterValues(
    params,
    defaultTransitFilters(),
    transitFilterKeys,
  );
  return { raw, parsed: transitFiltersSchema.safeParse(raw) };
}
export function writeTransitFilters(
  current: URLSearchParams,
  filters: TransitFilters,
) {
  return writeFilterValues(current, filters, transitFilterKeys);
}
export function transitReportParams(
  filters: TransitFilters,
  exportFormat?: "xlsx" | "pdf",
) {
  return serializeReportParams(
    transitFiltersSchema.parse(filters),
    transitFilterKeys,
    exportFormat,
  );
}
export function transitCohortKey(filters: TransitFilters) {
  const {
    pageIndex: _page,
    pageSize: _size,
    sortBy: _sort,
    delayFilter: _delay,
    ...cohort
  } = filters;
  return JSON.stringify(cohort);
}
