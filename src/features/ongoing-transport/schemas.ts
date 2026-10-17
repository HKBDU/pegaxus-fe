import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  DEFAULT_STATUS_FILTER,
  ONGOING_TRANSPORT_STATUSES,
  ROUTE_TYPES,
  SEGMENT_STATUSES,
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

export const ongoingTransportQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  status: statusFilterSchema.default(DEFAULT_STATUS_FILTER),
  hasActiveIncident: z.boolean().optional(),
  pageIndex: z.number().int().nonnegative().default(0),
  pageSize: z.number().int().positive().default(DEFAULT_PAGE_SIZE),
  sortBy: ongoingTransportSortSchema.default(DEFAULT_SORT),
});

export const ongoingTransportItemSchema = z.object({
  transportId: z.string(),
  transportCode: z.string(),
  bookingId: z.string(),
  bookingCode: z.string(),
  customerName: z.string(),
  status: ongoingTransportStatusSchema,
  routeType: z.enum(ROUTE_TYPES),
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
  departureAt: timestampSchema,
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
