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
export const auditHorseVitalLogSchema = z.object({
  logId: id,
  recordedAt: z.string(),
  locationName: z.string().optional(),
  temperatureCelsius: amount,
  heartRateBpm: amount,
  respirationRate: amount.optional(),
  stressLevel: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).catch("NORMAL"),
  isAbnormal: z.boolean().optional(),
  notes: z.string().optional(),
  veterinarianName: z.string().optional(),
});
export const auditHorsesSchema = z.object({
  horses: z
    .array(
      z.object({
        horseId: id,
        horseName: z.string(),
        microchipNumber: z.string(),
        passportNumber: z.string(),
        breed: z.string().optional(),
        gender: z.string().optional(),
        yearOfBirth: z.number().optional(),
        weightKg: amount.optional(),
        declaredValue: amount.optional(),
        healthLogs: z.array(auditHorseVitalLogSchema).catch([]),
      }),
    )
    .catch([]),
});
export const auditRoutingSchema = z.object({
  routePlanId: z.string().optional(),
  routePlanCode: z.string().optional(),
  totalDistanceKm: amount.optional(),
  totalDurationHours: amount.optional(),
  legs: z
    .array(
      z.object({
        legId: id,
        legOrder: z.number(),
        legType: z.enum([
          "ROAD_DOMESTIC",
          "FERRY",
          "CHUNNEL",
          "ROAD_INTERNATIONAL",
        ]),
        fromLocation: z.string(),
        toLocation: z.string(),
        plannedDepartureAt: z.string().optional(),
        actualDepartureAt: z.string().optional(),
        plannedArrivalAt: z.string().optional(),
        actualArrivalAt: z.string().optional(),
        truckPlate: z.string().optional(),
        trailerPlate: z.string().optional(),
        driverName: z.string().optional(),
        driverLicense: z.string().optional(),
        isOutsourced: z.boolean().catch(false),
        subcontractorName: z.string().optional(),
        outsourcingCost: amount.optional(),
      }),
    )
    .catch([]),
});
export const auditComplianceSchema = z.object({
  dossiers: z
    .array(
      z.object({
        dossierId: id,
        dossierCode: z.string(),
        type: z.enum(["MAIN", "EXTRA"]),
        status: z.string(),
        documents: z
          .array(
            z.object({
              documentId: id,
              documentType: z.string(),
              title: z.string(),
              version: z.number().optional(),
              verifiedAt: z.string().optional(),
              status: z.enum(["APPROVED", "PENDING", "REJECTED"]),
              fileUrl: z.string().optional(),
            }),
          )
          .catch([]),
      }),
    )
    .catch([]),
  customsClearance: z
    .object({
      mrnNumber: z.string(),
      clearedAt: z.string().optional(),
      borderControlPostName: z.string().optional(),
      inspectionType: z.enum(["PHYSICAL", "DOCUMENTARY", "EXEMPT"]).optional(),
      status: z.string(),
      proofUrl: z.string().optional(),
    })
    .optional(),
  veterinarianNotes: z.string().optional(),
});
export const auditOperationsSchema = z.object({
  handovers: z
    .array(
      z.object({
        handoverRecordId: id,
        handoverCode: z.string(),
        handoverType: z.enum(["PICKUP", "TRANSIT", "DELIVERY"]),
        status: z.string(),
        completedAt: z.string(),
        handedOverBy: z.string().optional(),
        receivedBy: z.string().optional(),
        digitalSignatureVerified: z.boolean().catch(false),
        downloadUrl: z.string().optional(),
      }),
    )
    .catch([]),
  incidents: z
    .array(
      z.object({
        incidentReportId: id,
        incidentCode: z.string(),
        category: z.string(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED"]),
        occurredAt: z.string(),
        location: z.string().optional(),
        summary: z.string(),
        resolutionNotes: z.string().optional(),
      }),
    )
    .catch([]),
});
export const auditFinanceSchema = z.object({
  invoices: z
    .array(
      z.object({
        invoiceId: id,
        invoiceNumber: z.string(),
        type: z.string(),
        status: z.string(),
        totalAmount: amount,
        currency: z.string().catch("VND"),
        issuedAt: z.string().optional(),
        paidAt: z.string().optional(),
      }),
    )
    .catch([]),
  emergencyExpenses: z
    .array(
      z.object({
        expenseId: id,
        expenseCode: z.string(),
        category: z.string(),
        amount,
        currency: z.string().catch("VND"),
        reason: z.string(),
        approvedAt: z.string().optional(),
        approvedBy: z.string().optional(),
      }),
    )
    .optional(),
  summary: z
    .object({
      baseFareAmount: amount,
      ferryChunnelFee: amount,
      bcpQuarantineFee: amount,
      insuranceFee: amount,
      emergencyCost: amount,
      totalPaidAmount: amount,
      currency: z.string().catch("VND"),
    })
    .optional(),
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
        timeline: target.timeline ?? target.Timeline ?? [],
        booking: target.booking ?? target.Booking,
        horses: target.horses ?? target.Horses,
        routing: target.routing ?? target.Routing,
        compliance: target.compliance ?? target.Compliance,
        operations: target.operations ?? target.Operations,
        finance: target.finance ?? target.Finance,
        epod: target.epod ?? target.Epod,
        ...transport,
        ...target,
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
