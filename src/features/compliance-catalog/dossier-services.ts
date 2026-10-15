import { bookingService } from "@/features/booking/services"
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
  ["1017", { complianceDossierId: 500, dossierCode: "CD-20260910-1204", status: "IN_PREPARATION" }],
])

const toDossierRequirementBody = (draft: CustomRequirementDraft) => ({
  complianceRequirementId: draft.complianceRequirementId,
  horseId: draft.horseId,
  isMandatory: draft.isMandatory,
  dueDate: draft.dueDate || undefined,
  instruction: draft.instruction || undefined,
})

function isNotFound(error: unknown) {
  if (error instanceof ComplianceApiError) return error.message === "NOT_FOUND"
  return (error as { response?: { status?: number } })?.response?.status === 404
}

interface ApprovedBookingPayload {
  bookingId: EntityId
  bookingCode: string
  status: ApplyBooking["status"]
  originCountry: string
  destinationCountry: string
  customer?: { fullName: string }
  customerName?: string
  horses?: { horseId: EntityId; horseName: string }[]
}

export const dossierService = {
  /**
   * Booking of the apply wizard. GET /bookings/{id} (Flow 1) only answers the owner and the manager, so the Transport
   * Specialist would get a 404; AB2 (GET /bookings/approved/{id}) is scoped to the assigned staff instead.
   */
  async getBookingForApply(bookingId: EntityId): Promise<ApplyBooking> {
    if (useComplianceMocks && !useFlow2HttpMocks) return bookingService.getBooking(bookingId)
    const payload = await api.get<{ value?: ApprovedBookingPayload } & Partial<ApprovedBookingPayload>>(`bookings/approved/${bookingId}`)
    const booking = (payload.value ?? payload) as ApprovedBookingPayload
    return {
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,
      status: booking.status,
      originCountry: booking.originCountry,
      destinationCountry: booking.destinationCountry,
      customer: { fullName: booking.customer?.fullName ?? booking.customerName ?? "—" },
      horses: (booking.horses ?? []).map((horse) => ({ horseId: horse.horseId, horseName: horse.horseName })),
    }
  },

  /** D1: null when the booking has no dossier yet (the BE answers 404). */
  async getDossierOfBooking(bookingId: EntityId): Promise<ComplianceDossierSummary | null> {
    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(120)
      return mockDossiers.get(String(bookingId)) ?? null
    }
    try {
      const payload = await api.get<{ value?: ComplianceDossierSummary } & Partial<ComplianceDossierSummary>>(`bookings/${bookingId}/compliance-dossier`)
      return (payload.value ?? payload) as ComplianceDossierSummary
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  },

  /** D2, plus D3 for the custom lines when a template is used (D2 cannot carry both, see the contract). */
  async createDossier(input: CreateDossierInput): Promise<CreateDossierResult> {
    const { bookingId, dossierTemplateId, selectedTemplateItemIds, customRequirements } = input
    const fromTemplate = dossierTemplateId !== undefined

    if (useComplianceMocks && !useFlow2HttpMocks) {
      await wait(400)
      const booking = await bookingService.getBooking(bookingId)
      if (booking.status !== "APPROVED") throw new ComplianceApiError("BOOKING_NOT_APPROVED")
      if (mockDossiers.has(String(bookingId))) throw new ComplianceApiError("DOSSIER_ALREADY_EXISTS")
      if (!fromTemplate && !customRequirements.length) throw new ComplianceApiError("TEMPLATE_OR_MANUAL_REQUIRED")

      let generated = customRequirements.length
      if (fromTemplate) {
        const template = await templateService.getTemplate(dossierTemplateId)
        const chosen = template.items.filter((item) => selectedTemplateItemIds.some((id) => String(id) === String(item.dossierTemplateItemId)))
        if (!chosen.length) throw new ComplianceApiError("TEMPLATE_ITEM_INVALID")
        generated += chosen.reduce((sum, item) => sum + (item.appliesPerHorse ? booking.horses.length : 1), 0)
      }

      const complianceDossierId = 501 + mockDossiers.size
      const dossier = { complianceDossierId, dossierCode: `CD-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${7000 + mockDossiers.size}`, status: "IN_PREPARATION" }
      mockDossiers.set(String(bookingId), dossier)
      return { ...dossier, generatedRequirementCount: generated, failedCustomCount: 0 }
    }

    const body = fromTemplate
      ? { dossierTemplateId, selectedTemplateItemIds }
      : { manualRequirements: customRequirements.map(toDossierRequirementBody) }
    const payload = await api.post<unknown>(`bookings/${bookingId}/compliance-dossier`, body)
    const envelope = payload as { value?: unknown; data?: { value?: unknown } }
    const created = (envelope.value ?? envelope.data?.value ?? payload) as Partial<CreateDossierResult>
    if (!created.complianceDossierId) throw new ComplianceApiError("DOSSIER_CREATE_RESPONSE_INVALID")

    let failedCustomCount = 0
    let addedCustom = 0
    if (fromTemplate) {
      for (const draft of customRequirements) {
        try {
          await api.post(`compliance-dossiers/${created.complianceDossierId}/requirements`, toDossierRequirementBody(draft))
          addedCustom += 1
        } catch {
          failedCustomCount += 1
        }
      }
    }
    return {
      ...created,
      generatedRequirementCount: (created.generatedRequirementCount ?? 0) + addedCustom,
      failedCustomCount,
    } as CreateDossierResult
  },
}
