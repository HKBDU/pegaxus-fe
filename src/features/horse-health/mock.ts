import type { AssignedTransportsResponse, CrewMember, CrewRole, HealthLog, HealthLogHistory, HealthLogInput, HealthLogPhotoInput, HealthLogSummary, HorseHealthOverview, MarkAllNormalInput } from "./types"

const MOCK_TRANSPORTS = [
  {
    transportId: "41000000-0000-4000-8000-000000000001",
    transportCode: "TR-20261016-0001",
    bookingCode: "BK-20261016-0001",
    complianceDossierId: "c0000000-0000-4000-8000-000000000001",
    status: "IN_TRANSIT" as const,
    currentSegment: {
      routePlanRouteId: "42000000-0000-4000-8000-000000000001",
      displayOrder: 2,
      fromLocationName: "Lille Rest Stop",
      toLocationName: "Calais BCP",
      status: "IN_PROGRESS",
    },
    horseCount: 5,
    departureAt: "2026-10-16T07:30:00Z",
    etaAt: "2026-10-16T16:45:00Z",
  },
  {
    transportId: "41000000-0000-4000-8000-000000000002",
    transportCode: "TR-20261016-0002",
    bookingCode: "BK-20261016-0002",
    status: "READY" as const,
    currentSegment: null,
    horseCount: 2,
    departureAt: "2026-10-17T09:00:00Z",
    etaAt: "2026-10-18T17:00:00Z",
  },
] as const

export function getMockAssignedTransports(roles: string[]): AssignedTransportsResponse {
  const myRole: CrewRole = roles.some((role) => role.toUpperCase().replace(/^ROLE_/, "") === "ESCORT") ? "ESCORT" : "DRIVER"
  return {
    serverTime: "2026-10-16T09:00:00Z",
    items: MOCK_TRANSPORTS.map((transport) => ({ ...transport, myRole })),
  }
}

const MOCK_ESCORT: CrewMember = {
  employeeId: "43000000-0000-4000-8000-000000000001",
  employeeCode: "EMP-ESC-001",
  fullName: "Sophie Laurent",
  role: "ESCORT",
  phone: "+33 6 98 76 54 32",
}

const MOCK_HORSES = [
  { horseId: "44000000-0000-4000-8000-000000000001", horseName: "Pegasus Thunder", microchipNumber: "826123456789012", passportNumber: "826GB123456789" },
  { horseId: "44000000-0000-4000-8000-000000000002", horseName: "Silver Arrow", microchipNumber: "826123456789013", passportNumber: "826GB123456790" },
  { horseId: "44000000-0000-4000-8000-000000000003", horseName: "Northern Star", microchipNumber: "826123456789014", passportNumber: "826GB123456791" },
] as const

const MOCK_LOGS: HealthLog[] = []

function makeSummary(horseIndex: number, status: HealthLogSummary["healthStatus"], logId: string): HealthLogSummary {
  const horse = MOCK_HORSES[horseIndex]
  return {
    horseHealthLogId: logId,
    horse,
    checkedAt: "2026-10-16T08:25:00Z",
    logType: "REST_STOP_CHECK",
    healthStatus: status,
    hydrationStatus: status === "CRITICAL" ? "MODERATE_DEHYDRATION" : "NORMAL",
    checkedBy: MOCK_ESCORT,
    veterinarianRequired: status === "CRITICAL",
    hasPhoto: horseIndex === 0,
    latestNote: status === "NORMAL" ? "Normal condition." : "Follow-up required.",
    locationDescription: "Lille Rest Stop",
  }
}

function makeLog(horseIndex: number, status: HealthLogSummary["healthStatus"], logId: string): HealthLog {
  const summary = makeSummary(horseIndex, status, logId)
  return {
    ...summary,
    transportId: "41000000-0000-4000-8000-000000000001",
    temperatureCelsius: status === "CRITICAL" ? 39.2 : 38.1,
    heartRateBpm: status === "CRITICAL" ? 58 : 36,
    respiratoryRateBpm: 12,
    behaviorNote: status === "NORMAL" ? null : "Requires observation during next rest stop.",
    symptomNote: null,
    injuryNote: null,
    feedingNote: null,
    hydrationNote: status === "CRITICAL" ? "Drinking less than expected." : null,
    treatmentProvided: status === "CRITICAL" ? "Moved to shaded stall and monitored." : null,
    medicationGiven: null,
    veterinarianNote: status === "CRITICAL" ? "Veterinarian review required." : null,
    locationDescription: "Lille Rest Stop",
    gpsCoordinates: null,
    photos: summary.hasPhoto ? [{ photoUrl: "/mock/horse-health-check.jpg", latitude: null, longitude: null, capturedAt: null, caption: "Rest stop condition check" }] : [],
    generalNote: status === "NORMAL" ? "Normal condition." : "Follow-up required.",
    createdAt: summary.checkedAt,
    updatedAt: summary.checkedAt,
  }
}

MOCK_LOGS.push(makeLog(0, "OBSERVATION_REQUIRED", "45000000-0000-4000-8000-000000000001"), makeLog(1, "CRITICAL", "45000000-0000-4000-8000-000000000002"), makeLog(2, "NORMAL", "45000000-0000-4000-8000-000000000003"))

export function getMockHealthOverview(transportId: string): HorseHealthOverview {
  return {
    serverTime: "2026-10-16T09:00:00Z",
    transportId,
    transportStatus: "IN_TRANSIT",
    currentEscort: MOCK_ESCORT,
    horses: MOCK_HORSES.map((horse, index) => {
      const log = MOCK_LOGS[index]
      const latestLog: HealthLogSummary | null = log ? {
        horseHealthLogId: log.horseHealthLogId,
        horse: log.horse,
        checkedAt: log.checkedAt,
        logType: log.logType,
        healthStatus: log.healthStatus,
        hydrationStatus: log.hydrationStatus,
        checkedBy: log.checkedBy,
        veterinarianRequired: log.veterinarianRequired,
        hasPhoto: log.hasPhoto,
        latestNote: log.latestNote,
        locationDescription: log.locationDescription,
      } : null
      return { horse, latestHealthStatus: log?.healthStatus ?? null, latestLog, logCount: log ? 1 : 0 }
    }),
  }
}

export function getMockHealthLogHistory(transportId: string, horseId: string, filters: { pageIndex: number; pageSize: number }): HealthLogHistory {
  const logs = MOCK_LOGS.filter((log) => log.transportId === transportId && log.horse.horseId === horseId)
  return { serverTime: "2026-10-16T09:00:00Z", horse: logs[0]?.horse ?? MOCK_HORSES[0], items: logs, pageIndex: filters.pageIndex, pageSize: filters.pageSize, totalItems: logs.length, totalPages: logs.length ? 1 : 0 }
}

export function getMockHealthLog(logId: string): HealthLog {
  return MOCK_LOGS.find((log) => log.horseHealthLogId === logId) ?? MOCK_LOGS[0]
}

export function mockCreateHealthLog(transportId: string, input: HealthLogInput): HealthLog {
  const horseIndex = Math.max(0, MOCK_HORSES.findIndex((horse) => horse.horseId === input.horseId))
  const log = { ...makeLog(horseIndex, input.healthStatus, `45000000-0000-4000-8000-${String(MOCK_LOGS.length + 10).padStart(12, "0")}`), transportId, logType: input.logType, hydrationStatus: input.hydrationStatus, checkedAt: input.checkedAt ?? new Date().toISOString(), generalNote: input.generalNote ?? null }
  MOCK_LOGS.push(log)
  return log
}

export function mockMarkAllNormal(transportId: string, input: MarkAllNormalInput): HealthLog {
  return mockCreateHealthLog(transportId, {
    horseId: MOCK_HORSES[0].horseId,
    logType: input.logType,
    healthStatus: "NORMAL",
    hydrationStatus: "NORMAL",
    checkedAt: input.checkedAt,
    locationDescription: input.locationDescription,
    generalNote: input.generalNote,
    photoPublicIds: input.photoPublicIds,
    files: input.files,
  })
}

export function mockAddHealthLogPhotos(transportId: string, horseHealthLogId: string, input: HealthLogPhotoInput): HealthLog {
  const log = MOCK_LOGS.find((item) => item.horseHealthLogId === horseHealthLogId) ?? MOCK_LOGS[0]
  if (!log) throw new Error("Health log not found")
  const capturedAt = input.capturedAt ?? new Date().toISOString()
  const photos = input.photoPublicIds?.length
    ? input.photoPublicIds.map((publicId) => ({
        photoUrl: `https://mock.storage/${publicId}`,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        capturedAt,
        caption: input.caption ?? null,
      }))
    : (input.files ?? []).map((file) => ({
        photoUrl: URL.createObjectURL(file),
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        capturedAt,
        caption: input.caption ?? null,
      }))
  log.photos = [...(log.photos ?? []), ...photos]
  log.hasPhoto = log.photos.length > 0
  log.updatedAt = capturedAt
  return { ...log, transportId }
}

