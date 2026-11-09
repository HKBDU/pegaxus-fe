import { z } from "zod";
import type { TransportArchiveResponse } from "./types";
export const auditTimelineItemSchema = z.object({
  id: z.coerce.string(),
  type: z.string().catch("EVENT"),
  title: z.string().catch("Event"),
  description: z.string().nullish(),
  occurredAt: z.string().catch(""),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).optional(),
});
const id = z.union([z.string(), z.number()]).transform(String);
const amount = z.number().catch(0);
const note = z.string().nullish();
const reading = z.number().nullish();
// Block shapes mirror the BE contract in AuditService/Response.cs. Fields are lenient (nullish/catch) so that one odd
// record degrades to "—" instead of failing the item, its whole list, or the entire audit response.
export const auditBookingSchema = z.object({
  bookingId: id,
  bookingCode: z.string().catch("—"),
  customer: z
    .object({
      customerId: id,
      name: z.string().catch("—"),
      email: z.string().optional(),
      phone: z.string().optional(),
    })
    .catch({ customerId: "", name: "—" }),
  contractNumber: z.string().optional(),
  contractSignedAt: z.string().optional(),
  originCountry: z.string().catch("—"),
  destinationCountry: z.string().catch("—"),
  pickupLocation: z.string().optional(),
  deliveryLocation: z.string().optional(),
  invoices: z
    .array(
      z.object({
        invoiceId: id,
        invoiceNumber: z.string(),
        type: z.string(),
        status: z.string(),
        totalAmount: amount,
        currency: z.string().catch("VND"),
      }),
    )
    .optional(),
  claims: z
    .array(
      z.object({
        claimId: id,
        claimCode: z.string(),
        status: z.string(),
        claimType: z.string().optional(),
        claimedAmount: amount.optional(),
        createdAt: z.string().optional(),
      }),
    )
    .optional(),
});
export const auditHorseHealthLogSchema = z.object({
  healthLogId: id,
  checkedAt: z.string(),
  logType: z.string().catch("OTHER"),
  healthStatus: z.string().catch("NORMAL"),
  temperatureCelsius: reading,
  heartRateBpm: reading,
  respiratoryRateBpm: reading,
  symptomNote: note,
  injuryNote: note,
  treatmentProvided: note,
  medicationGiven: note,
  veterinarianRequired: z.boolean().catch(false),
  veterinarianNote: note,
  generalNote: note,
  photoCount: z.number().catch(0),
});
// The BE sends `horses` as a bare array. The old `{ horses: [...] }` object shape made every audit response fail to parse.
export const auditHorsesSchema = z.array(
  z.object({
    horseId: id,
    name: z.string().catch("—"),
    microchipNumber: note,
    passportNumber: note,
    weightKg: reading,
    heightCm: reading,
    healthLogs: z.array(auditHorseHealthLogSchema).catch([]),
  }),
);
export const auditRouteSegmentSchema = z.object({
  routePlanRouteId: id,
  sequenceNo: z.number().catch(0),
  routeType: z.string().catch("PRIMARY"),
  status: z.string().catch("—"),
  from: z.string().catch("—"),
  to: z.string().catch("—"),
  transportMode: z.string().catch("ROAD"),
  executedBy: z.string().catch("INTERNAL"),
  providerName: note,
  outsourcingCost: reading,
  outsourcingCurrency: note,
  vehicleCode: note,
  licensePlate: note,
  driverName: note,
  escortName: note,
  plannedDepartureAt: note,
  plannedArrivalAt: note,
  actualDepartureAt: note,
  actualArrivalAt: note,
  supersededAt: note,
});
export const auditRoutePlanSchema = z.object({
  routePlanId: id,
  routePlanCode: z.string().catch("—"),
  status: z.string().catch("—"),
  totalDistanceKm: reading,
  estimatedDurationMinutes: reading,
  segments: z.array(auditRouteSegmentSchema).catch([]),
});
export const auditRoutingSchema = z.object({
  primary: auditRoutePlanSchema.nullish(),
  alternatives: z.array(auditRoutePlanSchema).catch([]),
});
const auditDocumentReviewSchema = z.object({
  result: z.string(),
  reviewComment: note,
  reviewedAt: z.string(),
});
const auditDocumentVersionSchema = z.object({
  documentVersionId: id,
  versionNo: z.number().catch(0),
  fileName: z.string().catch("—"),
  uploadedAt: z.string(),
  reviews: z.array(auditDocumentReviewSchema).nullish(),
});
const auditComplianceDocumentSchema = z.object({
  complianceDocumentId: id,
  documentCode: z.string().catch("—"),
  documentName: z.string().catch("—"),
  status: z.string().catch("—"),
  documentNumber: note,
  issuingAuthority: note,
  issuedDate: note,
  expiryDate: note,
  versions: z.array(auditDocumentVersionSchema).catch([]),
});
const auditDossierRequirementSchema = z.object({
  dossierRequirementId: id,
  requirementName: z.string().catch("—"),
  horseId: id.nullish(),
  status: z.string().catch("—"),
  isMandatory: z.boolean().catch(false),
  document: auditComplianceDocumentSchema.nullish(),
});
const auditQuarantineProofSchema = z.object({
  quarantineProofId: id,
  status: z.string().catch("—"),
  bcpName: z.string().catch("—"),
  inspectionAt: note,
  verifiedAt: note,
  officialVeterinarianName: note,
  conditions: note,
  verificationNote: note,
});
const auditCustomsClearanceProofSchema = z.object({
  customsClearanceProofId: id,
  status: z.string().catch("—"),
  customsPortName: z.string().catch("—"),
  mrnNumber: note,
  clearanceAt: note,
  verifiedAt: note,
  verificationNote: note,
});
export const auditComplianceSchema = z.object({
  dossiers: z
    .array(
      z.object({
        complianceDossierId: id,
        dossierCode: z.string().catch("—"),
        dossierType: z.string().catch("MAIN"),
        status: z.string().catch("—"),
        openedAt: note,
        approvedAt: note,
        requirements: z.array(auditDossierRequirementSchema).catch([]),
        quarantineProof: auditQuarantineProofSchema.nullish().catch(null),
        customsClearanceProof: auditCustomsClearanceProofSchema
          .nullish()
          .catch(null),
      }),
    )
    .catch([]),
});
export const auditOperationsSchema = z.object({
  handovers: z
    .array(
      z.object({
        handoverRecordId: id,
        handoverCode: z.string().catch("—"),
        // The BE also sends TRANSFER, BORDER_HANDOVER, CARRIER_HANDOVER and OTHER, and completedAt is null until signed.
        handoverType: z.string().catch("OTHER"),
        status: z.string().catch("—"),
        completedAt: note,
      }),
    )
    .catch([]),
  incidents: z
    .array(
      z.object({
        incidentReportId: id,
        incidentCode: z.string().catch("—"),
        category: z.string().catch("—"),
        severity: z.string().catch("—"),
        status: z.string().catch("—"),
        occurredAt: z.string().catch(""),
      }),
    )
    .catch([]),
  auditDossiers: z
    .array(
      z.object({
        auditDossierId: id,
        actionType: z.string().catch("—"),
        targetEntity: z.string().catch("—"),
        summary: note,
        visibility: z.enum(["PUBLIC", "INTERNAL"]).catch("INTERNAL"),
        createdAt: z.string().catch(""),
      }),
    )
    .catch([]),
});
export const auditFinanceSchema = z.object({
  invoices: z
    .array(
      z.object({
        invoiceId: id,
        invoiceNumber: z.string().catch("—"),
        type: z.string().catch("—"),
        status: z.string().catch("—"),
        totalAmount: amount,
        currency: z.string().catch("VND"),
        issuedAt: note,
        dueDate: note,
        // Null until the invoice is paid; a non-nullable shape here used to empty the whole invoice list.
        paidAt: note,
        receipts: z
          .array(
            z.object({
              receiptId: id,
              receiptCode: z.string().catch("—"),
              status: z.string().catch("—"),
              paymentMethod: z.string().catch("—"),
              amount,
              paidAt: note,
              confirmedAt: note,
            }),
          )
          .catch([]),
      }),
    )
    .catch([]),
  financialReport: z
    .object({
      reportCode: z.string().catch("—"),
      totalInvoicedAmount: amount,
      totalPaidAmount: amount,
      totalEmergencyCost: amount,
      outstandingAmount: amount,
      summaryNote: note,
      generatedAt: note,
    })
    .nullish()
    .catch(null),
  emergencyCosts: z
    .array(
      z.object({
        requestCode: z.string().catch("—"),
        incidentCode: note,
        category: z.string().catch("—"),
        approvedAmount: amount,
      }),
    )
    .catch([]),
});
const itemSchema = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") return {};
    const r = raw as Record<string, unknown>;
    return {
      transportId: String(r.transportId ?? r.TransportId ?? r.id ?? r.Id ?? ""),
      transportCode: String(r.transportCode ?? r.TransportCode ?? r.code ?? r.Code ?? "—"),
      bookingId: r.bookingId ?? r.BookingId,
      bookingCode: r.bookingCode ?? r.BookingCode,
      customerName: r.customerName ?? r.CustomerName,
      horseCount: typeof r.horseCount === "number" ? r.horseCount : (typeof r.HorseCount === "number" ? r.HorseCount : undefined),
      completedAt: r.completedAt ?? r.CompletedAt,
      status: String(r.status ?? r.Status ?? "COMPLETED"),
      claimCount: typeof r.claimCount === "number" ? r.claimCount : (typeof r.ClaimCount === "number" ? r.ClaimCount : undefined),
      incidentCount: typeof r.incidentCount === "number" ? r.incidentCount : (typeof r.IncidentCount === "number" ? r.IncidentCount : undefined),
    };
  },
  z.object({
    transportId: z.string(),
    transportCode: z.string(),
    bookingId: z.union([z.string(), z.number()]).optional(),
    bookingCode: z.string().optional(),
    customerName: z.string().optional(),
    horseCount: z.number().optional(),
    completedAt: z.string().nullish(),
    status: z.string(),
    claimCount: z.number().optional(),
    incidentCount: z.number().optional(),
  }),
);

const metaSchema = z.object({
  totalItems: z.number(),
  totalPages: z.number(),
  itemsPerPage: z.number(),
  currentPage: z.number(),
  hasPreviousPage: z.boolean(),
  hasNextPage: z.boolean(),
});

export const archiveResponseSchema: z.ZodType<TransportArchiveResponse> = z.preprocess(
  (raw) => {
    if (!raw || typeof raw !== "object") {
      return {
        items: [],
        meta: {
          totalItems: 0,
          totalPages: 0,
          itemsPerPage: 20,
          currentPage: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    }
    const r = raw as Record<string, unknown>;
    const target = (r.value && typeof r.value === "object" ? r.value : r) as Record<string, unknown>;

    const rawList = Array.isArray(target)
      ? target
      : (target.items ?? target.Items ?? target.data ?? target.Data ?? []);
    const items = Array.isArray(rawList) ? rawList : [];

    const rawMeta = (target.meta ?? target.Meta) as Record<string, unknown> | undefined;
    const totalItems =
      Number(
        rawMeta?.totalItems ??
          target.totalCount ??
          target.TotalCount ??
          target.totalItems ??
          target.TotalItems ??
          items.length,
      ) || 0;
    const itemsPerPage =
      Number(rawMeta?.itemsPerPage ?? target.pageSize ?? target.PageSize ?? 20) || 20;
    const currentPage =
      Number(rawMeta?.currentPage ?? target.pageIndex ?? target.PageIndex ?? 1) || 1;
    const totalPages =
      Number(
        rawMeta?.totalPages ??
          target.totalPages ??
          target.TotalPages ??
          Math.max(1, Math.ceil(totalItems / itemsPerPage)),
      ) || 1;
    const hasPreviousPage = Boolean(
      rawMeta?.hasPreviousPage ?? currentPage > 1,
    );
    const hasNextPage = Boolean(
      rawMeta?.hasNextPage ?? currentPage < totalPages,
    );

    return {
      items,
      meta: {
        totalItems,
        totalPages,
        itemsPerPage,
        currentPage,
        hasPreviousPage,
        hasNextPage,
      },
    };
  },
  z.object({
    items: z.array(itemSchema),
    meta: metaSchema,
  }),
);
export const auditResponseSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const target = (
        obj.value && typeof obj.value === "object" ? obj.value : obj
      ) as Record<string, unknown>;
      const transport = (
        target.transport && typeof target.transport === "object"
          ? target.transport
          : target.Transport && typeof target.Transport === "object"
            ? target.Transport
            : {}
      ) as Record<string, unknown>;
      const rawTimeline = target.timeline ?? target.Timeline ?? [];
      const timeline = Array.isArray(rawTimeline)
        ? rawTimeline.map((item) => {
            if (!item || typeof item !== "object") return item;
            const entry = item as Record<string, unknown>;
            return {
              ...entry,
              // The API contract calls these fields refId/source/at; the UI uses
              // the normalized id/type/occurredAt names.
              id:
                entry.id ??
                entry.Id ??
                entry.refId ??
                entry.RefId ??
                `${String(entry.source ?? entry.Source ?? "EVENT")}-${String(entry.at ?? entry.At ?? "")}`,
              type: entry.type ?? entry.Type ?? entry.source ?? entry.Source,
              occurredAt:
                entry.occurredAt ??
                entry.OccurredAt ??
                entry.at ??
                entry.At,
            };
          })
        : [];
      return {
        transportId:
          target.transportId ??
          target.TransportId ??
          transport.transportId ??
          transport.TransportId,
        transportCode:
          target.transportCode ??
          target.TransportCode ??
          transport.transportCode ??
          transport.TransportCode,
        status:
          target.status ??
          target.Status ??
          transport.status ??
          transport.Status,
        completedAt:
          target.completedAt ??
          target.CompletedAt ??
          transport.completedAt ??
          transport.CompletedAt,
        originCountry:
          target.originCountry ??
          target.OriginCountry ??
          transport.originCountry ??
          transport.OriginCountry,
        destinationCountry:
          target.destinationCountry ??
          target.DestinationCountry ??
          transport.destinationCountry ??
          transport.DestinationCountry,
        viewMode: target.viewMode ?? target.ViewMode,
        booking: target.booking ?? target.Booking,
        horses: target.horses ?? target.Horses,
        routing: target.routing ?? target.Routing,
        compliance: target.compliance ?? target.Compliance,
        operations: target.operations ?? target.Operations,
        finance: target.finance ?? target.Finance,
        epod: target.epod ?? target.Epod,
        ...transport,
        ...target,
        // After the spreads on purpose: `...target` carries the raw timeline (at/source/refId, no id), which would replace the
        // normalized one, fail validation, and silently turn the whole timeline into [].
        timeline,
      };
    }
    return raw;
  },
  z
    .object({
      transportId: z.union([z.string(), z.number()]).catch(""),
      transportCode: z.string().catch("—"),
      status: z.string().catch("UNKNOWN"),
      timeline: z.array(auditTimelineItemSchema).catch([]),
      completedAt: z.string().nullish(),
      originCountry: z.string().optional(),
      destinationCountry: z.string().optional(),
      viewMode: z.enum(["FULL", "CUSTOMER"]).optional(),
      booking: auditBookingSchema.optional(),
      horses: auditHorsesSchema.optional(),
      routing: auditRoutingSchema.optional(),
      compliance: auditComplianceSchema.optional(),
      operations: auditOperationsSchema.optional(),
      finance: auditFinanceSchema.optional(),
    })
    .passthrough(),
);
export const exportJobSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if ("value" in obj && obj.value !== undefined && obj.value !== null) {
        return obj.value;
      }
    }
    return raw;
  },
  z.object({
    exportId: z.string(),
    status: z.enum(["QUEUED", "PROCESSING", "READY", "FAILED", "EXPIRED"]),
    progress: z.number().optional(),
    downloadUrl: z.string().nullish(),
    sizeBytes: z.number().nullish(),
    sha256: z.string().nullish(),
    delivery: z.enum(["DIRECT", "EMAIL"]).optional(),
    errorMessage: z.string().nullish(),
  }),
);
