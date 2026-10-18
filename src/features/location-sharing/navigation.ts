export function driverTransportOverviewPath(transportId: string) {
  return `/crew/transports/${encodeURIComponent(transportId)}`;
}

// Public navigation boundary for UC-49 and the future teammate-owned Crew Home.
export function driverLocationSharingPath(transportId: string) {
  return `${driverTransportOverviewPath(transportId)}/location`;
}
