import {
  reportFiltersSchema,
  type OnTimeReport,
  type ReportFilters,
} from "../schemas";
import {
  average,
  countMetric,
  day,
  demoIncidents,
  demoProviders,
  demoTransports,
  generatedAt,
  groupCount,
  inPeriod,
  matchesTransport,
  metric,
  pageRows,
  percent,
  reportPeriod,
  type DemoTransport,
} from "./data";

type Measured = DemoTransport & { plannedEnd: string; arrival: string };
function cause(
  row: DemoTransport,
): NonNullable<OnTimeReport["items"][number]["mainCause"]> {
  const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  const incident = demoIncidents
    .filter(
      (event) =>
        event.transport?.transportId === row.transportId &&
        event.status !== "CANCELLED",
    )
    .sort(
      (a, b) =>
        rank[b.severity] - rank[a.severity] ||
        a.occurredAt.localeCompare(b.occurredAt),
    )[0];
  return !incident
    ? "UNKNOWN"
    : incident.category === "VEHICLE" || incident.category === "BOTH"
      ? "VEHICLE_INCIDENT"
      : incident.category === "HORSE_HEALTH"
        ? "HORSE_HEALTH_INCIDENT"
        : "ROUTE_CHANGE";
}
function weekLabel(start: number) {
  const date = new Date(start);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  return `${date.getUTCFullYear()}-W${String(Math.ceil(((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / day + 1) / 7)).padStart(2, "0")}`;
}
export function getOnTimeDemo(input: ReportFilters): OnTimeReport {
  const filters = reportFiltersSchema.parse(input);
  const period = reportPeriod(filters);
  function measure(from: string, to: string) {
    const all = demoTransports.filter(
      (row) =>
        matchesTransport(row, filters) && inPeriod(row.completedAt, from, to),
    );
    const rows = all.filter(
      (row): row is Measured => row.plannedEnd !== null && row.arrival !== null,
    );
    const reasons = {
      MISSING_PLANNED_END: all.filter((row) => row.plannedEnd === null).length,
      MISSING_ACTUAL_ARRIVAL: all.filter(
        (row) => row.plannedEnd !== null && row.arrival === null,
      ).length,
    };
    return { rows, excluded: { count: all.length - rows.length, reasons } };
  }
  const current = measure(period.dateFrom, period.dateTo);
  const previous = measure(period.previousDateFrom, period.previousDateTo);
  const rate = (rows: Measured[]) =>
    percent(rows.filter((row) => row.bucket === "ON_TIME").length, rows.length);
  const currentRate = rate(current.rows);
  const trend: OnTimeReport["trend"] = [];
  let cursor = Date.parse(filters.dateFrom + "T00:00:00Z");
  if (filters.trendBy === "MONTH") {
    const date = new Date(cursor);
    cursor = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  } else cursor -= ((new Date(cursor).getUTCDay() + 6) % 7) * day;
  const until = Date.parse(filters.dateTo + "T00:00:00Z");
  while (cursor <= until) {
    const date = new Date(cursor);
    const end =
      filters.trendBy === "MONTH"
        ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) - day
        : cursor + 6 * day;
    const from = new Date(cursor).toISOString().slice(0, 10),
      to = new Date(end).toISOString().slice(0, 10);
    const inside = current.rows.filter((row) =>
      inPeriod(row.completedAt, from, to),
    );
    trend.push({
      label: filters.trendBy === "MONTH" ? from.slice(0, 7) : weekLabel(cursor),
      from,
      to,
      total: inside.length,
      onTimeRate: rate(inside),
    });
    cursor = end + day;
  }
  const late = current.rows.filter((row) => row.bucket !== "ON_TIME");
  const shown = current.rows.filter((row) =>
    filters.bucket ? row.bucket === filters.bucket : row.bucket !== "ON_TIME",
  );
  const descending = filters.sortBy.endsWith(":desc");
  shown.sort((a, b) => {
    const difference = filters.sortBy.startsWith("completedAt")
      ? Date.parse(a.completedAt) - Date.parse(b.completedAt)
      : a.delayMinutes - b.delayMinutes;
    return (
      (descending ? -difference : difference) ||
      a.transportId.localeCompare(b.transportId)
    );
  });
  const items = shown.map((row) => ({
    transportId: row.transportId,
    transportCode: row.transportCode,
    bookingCode: row.bookingCode,
    originCountry: row.originCountry,
    destinationCountry: row.destinationCountry,
    plannedEndAt: row.plannedEnd,
    actualArrivalAt: row.arrival,
    delayMinutes: row.delayMinutes,
    bucket: row.bucket,
    mainCause: row.bucket === "ON_TIME" ? null : cause(row),
  }));
  const providerIds = [...new Set(current.rows.map((row) => row.providerId))];
  return {
    period,
    generatedAt,
    kpi: {
      totalTransports: countMetric(
        current.rows.length,
        previous.rows.length,
        previous.rows.length + previous.excluded.count > 0,
      ),
      onTimeRate: metric(currentRate, rate(previous.rows)),
      avgDelayMinutes: metric(
        average(current.rows.map((row) => row.delayMinutes)),
        average(previous.rows.map((row) => row.delayMinutes)),
      ),
      slaTargetRate: 92,
      meetsSla: currentRate !== null && currentRate >= 92,
    },
    distribution: {
      ON_TIME: current.rows.filter((row) => row.bucket === "ON_TIME").length,
      MINOR_DELAY: current.rows.filter((row) => row.bucket === "MINOR_DELAY")
        .length,
      MAJOR_DELAY: current.rows.filter((row) => row.bucket === "MAJOR_DELAY")
        .length,
    },
    trend,
    byProvider: providerIds
      .map((id) => {
        const rows = current.rows.filter((row) => row.providerId === id);
        return {
          transportProviderId: id,
          providerName:
            id === null
              ? "Internal fleet"
              : (demoProviders.find((item) => item.transportProviderId === id)
                  ?.providerName ?? "Demo provider"),
          total: rows.length,
          onTimeRate: rate(rows),
        };
      })
      .sort(
        (a, b) =>
          Number(a.transportProviderId === null) -
            Number(b.transportProviderId === null) ||
          b.total - a.total ||
          a.providerName.localeCompare(b.providerName),
      ),
    delayCauses: groupCount(late, cause)
      .map((item) => ({ cause: item.key, count: item.count }))
      .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause)),
    excluded: current.excluded,
    ...pageRows(items, filters),
  };
}
