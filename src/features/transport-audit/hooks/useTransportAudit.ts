import { useQuery } from "@tanstack/react-query";
import { transportAuditService } from "../services";
export function useTransportAudit(transportId: string, blocks?: string) {
  return useQuery({
    queryKey: ["transport-audit", transportId, blocks ?? "all"],
    queryFn: ({ signal }) =>
      transportAuditService.audit(transportId, blocks, signal),
    enabled: Boolean(transportId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
