import { z } from "zod";
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
const itemSchema = z.object({
  transportId: z.union([z.string(), z.number()]),
  transportCode: z.string(),
  bookingId: z.union([z.string(), z.number()]).optional(),
  bookingCode: z.string().optional(),
  customerName: z.string().optional(),
  horseCount: z.number().optional(),
  completedAt: z.string().nullish(),
  status: z.string(),
  claimCount: z.number().optional(),
  incidentCount: z.number().optional(),
});
const metaSchema = z.object({
  totalItems: z.number().catch(0),
  totalPages: z.number().catch(0),
  itemsPerPage: z.number().catch(20),
  currentPage: z.number().catch(1),
  hasPreviousPage: z.boolean().catch(false),
  hasNextPage: z.boolean().catch(false),
});
export const archiveResponseSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if ("value" in obj && obj.value !== undefined && obj.value !== null) {
        return obj.value;
      }
    }
    return raw;
  },
  z
    .object({ items: z.array(itemSchema).catch([]), meta: metaSchema })
    .or(
      z
        .object({ data: z.array(itemSchema).catch([]), meta: metaSchema })
        .transform(({ data, meta }) => ({ items: data, meta })),
    ),
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
          : {}
      ) as Record<string, unknown>;
      return {
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
