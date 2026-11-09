import type { EntityId, PaginationMeta } from "@/shared/types";

export type AuditSection =
  "booking" | "horses" | "routing" | "compliance" | "operations" | "finance";
export type TransportStatus = "COMPLETED" | "CANCELLED" | string;
export type ExportFormat = "ZIP" | "PDF";
export type ExportMode = "STANDARD" | "INSURANCE";
export type ExportStatus =
  "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "EXPIRED";

export interface TransportArchiveItem {
  transportId: EntityId;
  transportCode: string;
  bookingId?: EntityId;
  bookingCode?: string;
  customerName?: string;
  horseCount?: number;
  completedAt?: string | null;
  status: TransportStatus;
  claimCount?: number;
  incidentCount?: number;
}
export interface TransportArchiveQuery {
  search?: string;
  status?: string;
  originCountry?: string;
  destinationCountry?: string;
  completedFrom?: string;
  completedTo?: string;
  pageIndex: number;
  pageSize: number;
}
export interface TransportArchiveResponse {
  items: TransportArchiveItem[];
  meta: PaginationMeta;
}
export interface AuditTimelineItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  occurredAt: string;
  visibility?: "PUBLIC" | "INTERNAL";
}
export interface AuditBlock {
  [key: string]: unknown;
}
export interface AuditBookingData {
  bookingId: string;
  bookingCode: string;
  customer: {
    customerId: string;
    name: string;
  };
  originCountry: string;
  destinationCountry: string;
  invoices?: Array<{
    invoiceId: string;
    invoiceNumber: string;
    type: string;
    status: string;
    totalAmount: number;
    currency: string;
  }>;
  claims?: Array<{
    claimId: string;
    claimCode: string;
    status: string;
  }>;
}
export interface AuditHorseHealthLog {
  healthLogId: string;
  checkedAt: string;
  logType: string;
  healthStatus: string;
  temperatureCelsius?: number | null;
  heartRateBpm?: number | null;
  respiratoryRateBpm?: number | null;
  symptomNote?: string | null;
  injuryNote?: string | null;
  treatmentProvided?: string | null;
  medicationGiven?: string | null;
  veterinarianRequired: boolean;
  veterinarianNote?: string | null;
  generalNote?: string | null;
  photoCount: number;
}
export interface AuditHorseItem {
  horseId: string;
  name: string;
  microchipNumber?: string | null;
  passportNumber?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  healthLogs: AuditHorseHealthLog[];
}
export interface AuditRouteSegment {
  routePlanRouteId: string;
  sequenceNo: number;
  routeType: string;
  status: string;
  from: string;
  to: string;
  transportMode: string;
  executedBy: string;
  providerName?: string | null;
  outsourcingCost?: number | null;
  outsourcingCurrency?: string | null;
  vehicleCode?: string | null;
  licensePlate?: string | null;
  driverName?: string | null;
  escortName?: string | null;
  plannedDepartureAt?: string | null;
  plannedArrivalAt?: string | null;
  actualDepartureAt?: string | null;
  actualArrivalAt?: string | null;
  supersededAt?: string | null;
}
export interface AuditRoutePlan {
  routePlanId: string;
  routePlanCode: string;
  status: string;
  totalDistanceKm?: number | null;
  estimatedDurationMinutes?: number | null;
  segments: AuditRouteSegment[];
}
export interface AuditRoutingData {
  primary?: AuditRoutePlan | null;
  alternatives: AuditRoutePlan[];
}
export interface AuditDocumentVersion {
  documentVersionId: string;
  versionNo: number;
  fileName: string;
  uploadedAt: string;
  reviews?: Array<{
    result: string;
    reviewComment?: string | null;
    reviewedAt: string;
  }> | null;
}
export interface AuditComplianceDocument {
  complianceDocumentId: string;
  documentCode: string;
  documentName: string;
  status: string;
  documentNumber?: string | null;
  issuingAuthority?: string | null;
  issuedDate?: string | null;
  expiryDate?: string | null;
  versions: AuditDocumentVersion[];
}
export interface AuditDossierRequirement {
  dossierRequirementId: string;
  requirementName: string;
  horseId?: string | null;
  status: string;
  isMandatory: boolean;
  document?: AuditComplianceDocument | null;
}
export interface AuditQuarantineProof {
  quarantineProofId: string;
  status: string;
  bcpName: string;
  inspectionAt?: string | null;
  verifiedAt?: string | null;
  officialVeterinarianName?: string | null;
  conditions?: string | null;
  verificationNote?: string | null;
}
export interface AuditCustomsClearanceProof {
  customsClearanceProofId: string;
  status: string;
  customsPortName: string;
  mrnNumber?: string | null;
  clearanceAt?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;
}
export interface AuditComplianceDossier {
  complianceDossierId: string;
  dossierCode: string;
  dossierType: string;
  status: string;
  openedAt?: string | null;
  approvedAt?: string | null;
  requirements: AuditDossierRequirement[];
  quarantineProof?: AuditQuarantineProof | null;
  customsClearanceProof?: AuditCustomsClearanceProof | null;
}
export interface AuditComplianceData {
  dossiers: AuditComplianceDossier[];
}
export interface AuditHandoverRecord {
  handoverRecordId: string;
  handoverCode: string;
  handoverType: string;
  status: string;
  completedAt?: string | null;
}
export interface AuditIncidentRecord {
  incidentReportId: string;
  incidentCode: string;
  category: string;
  severity: string;
  status: string;
  occurredAt: string;
}
export interface AuditDossierEntry {
  auditDossierId: string;
  actionType: string;
  targetEntity: string;
  summary?: string | null;
  visibility: "PUBLIC" | "INTERNAL";
  createdAt: string;
}
export interface AuditOperationsData {
  handovers: AuditHandoverRecord[];
  incidents: AuditIncidentRecord[];
  auditDossiers: AuditDossierEntry[];
}
export interface AuditReceipt {
  receiptId: string;
  receiptCode: string;
  status: string;
  paymentMethod: string;
  amount: number;
  paidAt?: string | null;
  confirmedAt?: string | null;
}
export interface AuditFinanceInvoice {
  invoiceId: string;
  invoiceNumber: string;
  type: string;
  status: string;
  totalAmount: number;
  currency: string;
  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  receipts: AuditReceipt[];
}
export interface AuditFinancialReport {
  reportCode: string;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalEmergencyCost: number;
  outstandingAmount: number;
  summaryNote?: string | null;
  generatedAt?: string | null;
}
export interface AuditEmergencyCost {
  requestCode: string;
  incidentCode?: string | null;
  category: string;
  approvedAmount: number;
}
export interface AuditFinanceData {
  invoices: AuditFinanceInvoice[];
  financialReport?: AuditFinancialReport | null;
  emergencyCosts: AuditEmergencyCost[];
}
export interface TransportAuditFull {
  transportId: EntityId;
  transportCode: string;
  status: TransportStatus;
  completedAt?: string | null;
  originCountry?: string;
  destinationCountry?: string;
  viewMode?: "FULL" | "CUSTOMER";
  booking?: AuditBookingData;
  horses?: AuditHorseItem[];
  routing?: AuditRoutingData;
  compliance?: AuditComplianceData;
  operations?: AuditOperationsData;
  finance?: AuditFinanceData;
  timeline: AuditTimelineItem[];
  epod?: { handoverRecordId?: EntityId; downloadUrl?: string };
}
export interface TransportAuditCustomer extends Pick<
  TransportAuditFull,
  "transportId" | "transportCode" | "status" | "timeline" | "epod"
> {
  completedAt?: string | null;
  originCountry?: string;
  destinationCountry?: string;
  horseCount?: number;
}
export interface AuditExportRequest {
  format: ExportFormat;
  mode: ExportMode;
}
export interface AuditExportJobResponse {
  exportId: string;
  status: ExportStatus;
  progress?: number;
  downloadUrl?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  delivery?: "DIRECT" | "EMAIL";
  errorMessage?: string | null;
}
