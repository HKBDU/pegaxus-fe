import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { bookingService } from "@/features/booking/services"
import { dossierService } from "@/features/compliance-catalog/dossier-services"
import type { CreateDossierInput } from "@/features/compliance-catalog/dossier-types"
import { templateService } from "@/features/compliance-catalog/template-services"
import type { DossierTemplateListParams } from "@/features/compliance-catalog/template-types"
import type { EntityId } from "@/shared/types"

export const applyKeys = {
  all: ["apply-dossier"] as const,
  booking: (bookingId: EntityId) => [...applyKeys.all, "booking", String(bookingId)] as const,
  existing: (bookingId: EntityId) => [...applyKeys.all, "existing", String(bookingId)] as const,
  templates: (params: DossierTemplateListParams) => [...applyKeys.all, "templates", params] as const,
}

/** The booking the dossier is created for: only its header data and horses are read. */
export function useBookingForDossier(bookingId: EntityId | undefined) {
  return useQuery({
    queryKey: applyKeys.booking(bookingId ?? ""),
    queryFn: () => bookingService.getBooking(bookingId as EntityId),
    enabled: bookingId !== undefined && String(bookingId).length > 0,
  })
}

/** D1: decides between the wizard and "a dossier already exists" (UC-18 EXC-02). */
export function useExistingDossier(bookingId: EntityId | undefined) {
  return useQuery({
    queryKey: applyKeys.existing(bookingId ?? ""),
    queryFn: () => dossierService.getDossierOfBooking(bookingId as EntityId),
    // D1 answers 200 with complianceDossierId: null while no dossier exists; only a real id means "already exists".
    select: (dossier) => (dossier?.complianceDossierId ? dossier : null),
    enabled: bookingId !== undefined && String(bookingId).length > 0,
    staleTime: 0,
  })
}

/** T1 in recommendation mode (the params carry the bookingId). */
export function useRecommendedTemplates(params: DossierTemplateListParams) {
  return useQuery({
    queryKey: applyKeys.templates(params),
    queryFn: () => templateService.getTemplates(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateDossier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateDossierInput) => dossierService.createDossier(input),
    onSuccess: (_, input) => void queryClient.invalidateQueries({ queryKey: applyKeys.existing(input.bookingId) }),
  })
}
