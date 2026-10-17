import type { AuditEvent, DashboardItem, DossierStatus } from "@/features/dossier/types"

const DAY = 24 * 60 * 60 * 1000

/** Departure dates are relative to today so the "urgent risk" (<= 7 days) cases stay urgent whenever the app runs. */
const inDays = (days: number, hour = 6) => {
  const date = new Date(Date.now() + days * DAY)
  date.setUTCHours(hour, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

const row = (
  complianceDossierId: number,
  dossierCode: string,
  bookingCode: string,
  customerName: string,
  originCountry: string,
  destinationCountry: string,
  departureInDays: number,
  progressPercent: number,
  status: DossierStatus,
): DashboardItem => ({
  complianceDossierId,
  dossierCode,
  bookingCode,
  customerName,
  originCountry,
  destinationCountry,
  requestedDepartureDate: inDays(departureInDays),
  progressPercent,
  status,
  dossierType: "MAIN",
  isUrgentRisk: departureInDays <= 7 && progressPercent < 100 && status !== "CLOSED" && status !== "APPROVED",
})

export const MOCK_DASHBOARD_ITEMS: DashboardItem[] = [
  row(501, "CD-20260925-7731", "REQ-20260925-1002", "Nguyễn Minh Khang", "GB", "FR", 4, 62.5, "IN_PREPARATION"),
  row(502, "CD-20260918-0814", "REQ-20260918-8842", "Kildare Thoroughbreds Ltd", "IE", "GB", 22, 85, "READY_FOR_SUBMISSION"),
  row(503, "CD-20260919-0815", "REQ-20260919-8849", "Coolmore Racing Syndicate", "IE", "GB", 23, 40, "IN_PREPARATION"),
  row(504, "CD-20260920-0810", "REQ-20260920-8831", "Écurie du Haras", "FR", "DE", 20, 95, "SUBMITTED"),
  row(505, "CD-20260915-0808", "REQ-20260915-8820", "Ballydoyle Stables", "IE", "FR", 19, 100, "APPROVED"),
  row(506, "CD-20260921-0818", "REQ-20260921-8854", "Godolphin Racing Europe", "GB", "FR", 24, 20, "IN_PREPARATION"),
  row(507, "CD-20260914-0802", "REQ-20260914-8812", "Moyglare Stud Farm", "IE", "BE", 18, 10, "REJECTED"),
  row(508, "CD-20260901-0795", "REQ-20260901-8798", "Curragh Bloodstock Ltd", "IE", "GB", 16, 100, "CLOSED"),
  row(509, "CD-20260926-0821", "REQ-20260926-8860", "Hamdan Equine Holdings", "DE", "GB", 6, 55, "IN_PREPARATION"),
  row(510, "CD-20260924-0822", "REQ-20260924-8861", "Van der Berg Stables", "NL", "DE", 30, 100, "READY_FOR_SUBMISSION"),
  row(511, "CD-20260927-0823", "REQ-20260927-8863", "Maison Lafitte Racing", "FR", "IE", 2, 80, "READY_FOR_SUBMISSION"),
  row(512, "CD-20260928-0824", "REQ-20260928-8866", "Newmarket Heritage Ltd", "GB", "GB", 9, 30, "DRAFT"),
  row(513, "CD-20260923-0825", "REQ-20260923-8851", "Tipperary Bloodstock", "IE", "IE", 11, 100, "PENDING"),
  row(514, "CD-20260922-0826", "REQ-20260922-8848", "Chantilly Pur-Sang", "FR", "BE", 14, 70, "PENDING"),
]

const actor = (accountId: number, fullName: string, role: string) => ({ accountId, fullName, role })
const ts = (days: number, time: string) => new Date(`${inDays(days).slice(0, 10)}T${time}Z`).toISOString()

/** Newest first, like the API. The same sample trail is returned for every dossier. */
export const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  { actionType: "QUARANTINE_RESULT_FINALIZED", targetEntity: "ComplianceDocument", targetEntityId: "Quarantine Certificate", actor: actor(402, "Karen Lim", "LOGISTICS_MANAGER"), note: "Quarantine clearance result recorded: Cleared for export. Certificate no. QNT-2026-8843.", occurredAt: ts(-1, "08:14:23") },
  { actionType: "AUTHORITY_SUBMITTED", targetEntity: "ComplianceDossier", targetEntityId: "REQ-20260925-1002", actor: actor(403, "Nguyễn Văn Bảo", "TRANSPORT_SPECIALIST"), note: "Dossier submitted to AVS (Australia) via CARGOS. Reference no. AVS-2026-77190.", occurredAt: ts(-2, "11:20:15") },
  { actionType: "DOCUMENT_REVIEW_APPROVED", targetEntity: "DocumentReview", targetEntityId: "DRV-20260930-0001", actor: actor(404, "Jessica Tan", "TRANSPORT_SPECIALIST"), note: "Reviewed and approved. All information verified as correct.", occurredAt: ts(-3, "05:33:41") },
  { actionType: "DOCUMENT_VERSION_SUBMITTED", targetEntity: "DocumentVersion v2", targetEntityId: "Health Certificate", actor: actor(403, "Nguyễn Văn Bảo", "TRANSPORT_SPECIALIST"), note: "Submitted updated health certificate (v2) incorporating requested changes.", occurredAt: ts(-4, "09:18:27") },
  { actionType: "DOCUMENT_REVIEW_REJECTED", targetEntity: "DocumentReview", targetEntityId: "DRV-20260928-0001", actor: actor(402, "Karen Lim", "LOGISTICS_MANAGER"), note: "Rejected. Please provide updated vaccination certificate with valid dates and vet signature.", occurredAt: ts(-5, "03:12:11") },
  { actionType: "DOCUMENT_REQUEST_CREATED", targetEntity: "DocumentRequest", targetEntityId: "DR-20260927-0003", actor: actor(402, "Karen Lim", "LOGISTICS_MANAGER"), note: "Requested updated vaccination certificate. Reason: Certificate expiry date unclear.", occurredAt: ts(-6, "08:45:33") },
  { actionType: "DOCUMENT_VERSION_SUBMITTED", targetEntity: "DocumentVersion v1", targetEntityId: "Health Certificate", actor: actor(403, "Nguyễn Văn Bảo", "TRANSPORT_SPECIALIST"), note: "Submitted initial health certificate (v1) issued on 25 Sep 2026.", occurredAt: ts(-7, "10:22:19") },
  { actionType: "DOSSIER_REQUIREMENT_ADDED", targetEntity: "DossierRequirement", targetEntityId: "Import Transit Declaration", actor: actor(405, "Ngô Hoàng Thái Dương", "TRANSPORT_SPECIALIST"), note: "Custom requirement added (optional, trip-level).", occurredAt: ts(-8, "04:02:10") },
  { actionType: "DOSSIER_INITIALIZED", targetEntity: "ComplianceDossier", targetEntityId: "REQ-20260925-1002", actor: actor(405, "Ngô Hoàng Thái Dương", "TRANSPORT_SPECIALIST"), note: "ComplianceDossier created with 9 requirements for route Singapore → Melbourne.", occurredAt: ts(-9, "02:15:04") },
]
