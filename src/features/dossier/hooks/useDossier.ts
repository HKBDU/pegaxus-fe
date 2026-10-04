import { useMutation, useQuery } from "@tanstack/react-query"

import { dossierService } from "@/features/dossier/services"
import type { AuditParams, DashboardParams, DossierRequirementsParams, ExportFormat } from "@/features/dossier/types"
import type { EntityId } from "@/shared/types"
import { dossierIdSchema } from "../schemas"
import { dossierSourceKind, getDossierLoadErrorKind, loadDossierOverview, loadDossierRequirements } from "../source"

export const dossierKeys = {
  all: ["dossier"] as const,
  dashboard: (params: DashboardParams) => ["dossier", "dashboard", params] as const,
  overview: (id: string) => ["dossier", dossierSourceKind, "overview", id] as const,
  requirements: (id: string, params: DossierRequirementsParams) => ["dossier", dossierSourceKind, id, "requirements", params] as const,
  requirementsRoot: (id: string) => ["dossier", dossierSourceKind, id, "requirements"] as const,
  missingRequirements: (id: string) => [...dossierKeys.requirementsRoot(id), "missing"] as const,
  audit: (id: string, params: AuditParams) => ["dossier", "audit", id, params] as const,
}

const retryLoad = (failures: number, error: unknown) => failures < 1 && getDossierLoadErrorKind(error) === "load"

export function useDossierDashboard(params: DashboardParams) {
  return useQuery({
    queryKey: dossierKeys.dashboard(params),
    queryFn: () => dossierService.getDashboard(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useExportDashboard() {
  return useMutation({
    mutationFn: ({ params, format }: { params: DashboardParams; format: ExportFormat }) => dossierService.exportDashboard(params, format),
  })
}

export function useDossierOverview(id: EntityId | string | undefined) {
  const normalizedId = id === undefined ? "" : String(id)
  const invalidId = !dossierIdSchema.safeParse(normalizedId).success
  const query = useQuery({
    queryKey: dossierKeys.overview(normalizedId),
    queryFn: ({ signal }) => loadDossierOverview(normalizedId, signal),
    enabled: !invalidId,
    retry: retryLoad,
  })
  return { ...query, invalidId }
}

export function useDossierRequirements(id: string, params: DossierRequirementsParams, enabled = true) {
  return useQuery({
    queryKey: dossierKeys.requirements(id, params),
    queryFn: ({ signal }) => loadDossierRequirements(id, params, signal),
    enabled: enabled && dossierIdSchema.safeParse(id).success,
    retry: retryLoad,
  })
}

export function useAuditHistory(id: EntityId | undefined, params: AuditParams) {
  const normalizedId = id === undefined ? "" : String(id)
  return useQuery({
    queryKey: dossierKeys.audit(normalizedId, params),
    queryFn: () => dossierService.getAuditHistory(id as EntityId, params),
    enabled: id !== undefined && normalizedId.length > 0,
    placeholderData: (previousData) => previousData,
  })
}
