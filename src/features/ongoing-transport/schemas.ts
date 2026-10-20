import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  DEFAULT_STATUS_FILTER,
  ONGOING_TRANSPORT_STATUSES,
  ROUTE_TYPES,
  SEGMENT_STATUSES,
  INCIDENT_CATEGORIES,
  DOSSIER_STATUSES,
} from "./constants";

export const ongoingTransportStatusSchema = z.enum(ONGOING_TRANSPORT_STATUSES);
export const ongoingTransportSortSchema = z.enum([
  "departureAt:asc",
  "departureAt:desc",
  "transportCode:asc",
]);
const timestampSchema = z.iso.datetime({ offset: true });
const statusFilterSchema = z
  .string()
  .refine((value) => {
    const values = value.split(",");
    return (
      values.length > 0 &&
      values.every(
        (status) => ongoingTransportStatusSchema.safeParse(status).success,
      )
    );
  }, "Select at least one supported transport status.")
  .transform((value) =>
    ONGOING_TRANSPORT_STATUSES.filter((status) =>
      value.split(",").includes(status),
    ).join(","),
  );

export const ongoingTransportQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .transform((value) => value || undefined)
      .optional(),
    status: statusFilterSchema.default(DEFAULT_STATUS_FILTER),
    hasActiveIncident: z.boolean().optional(),
    pageIndex: z.number().int().nonnegative().default(0),
    pageSize: z.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
    sortBy: ongoingTransportSortSchema.default(DEFAULT_SORT),
  })
  .refine((params) => params.pageIndex * params.pageSize <= 2_147_483_647, {
    path: ["pageIndex"],
    message: "The requested page is too large.",
  });

export const ongoingTransportItemSchema = z.object({
  transportId: z.string(),
  transportCode: z.string(),
  bookingId: z.string(),
  bookingCode: z.string(),
  customerName: z.string(),
  status: ongoingTransportStatusSchema,
  routeType: z.enum(ROUTE_TYPES).nullable(),
  currentSegment: z
    .object({
      routePlanRouteId: z.string(),
      displayOrder: z.number().int().positive(),
      fromLocationName: z.string(),
      toLocationName: z.string(),
      status: z.enum(SEGMENT_STATUSES),
    })
    .nullable(),
  horseCount: z.number().int().nonnegative(),
  activeIncidentCount: z.number().int().nonnegative(),
  departureAt: timestampSchema.nullable(),
});

export const ongoingTransportPageSchema = z.object({
  serverTime: timestampSchema,
  items: z.array(ongoingTransportItemSchema),
  pageIndex: z.number().int().nonnegative(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const ongoingTransportEnvelopeSchema = z.object({
  isSuccess: z.boolean(),
  code: z.number(),
  message: z.string(),
  errorCode: z.string().nullish(),
  errors: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .nullish(),
  value: z.unknown(),
});

const locationBriefSchema = z.object({
  locationId: z.string(),
  locationName: z.string(),
  locationType: z
    .enum([
      "CITY",
      "BORDER_GATE",
      "AIRPORT",
      "SEAPORT",
      "STABLE",
      "REST_STOP",
      "OTHER",
    ])
    .nullable(),
  city: z.string().nullable(),
  country: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

const crewMemberSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  role: z.enum(["DRIVER", "ESCORT"]),
  phone: z.string().nullable(),
});

export const trackingSegmentSchema = z.object({
  routePlanRouteId: z.string(),
  routePlanId: z.string(),
  routePlanCode: z.string(),
  sequenceNo: z.number().int(),
  displayOrder: z.number().int().positive(),
  routeType: z.enum(ROUTE_TYPES),
  transportMode: z.enum(["ROAD", "SEA", "AIR"]),
  fromLocation: locationBriefSchema,
  toLocation: locationBriefSchema,
  distanceKm: z.number().nullable(),
  status: z.enum(SEGMENT_STATUSES),
  isCurrent: z.boolean(),
  plannedDepartureAt: timestampSchema.nullable(),
  plannedArrivalAt: timestampSchema.nullable(),
  actualDepartureAt: timestampSchema.nullable(),
  actualArrivalAt: timestampSchema.nullable(),
  driver: crewMemberSchema.nullable(),
  escort: crewMemberSchema.nullable(),
  isOutsourced: z.boolean(),
  provider: z
    .object({
      transportProviderId: z.string(),
      providerName: z.string(),
      serviceType: z.string().nullable(),
      providerReference: z.string().nullable(),
    })
    .nullable(),
  vehicles: z.array(
    z.object({
      vehicleId: z.string(),
      vehicleCode: z.string(),
      licensePlate: z.string().nullable(),
    }),
  ),
  note: z.string().nullable(),
  updatedAt: timestampSchema,
});

export const transportOverviewSchema = z.object({
  serverTime: timestampSchema,
  transport: z.object({
    transportId: z.string(),
    transportCode: z.string(),
    status: ongoingTransportStatusSchema,
    actualDepartureAt: timestampSchema.nullable(),
    actualArrivalAt: timestampSchema.nullable(),
    completedAt: timestampSchema.nullable(),
  }),
  booking: z.object({
    bookingId: z.string(),
    bookingCode: z.string(),
    customerName: z.string(),
    originAddress: z.string(),
    originCountry: z.string(),
    destinationAddress: z.string(),
    destinationCountry: z.string(),
  }),
  routeType: z.enum(ROUTE_TYPES).nullable(),
  routePlan: z
    .object({
      routePlanId: z.string(),
      routePlanCode: z.string(),
      status: z.enum([
        "DRAFT",
        "CONFIRMED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
        "PENDING_LEGAL_REVIEW",
        "PENDING_MANAGER_APPROVAL",
        "REJECTED_BY_MANAGER",
        "APPROVED",
      ]),
    })
    .nullable(),
  currentSegment: trackingSegmentSchema.nullable(),
  totalSegments: z.number().int().nonnegative(),
  completedSegments: z.number().int().nonnegative(),
  departureAt: timestampSchema.nullable(),
  etaAt: timestampSchema.nullable(),
  horseCount: z.number().int().nonnegative(),
  horseHealthSummary: z.object({
    total: z.number().int().nonnegative(),
    normal: z.number().int().nonnegative(),
    observationRequired: z.number().int().nonnegative(),
    atRisk: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
    noData: z.number().int().nonnegative(),
  }),
  complianceDossiers: z.array(
    z.object({
      complianceDossierId: z.string(),
      dossierCode: z.string(),
      dossierType: z.enum(["MAIN", "EXTRA"]).nullable(),
      status: z.enum(DOSSIER_STATUSES),
    }),
  ),
  activeIncidents: z.array(
    z.object({
      incidentReportId: z.string(),
      incidentCode: z.string(),
      category: z.enum(INCIDENT_CATEGORIES),
      status: z.enum(["REPORTED", "PENDING"]),
      title: z.string(),
      occurredAt: timestampSchema,
      severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      description: z.string().optional(),
    }),
  ),
  canViewGpsTab: z.boolean(),
});

export const ongoingListReturnSchema = z.object({
  params: ongoingTransportQuerySchema,
  scenario: z.enum(["data", "empty", "api-error", "network-error"]),
});

export const handoverBoundarySchema = z.object({
  boundaryNo: z.number().int().positive(),
  fromRoutePlanRouteId: z.string().nullable(),
  toRoutePlanRouteId: z.string().nullable(),
  location: z.object({
    locationName: z.string(),
    address: z.string().nullable(),
    country: z.string(),
  }),
  // These are server capabilities. Keep unrecognized values visible, but never turn them into actions.
  allowedHandoverTypes: z.array(z.string()),
  existingHandover: z
    .object({
      handoverRecordId: z.string(),
      handoverCode: z.string(),
      handoverType: z.string(),
      status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
    })
    .nullable(),
  canCreate: z.boolean(),
  handoverRequired: z.boolean().optional(),
  arrivalAt: timestampSchema.nullable().optional(),
  createModes: z.array(z.string()).optional(),
});

export const transportSegmentsSchema = z.object({
  serverTime: timestampSchema,
  transportId: z.string(),
  transportStatus: ongoingTransportStatusSchema,
  segments: z.array(trackingSegmentSchema),
  handoverBoundaries: z.array(handoverBoundarySchema),
});
