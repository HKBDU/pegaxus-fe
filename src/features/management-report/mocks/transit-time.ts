import {
  transitFiltersSchema,
  type TransitFilters,
  type TransitTimeReport,
} from "../schemas";
import {
  countMetric,
  demoTransports,
  generatedAt,
  inPeriod,
  matchesTransport,
  metric,
  pageRows,
  reportPeriod,
  round,
  type DemoTransport,
} from "./data";

type Measured = DemoTransport & {
  departure: string;
  arrival: string;
  estimatedMinutes: number;
};
export function getTransitDemo(input: TransitFilters): TransitTimeReport {
  const filters = transitFiltersSchema.parse(input);
  const period = reportPeriod(filters);
  function measure(from: string, to: string) {
    const all = demoTransports.filter(
      (row) =>
        matchesTransport(row, filters) && inPeriod(row.completedAt, from, to),
    );
    const reasons = {
      MISSING_ACTUAL_DEPARTURE: 0,
      MISSING_ACTUAL_ARRIVAL: 0,
      MISSING_ESTIMATE: 0,
    };
    const rows = all.filter((row): row is Measured => {
      if (row.departure === null) {
        reasons.MISSING_ACTUAL_DEPARTURE++;
        return false;
      }
      if (row.arrival === null) {
        reasons.MISSING_ACTUAL_ARRIVAL++;
        return false;
      }
      if (row.estimatedMinutes === null) {
        reasons.MISSING_ESTIMATE++;
        return false;
      }
      return true;
    });
    const avg = (field: "actualMinutes" | "deltaMinutes") =>
      rows.length
        ? round(
            rows.reduce((sum, row) => sum + row[field], 0) / rows.length / 1440,
          )
        : null;
    return {
      rows,
      avg,
      ratio: rows.length
        ? round(
            (rows.reduce((sum, row) => sum + row.actualMinutes, 0) /
              rows.reduce((sum, row) => sum + row.estimatedMinutes, 0)) *
              100,
          )
        : null,
      excluded: { count: all.length - rows.length, reasons },
    };
  }
  const current = measure(period.dateFrom, period.dateTo),
    previous = measure(period.previousDateFrom, period.previousDateTo);
  const groups = new Map<string, Measured[]>();
  for (const row of current.rows) {
    const key = JSON.stringify([row.originCountry, row.destinationCountry]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const routeBenchmark = Array.from(groups.values(), (rows) => ({
    originCountry: rows[0].originCountry,
    destinationCountry: rows[0].destinationCountry,
    total: rows.length,
    avgActualDays: round(
      rows.reduce((sum, row) => sum + row.actualMinutes, 0) /
        rows.length /
        1440,
    ),
    avgEstimatedDays: round(
      rows.reduce((sum, row) => sum + row.estimatedMinutes, 0) /
        rows.length /
        1440,
    ),
    avgDeltaDays: round(
      rows.reduce((sum, row) => sum + row.deltaMinutes, 0) / rows.length / 1440,
    ),
  })).sort(
    (a, b) =>
      b.total - a.total ||
      a.originCountry.localeCompare(b.originCountry) ||
      a.destinationCountry.localeCompare(b.destinationCountry),
  );
  const shown = current.rows.filter((row) =>
    filters.delayFilter === "EARLY"
      ? row.deltaMinutes < 0
      : filters.delayFilter === "LATE_OVER_1_DAY"
        ? row.deltaMinutes > 1440
        : true,
  );
  shown.sort((a, b) => {
    const difference = filters.sortBy.startsWith("actualDays")
      ? a.actualMinutes - b.actualMinutes
      : a.deltaMinutes - b.deltaMinutes;
    return (
      (filters.sortBy.endsWith(":desc") ? -difference : difference) ||
      a.transportId.localeCompare(b.transportId)
    );
  });
  return {
    period,
    generatedAt,
    kpi: {
      totalTransports: countMetric(
        current.rows.length,
        previous.rows.length,
        previous.rows.length + previous.excluded.count > 0,
      ),
      avgActualDays: metric(
        current.avg("actualMinutes"),
        previous.avg("actualMinutes"),
      ),
      avgDelayDays: metric(
        current.avg("deltaMinutes"),
        previous.avg("deltaMinutes"),
      ),
      accuracyRatio: metric(current.ratio, previous.ratio),
    },
    distribution: [
      {
        range: "<=-1",
        count: current.rows.filter((row) => row.deltaMinutes <= -1440).length,
      },
      {
        range: "(-1,0]",
        count: current.rows.filter(
          (row) => row.deltaMinutes > -1440 && row.deltaMinutes <= 0,
        ).length,
      },
      {
        range: "(0,1]",
        count: current.rows.filter(
          (row) => row.deltaMinutes > 0 && row.deltaMinutes <= 1440,
        ).length,
      },
      {
        range: "(1,2]",
        count: current.rows.filter(
          (row) => row.deltaMinutes > 1440 && row.deltaMinutes <= 2880,
        ).length,
      },
      {
        range: ">2",
        count: current.rows.filter((row) => row.deltaMinutes > 2880).length,
      },
    ],
    routeBenchmark,
    excluded: current.excluded,
    ...pageRows(
      shown.map((row) => ({
        transportId: row.transportId,
        transportCode: row.transportCode,
        originCountry: row.originCountry,
        destinationCountry: row.destinationCountry,
        actualDepartureAt: row.departure,
        actualArrivalAt: row.arrival,
        estimatedDays: round(row.estimatedMinutes / 1440),
        actualDays: round(row.actualMinutes / 1440),
        deltaDays: round(row.deltaMinutes / 1440),
      })),
      filters,
    ),
  };
}
