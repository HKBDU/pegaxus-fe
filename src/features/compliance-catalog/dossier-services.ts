import { bookingService } from "@/features/booking/services"
import { z } from "zod"
import { approvedBookingDetailSchema } from "@/features/transport-plan/schemas"
import { api, ComplianceApiError, useComplianceMocks, useFlow2HttpMocks, wait } from "@/features/compliance-catalog/services"
import type {
  ApplyBooking,
  ComplianceDossierSummary,
  CreateDossierInput,
  CreateDossierResult,
  CustomRequirementDraft,
} from "@/features/compliance-catalog/dossier-types"
import { templateService } from "@/features/compliance-catalog/template-services"
import type { EntityId } from "@/shared/types"

/** Mock state: booking 1017 already has a dossier, so EXC-02 can be tried. */
const mockDossiers = new Map<string, ComplianceDossierSummary>([
  ["1017", { complianceDossierId: 500, dossierCode: "CD-20260910-1204", status: "IN_PREPARATION", dossierType: "MAIN" }],
])

const toDossierRequirementBody = (draft: CustomRequirementDraft) => ({
  complianceRequirementId: draft.complianceRequirementId,
  horseId: draft.horseId,
  isMandatory: draft.isMandatory,
  dueDate: draft.dueDate || undefined,
  instruction: draft.instruction || undefined,
})

const createdDossierEnvelopeSchema = z.object({
  isSuccess: z.literal(true),
  code: z.number().int().min(200).max(299),
  message: z.string(),
  value: z.object({
    complianceDossierId: z.union([z.string().min(1), z.number().int().positive()]),
    dossierCode: z.string().min(1),
    dossierType: z.string().nullish(),
    status: z.string().optional().default("DRAFT"),
    generatedRequirementCount: z.number().int().nonnegative().optional(),
    requirements: z.array(z.object({ dossierRequirementId: z.union([z.string(), z.number()]) })).optional(),
  }),
});

function isNotFound(error: unknown) {
  if (error instanceof ComplianceApiError) return error.message === "NOT_FOUND"
  return (error as { response?: { status?: number } })?.response?.status === 404
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const dossierSummarySchema = z.object({
  complianceDossierId: z.union([
    z.string().min(1),
    z.number().int().positive(),
  ]),
  dossierCode: z.string().min(1),
  status: z.string().min(1),
  dossierType: z.enum(["MAIN", "EXTRA"]).nullish(),
});

function toSummary(value: unknown): ComplianceDossierSummary | null {
  if (
    !isRecord(value) ||
    value.complianceDossierId === null ||
    value.complianceDossierId === undefined ||
    value.complianceDossierId === ""
  )
    return null;
  return dossierSummarySchema.parse(value);
}

/**
 * D1 for a booking whose transport can hold a MAIN and an EXTRA dossier. The BE answers the MAIN overview plus a
 * `complianceDossiers[]` summary list; the contract (flow4.md X10) shows `{ items: [] }`. Both are read, and the MAIN
 * dossier wins (the first one when no type is sent). null = nothing initialised yet (complianceDossierId: null).
 */
export function pickMainDossier(
  payload: unknown,
): ComplianceDossierSummary | null {
  const body = z
    .object({
      isSuccess: z.literal(true),
      code: z.number().int().min(200).max(299),
      value: z.record(z.string(), z.unknown()),
    })
    .parse(payload).value;
  if (!isRecord(body)) return null;

  const list = z
    .array(dossierSummarySchema)
    .parse(body.complianceDossiers ?? body.items ?? []);
  const current = toSummary(body);
  if (
    !current &&
    !list.length &&
    body.isInitialized !== false &&
    body.items === undefined &&
    body.complianceDossiers === undefined
  )
    throw new ComplianceApiError("DOSSIER_RESPONSE_INVALID");
  const candidates = [current, ...list].filter(
    (item): item is ComplianceDossierSummary => item !== null,
  );
  return (
    candidates.find((item) => item.dossierType === "MAIN") ??
    candidates[0] ??
    null
  );
}

export const dossierService = {
  /**
   * Booking of the apply wizard. GET /bookings/{id} (Flow 1) only answers the owner and the manager, so the Transport
   * Specialist would get a 404; AB2 (GET /bookings/approved/{id}) is scoped to the assigned staff instead.
   */
  async getBookingForApply(bookingId: EntityId): Promise<ApplyBooking> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      const booking = await bookingService.getBooking(bookingId)
      return {
        bookingId: booking.bookingId,
        bookingCode: booking.bookingCode,
        status: booking.status,
        originCountry: booking.originCountry,
        destinationCountry: booking.destinationCountry,
        transportId: booking.transport?.transportId ?? null,
        customer: booking.customer,
        horses: booking.horses,
      }
    }
    const payload = await api.get<unknown>(`bookings/approved/${bookingId}`)
    const booking = z.object({ isSuccess: z.literal(true), code: z.number().int().min(200).max(299), value: approvedBookingDetailSchema }).parse(payload).value
    return {
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      status: booking.status,
      originCountry: booking.originCountry,
      destinationCountry: booking.destinationCountry,
      transportId: booking.transport?.transportId ?? null,
      customer: { fullName: booking.customer.fullName },
      horses: booking.horses.map((horse) => ({ horseId: horse.horseId, horseName: horse.horseName })),
    }
  },

  /**
   * D7 (GET /compliance-dossiers/{id}) has no booking schedule, so the departure date used to compute a requirement's
   * lead time comes from AB2 (scoped to the assigned staff). null when it is not available.
   */
  async getRequestedDepartureDate(bookingId: EntityId): Promise<string | null> {
    if (useComplianceMocks && !useFlow2HttpMocks) return null
    const payload = await api.get<{ value?: { requestedDepartureDate?: string | null } } & { requestedDepartureDate?: string | null }>(`bookings/approved/${bookingId}`)
    return (payload.value ?? payload).requestedDepartureDate?.slice(0, 10) ?? null
  },

  /** D1: null when the booking has no dossier yet (404, or 200 with complianceDossierId: null). */
  async getDossierOfBooking(bookingId: EntityId): Promise<ComplianceDossierSummary | null> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(120)
      return mockDossiers.get(String(bookingId)) ?? null
    }
    try {
      const payload = await api.get<unknown>(`bookings/${bookingId}/compliance-dossier`)
      return pickMainDossier(payload)
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  },

  /** D2 receives requirement items; D3 retains individually scoped custom additions. */
  async createDossier(input: CreateDossierInput): Promise<CreateDossierResult> {
    const {
      bookingId,
      dossierTemplateId,
      selectedTemplateItemIds,
      customRequirements,
    } = input;
    const fromTemplate = dossierTemplateId !== undefined;

    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(400);
      const booking = await bookingService.getBooking(bookingId);
      if (booking.status !== "APPROVED")
        throw new ComplianceApiError("BOOKING_NOT_APPROVED");
      if (mockDossiers.has(String(bookingId)))
        throw new ComplianceApiError("DOSSIER_ALREADY_EXISTS");
      if (!fromTemplate && !customRequirements.length)
        throw new ComplianceApiError("TEMPLATE_OR_MANUAL_REQUIRED");

      let generated = customRequirements.length;
      if (fromTemplate) {
        const template = await templateService.getTemplate(dossierTemplateId);
        const chosen = template.items.filter((item) =>
          selectedTemplateItemIds.some(
            (id) =>
              String(id) ===
              String(item.dossierTemplateItemId ?? `seq-${item.sequenceNo}`),
          ),
        );
        if (!chosen.length)
          throw new ComplianceApiError("TEMPLATE_ITEM_INVALID");
        generated += chosen.reduce(
          (sum, item) =>
            sum + (item.appliesPerHorse ? booking.horses.length : 1),
          0,
        );
      }

      const complianceDossierId = 501 + mockDossiers.size;
      const dossier: ComplianceDossierSummary = {
        complianceDossierId,
        dossierCode: `CD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${7000 + mockDossiers.size}`,
        status: "DRAFT",
        dossierType: "MAIN",
      };
      mockDossiers.set(String(bookingId), dossier);
      return {
        ...dossier,
        generatedRequirementCount: generated,
        failedCustomCount: 0,
      };
    }

    // D2 takes the lines as items[] (the BE has no manualRequirements). With a template the items are the ticked template lines
    // (custom lines are added afterwards with D3); without one they are the custom lines. horseId and dueDate cannot be sent here.
    const items = (fromTemplate
      ? (input.initializationItems ?? [])
      : customRequirements.map((item) => ({
        complianceRequirementId: item.complianceRequirementId,
        isMandatory: item.isMandatory,
        appliesPerHorse: false,
        instruction: item.instruction ?? null,
      }))
    ).map((item) => ({
      complianceRequirementId: String(item.complianceRequirementId),
      isMandatory: Boolean(item.isMandatory),
      appliesPerHorse: Boolean(item.appliesPerHorse),
      instruction: item.instruction || undefined,
    }));

    // items wins over selectedTemplateItemIds when both are sent, and an empty items[] is rejected, so send only one of them.
    const body = {
      ...(fromTemplate ? { dossierTemplateId: String(dossierTemplateId) } : {}),
      ...(items.length ? { items } : fromTemplate && selectedTemplateItemIds?.length ? { selectedTemplateItemIds } : {}),
    };

    let payload: unknown;
    try {
      payload = await api.post<unknown>(
        `bookings/${bookingId}/compliance-dossier`,
        body,
      );
    } catch (error) {
      const failure = error as {
        response?: { status?: number };
        cause?: { response?: { status?: number } };
      };
      const status =
        failure.response?.status ?? failure.cause?.response?.status;
      if (status === undefined || status >= 500)
        throw new ComplianceApiError("DOSSIER_CREATE_OUTCOME_UNKNOWN", {
          cause: error,
          backendMessage:
            "The creation outcome is unknown. Do not submit again; reload and check whether the dossier was created.",
        });
      throw error;
    }
    const parsed = createdDossierEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ComplianceApiError("DOSSIER_CREATE_OUTCOME_UNKNOWN", {
        backendMessage:
          "The creation response cannot be verified. Do not submit again; reload and check the dossier.",
      });
    }
    const created = parsed.data.value;

    let failedCustomCount = 0;
    let addedCustom = 0;
    if (fromTemplate) {
      for (const draft of customRequirements) {
        try {
          const added = await api.post<unknown>(
            `compliance-dossiers/${created.complianceDossierId}/requirements`,
            toDossierRequirementBody(draft),
          );
          z.object({
            isSuccess: z.literal(true),
            code: z.literal(201),
            value: z.object({ dossierRequirementId: z.string().min(1) }),
          }).parse(added);
          addedCustom += 1;
        } catch {
          failedCustomCount += 1;
        }
      }
    }
    const generatedCount =
      (created.generatedRequirementCount ??
        created.requirements?.length ??
        items.length) + addedCustom;
    return {
      complianceDossierId: created.complianceDossierId,
      dossierCode: created.dossierCode,
      status: created.status ?? "DRAFT",
      dossierType: created.dossierType as any,
      generatedRequirementCount: generatedCount,
      failedCustomCount,
    };
  },
};
