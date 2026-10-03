import { useMutation, useQuery } from "@tanstack/react-query"

import { dossierService } from "@/features/dossier/services"
import type { AuditParams, DashboardParams, ExportFormat } from "@/features/dossier/types"
import type { EntityId } from "@/shared/types"

export const dossierKeys = {
  all: ["dossier"] as const,
  dashboard: (params: DashboardParams) => [...dossierKeys.all, "dashboard", params] as const,
  overview: (id: EntityId) => [...dossierKeys.all, "overview", String(id)] as const,
  audit: (id: EntityId, params: AuditParams) => [...dossierKeys.all, "audit", String(id), params] as const,
}

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

export function useDossierOverview(id: EntityId | undefined) {
  return useQuery({
    queryKey: dossierKeys.overview(id ?? ""),
    queryFn: () => dossierService.getOverview(id as EntityId),
    enabled: id !== undefined && String(id).length > 0,
  })
}

export function useAuditHistory(id: EntityId | undefined, params: AuditParams) {
  return useQuery({
    queryKey: dossierKeys.audit(id ?? "", params),
    queryFn: () => dossierService.getAuditHistory(id as EntityId, params),
    enabled: id !== undefined && String(id).length > 0,
    placeholderData: (previousData) => previousData,
  })
}
