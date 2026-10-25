import {
  incidentFiltersSchema,
  incidentCategorySchema,
  type IncidentFilters,
  type IncidentClaimReport,
} from "../schemas";
import {
  countMetric,
  demoClaims,
  demoIncidents,
  demoTransports,
  demoVehicles,
  generatedAt,
  groupCount,
  inPeriod,
  matchesTransport,
  metric,
  pageRows,
  percent,
  reportPeriod,
} from "./data";

export function getIncidentClaimDemo(
  input: IncidentFilters,
): IncidentClaimReport {
  const filters = incidentFiltersSchema.parse(input);
  const period = reportPeriod(filters);
  const csv = (selection: string, value: string) =>
    !selection || selection.split(",").includes(value);
  const sharedFilter = Boolean(
    filters.originCountry ||
    filters.destinationCountry ||
    filters.routeId ||
    filters.transportProviderId,
  );
  const liveIncidents = demoIncidents.filter(
    (row) =>
      row.status !== "CANCELLED" &&
      csv(filters.incidentCategory, row.category) &&
      csv(filters.severity, row.severity) &&
      (!filters.vehicleId ||
        row.vehicleId?.toLowerCase() === filters.vehicleId.toLowerCase()) &&
      (!filters.horseId ||
        row.horseId?.toLowerCase() === filters.horseId.toLowerCase()) &&
      (!sharedFilter ||
        (row.transport !== null && matchesTransport(row.transport, filters))),
  );
  const liveClaims = demoClaims.filter(
    (row) =>
      row.status !== "CANCELLED" &&
      csv(filters.claimType, row.type) &&
      matchesTransport(row.transport, filters),
  );
  const approved = (rows: typeof liveIncidents) =>
    rows.flatMap((row) => row.costs.filter((cost) => cost.approved));
  function figures(from: string, to: string) {
    const completed = demoTransports.filter(
      (row) =>
        matchesTransport(row, filters) && inPeriod(row.completedAt, from, to),
    );
    const incidents = liveIncidents.filter((row) =>
      inPeriod(row.occurredAt, from, to),
    );
    const claims = liveClaims.filter((row) =>
      inPeriod(row.submittedAt, from, to),
    );
    return {
      completed,
      incidents,
      claims,
      incidentRate: percent(
        completed.filter((row) =>
          liveIncidents.some(
            (event) => event.transport?.transportId === row.transportId,
          ),
        ).length,
        completed.length,
      ),
      claimRate: percent(
        completed.filter((row) =>
          liveClaims.some(
            (claim) => claim.transport.transportId === row.transportId,
          ),
        ).length,
        completed.length,
      ),
      cost: approved(incidents).reduce((sum, cost) => sum + cost.amount, 0),
    };
  }
  const current = figures(period.dateFrom, period.dateTo),
    previous = figures(period.previousDateFrom, period.previousDateTo);
  const hasPrevious =
    previous.completed.length +
      previous.incidents.length +
      previous.claims.length >
    0;
  const costs = new Map<
    IncidentClaimReport["emergencyCostByCategory"][number]["category"],
    number
  >();
  for (const cost of approved(current.incidents))
    costs.set(cost.category, (costs.get(cost.category) ?? 0) + cost.amount);
  const severityCount = (severity: string) =>
    current.incidents.filter((row) => row.severity === severity).length;
  const claimCount = (status: string) =>
    current.claims.filter((row) => row.status === status).length;
  const shown = [...current.incidents].sort((a, b) => {
    const difference = Date.parse(a.occurredAt) - Date.parse(b.occurredAt);
    return (
      (filters.sortBy.endsWith(":desc") ? -difference : difference) ||
      a.code.localeCompare(b.code)
    );
  });
  return {
    period,
    generatedAt,
    kpi: {
      completedTransports: countMetric(
        current.completed.length,
        previous.completed.length,
        hasPrevious,
      ),
      totalIncidents: countMetric(
        current.incidents.length,
        previous.incidents.length,
        hasPrevious,
      ),
      incidentRate: metric(current.incidentRate, previous.incidentRate),
      totalClaims: countMetric(
        current.claims.length,
        previous.claims.length,
        hasPrevious,
      ),
      claimRate: metric(current.claimRate, previous.claimRate),
      totalEmergencyCost: countMetric(current.cost, previous.cost, hasPrevious),
      currency: "VND",
    },
    incidentsByCategory: incidentCategorySchema.options.map((category) => ({
      category,
      count: current.incidents.filter((row) => row.category === category)
        .length,
    })),
    incidentsBySeverity: {
      LOW: severityCount("LOW"),
      MEDIUM: severityCount("MEDIUM"),
      HIGH: severityCount("HIGH"),
      CRITICAL: severityCount("CRITICAL"),
    },
    incidentsByType: groupCount(
      current.incidents.flatMap((row) => [...new Set(row.types)]),
      (type) => type,
    )
      .map((item) => ({ incidentType: item.key, count: item.count }))
      .sort(
        (a, b) =>
          b.count - a.count || a.incidentType.localeCompare(b.incidentType),
      ),
    claimsByType: groupCount(current.claims, (row) => row.type)
      .map((item) => ({ claimType: item.key, count: item.count }))
      .sort(
        (a, b) => b.count - a.count || a.claimType.localeCompare(b.claimType),
      ),
    claimsByStatus: {
      PENDING: claimCount("PENDING"),
      APPROVED: claimCount("APPROVED"),
      REJECTED: claimCount("REJECTED"),
      RESOLVED: claimCount("RESOLVED"),
      CANCELLED: 0,
    },
    emergencyCostByCategory: Array.from(costs, ([category, amount]) => ({
      category,
      amount,
    })).sort(
      (a, b) => b.amount - a.amount || a.category.localeCompare(b.category),
    ),
    vehicleReliability: demoVehicles
      .map((vehicle) => {
        const events = current.incidents.filter(
          (row) => row.vehicleId === vehicle.vehicleId,
        );
        return {
          vehicleId: vehicle.vehicleId,
          vehicleCode: vehicle.vehicleCode,
          licensePlate: vehicle.licensePlate,
          incidentCount: events.length,
          repairRequiredCount: events.filter((row) => row.repairRequired)
            .length,
        };
      })
      .filter((row) => row.incidentCount > 0)
      .sort(
        (a, b) =>
          b.incidentCount - a.incidentCount ||
          a.vehicleCode.localeCompare(b.vehicleCode),
      ),
    ...pageRows(
      shown.map((row) => ({
        incidentReportId: row.id,
        incidentCode: row.code,
        occurredAt: row.occurredAt,
        category: row.category,
        incidentType: row.types[0] ?? null,
        severity: row.severity,
        status: row.status,
        transportCode: row.transport?.transportCode ?? null,
        emergencyCost: row.costs
          .filter((cost) => cost.approved)
          .reduce((sum, cost) => sum + cost.amount, 0),
        claimCodes: liveClaims
          .filter(
            (claim) =>
              claim.transport.transportId === row.transport?.transportId,
          )
          .sort(
            (a, b) =>
              a.submittedAt.localeCompare(b.submittedAt) ||
              a.code.localeCompare(b.code),
          )
          .map((claim) => claim.code),
      })),
      filters,
    ),
  };
}
