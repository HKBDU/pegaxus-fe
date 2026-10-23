export type EmergencyCostAudience = "admin" | "crew";

export const emergencyReroutePath = (incidentReportId: string) =>
  `/admin/incidents/${encodeURIComponent(incidentReportId)}/reroute`;

export const emergencyCostListPath = (audience: EmergencyCostAudience) =>
  `/${audience}/emergency-costs`;

export function emergencyCostDetailPath(
  audience: EmergencyCostAudience,
  id: string,
  incidentReportId?: string,
) {
  const path = `${emergencyCostListPath(audience)}/${encodeURIComponent(id)}`;
  return incidentReportId
    ? `${path}?${new URLSearchParams({ incidentReportId })}`
    : path;
}

export function emergencyCostCreatePath(
  audience: EmergencyCostAudience,
  incidentReportId: string,
) {
  return `${emergencyCostListPath(audience)}/new?${new URLSearchParams({ incidentReportId })}`;
}

export function emergencyCostScopedListPath(
  audience: EmergencyCostAudience,
  incidentReportId?: string,
) {
  return incidentReportId
    ? `${emergencyCostListPath(audience)}?${new URLSearchParams({ incidentReportId })}`
    : emergencyCostListPath(audience);
}
