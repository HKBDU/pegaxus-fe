import type { z } from "zod";
import type {
  approvedBookingDetailSchema,
  approvedBookingListItemSchema,
  approvedBookingsQuerySchema,
  approvedBookingsPageSchema,
  createTransportPlanSchema,
  updateTransportPlanSchema,
  employeeBriefSchema,
  transportPlanDetailSchema,
  transportPlanListItemSchema,
  transportPlanQuotationSchema,
  transportPlansQuerySchema,
  transportPlanStatusSchema,
  transportPlanFormSchema,
} from "./schemas";

export type ApprovedBookingsQueryParams = z.input<
  typeof approvedBookingsQuerySchema
>;
export type ApprovedBookingsPageValue = z.infer<
  typeof approvedBookingsPageSchema
>;
export type ApprovedBookingListItem = z.infer<
  typeof approvedBookingListItemSchema
>;
export type ApprovedBookingDetail = z.infer<typeof approvedBookingDetailSchema>;

export type TransportPlanStatus = z.infer<typeof transportPlanStatusSchema>;
export type TransportPlansQueryParams = z.input<
  typeof transportPlansQuerySchema
>;
export type TransportPlanListItem = z.infer<typeof transportPlanListItemSchema>;
export type TransportPlanDetail = z.infer<typeof transportPlanDetailSchema>;
export type TransportPlanQuotation = z.infer<
  typeof transportPlanQuotationSchema
>;
export type EmployeeBrief = z.infer<typeof employeeBriefSchema>;
export type CreateTransportPlanInput = z.infer<
  typeof createTransportPlanSchema
>;
export type UpdateTransportPlanInput = z.infer<
  typeof updateTransportPlanSchema
>;
export type TransportPlanFormValues = z.infer<typeof transportPlanFormSchema>;

export type BookingTransportPlanContext = {
  bookingId: string;
  status: string;
  transport: { transportId: string } | null;
  transportPlan: { transportPlanId: string } | null;
};

export type ApprovedBookingAction = {
  kind:
    | "createTransportPlan"
    | "viewTransportPlan"
    | "editTransportPlan"
    | "managePersonnel"
    | "createRoutePlan"
    | "viewRoutePlan"
    | "applyDossierTemplate"
    | "viewComplianceDossier"
    | "viewDossierRequirements";
  label: string;
  targetId: string;
  href?: string;
  bookingId?: string;
  transportId?: string;
  blockedReason?: string;
};
