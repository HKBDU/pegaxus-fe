import { useMutation, useQuery } from "@tanstack/react-query";
import { transportAuditService } from "../services";
import { POLLING_INTERVAL_MS } from "../constants";
import type { AuditExportRequest } from "../types";
export function useAuditExportJob(transportId: string) {
  const mutation = useMutation({
    mutationFn: (body: AuditExportRequest) =>
      transportAuditService.createExport(transportId, body),
  });
  const exportId = mutation.data?.exportId;
  const job = useQuery({
    queryKey: ["transport-audit", "export", exportId],
    queryFn: ({ signal }) => transportAuditService.exportJob(exportId!, signal),
    enabled: Boolean(exportId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "PROCESSING"
        ? POLLING_INTERVAL_MS
        : false;
    },
  });
  return { ...mutation, job, start: mutation.mutate, exportId };
}
