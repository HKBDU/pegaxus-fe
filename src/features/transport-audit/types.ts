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
    email?: string;
    phone?: string;
  };
  contractNumber?: string;
  contractSignedAt?: string;
  originCountry: string;
  destinationCountry: string;
  pickupLocation?: string;
  deliveryLocation?: string;
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
    claimType?: string;
    claimedAmount?: number;
    createdAt?: string;
  }>;
}
export interface AuditHorseVitalLog {
  logId: string;
  recordedAt: string;
  locationName?: string;
  temperatureCelsius: number;
  heartRateBpm: number;
  respirationRate?: number;
  stressLevel: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  isAbnormal?: boolean;
  notes?: string;
  veterinarianName?: string;
}
export interface AuditHorseItem {
  horseId: string;
  horseName: string;
  microchipNumber: string;
  passportNumber: string;
  breed?: string;
  gender?: string;
  yearOfBirth?: number;
  weightKg?: number;
  declaredValue?: number;
  healthLogs: AuditHorseVitalLog[];
}
export interface AuditHorsesData {
  horses: AuditHorseItem[];
}
export interface AuditRouteLeg {
  legId: string;
  legOrder: number;
  legType: "ROAD_DOMESTIC" | "FERRY" | "CHUNNEL" | "ROAD_INTERNATIONAL";
  fromLocation: string;
  toLocation: string;
  plannedDepartureAt?: string;
  actualDepartureAt?: string;
  plannedArrivalAt?: string;
  actualArrivalAt?: string;
  truckPlate?: string;
  trailerPlate?: string;
  driverName?: string;
  driverLicense?: string;
  isOutsourced: boolean;
  subcontractorName?: string;
  outsourcingCost?: number;
}
export interface AuditRoutingData {
  routePlanId?: string;
  routePlanCode?: string;
  totalDistanceKm?: number;
  totalDurationHours?: number;
  legs: AuditRouteLeg[];
}
export interface AuditComplianceDocument {
  documentId: string;
  documentType: string;
  title: string;
  version?: number;
  verifiedAt?: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  fileUrl?: string;
}
export interface AuditComplianceData {
  dossiers: Array<{
    dossierId: string;
    dossierCode: string;
    type: "MAIN" | "EXTRA";
    status: string;
    documents: AuditComplianceDocument[];
  }>;
  customsClearance?: {
    mrnNumber: string;
    clearedAt?: string;
    borderControlPostName?: string;
    inspectionType?: "PHYSICAL" | "DOCUMENTARY" | "EXEMPT";
    status: string;
    proofUrl?: string;
  };
  veterinarianNotes?: string;
}
export interface AuditHandoverRecord {
  handoverRecordId: string;
  handoverCode: string;
  handoverType: "PICKUP" | "TRANSIT" | "DELIVERY";
  status: string;
  completedAt: string;
  handedOverBy?: string;
  receivedBy?: string;
  digitalSignatureVerified: boolean;
  downloadUrl?: string;
}
export interface AuditIncidentRecord {
  incidentReportId: string;
  incidentCode: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  occurredAt: string;
  location?: string;
  summary: string;
  resolutionNotes?: string;
}
export interface AuditOperationsData {
  handovers: AuditHandoverRecord[];
  incidents: AuditIncidentRecord[];
  auditDossiers?: Array<{
    auditDossierId: string;
    actionType: string;
    summary: string;
    visibility: "PUBLIC" | "INTERNAL";
    createdAt: string;
  }>;
}
export interface AuditFinanceData {
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    type: string;
    status: string;
    totalAmount: number;
    currency: string;
    issuedAt?: string;
    paidAt?: string;
  }>;
  emergencyExpenses?: Array<{
    expenseId: string;
    expenseCode: string;
    category: string;
    amount: number;
    currency: string;
    reason: string;
    approvedAt?: string;
    approvedBy?: string;
  }>;
  summary?: {
    baseFareAmount: number;
    ferryChunnelFee: number;
    bcpQuarantineFee: number;
    insuranceFee: number;
    emergencyCost: number;
    totalPaidAmount: number;
    currency: string;
  };
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
  horses?: AuditHorsesData;
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
