import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { transportAuditService } from "../services";
import { POLLING_INTERVAL_MS } from "../constants";
import type { AuditExportJobResponse, AuditExportRequest } from "../types";
export function useAuditExportJob(transportId: string) {
  const [created, setCreated] = useState<{ transportId: string; job: AuditExportJobResponse } | null>(null);
  const mutation = useMutation({
    mutationFn: (body: AuditExportRequest) =>
      transportAuditService.createExport(transportId, body),
    onSuccess: (job) => setCreated({ transportId, job }),
  });
  // Keep the last accepted job visible if a later creation attempt fails.
  const initialJob = created?.transportId === transportId ? created.job : undefined;
  const exportId = initialJob?.exportId;
  const job = useQuery({
    queryKey: ["transport-audit", "export", exportId],
    queryFn: ({ signal }) => transportAuditService.exportJob(exportId!, signal),
    enabled: Boolean(exportId),
    initialData: initialJob,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "PROCESSING"
        ? POLLING_INTERVAL_MS
        : false;
    },
  });
  return { ...mutation, job, start: mutation.mutate, exportId };
}
