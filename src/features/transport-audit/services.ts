import apiClient from "@/lib/axios";
import {
  archiveResponseSchema,
  auditResponseSchema,
  exportJobSchema,
} from "./schemas";
import type {
  AuditExportJobResponse,
  AuditExportRequest,
  TransportArchiveQuery,
  TransportArchiveResponse,
  TransportAuditFull,
} from "./types";

function unwrap(response: unknown): unknown {
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    if ("value" in obj && obj.value !== undefined && obj.value !== null) {
      return obj.value;
    }
    if ("data" in obj && obj.data !== undefined && obj.data !== null) {
      return obj.data;
    }
  }
  return response;
}

const parse = <T>(value: unknown, schema: { parse: (v: unknown) => T }) =>
  schema.parse(unwrap(value));

function toArchiveQueryParams(params: TransportArchiveQuery) {
  return {
    Search: params.search?.trim() || undefined,
    CompletedFrom: params.completedFrom || undefined,
    CompletedTo: params.completedTo || undefined,
    OriginCountry: params.originCountry || undefined,
    DestinationCountry: params.destinationCountry || undefined,
    PageIndex: params.pageIndex,
    PageSize: params.pageSize,
    // CamelCase fallback
    search: params.search?.trim() || undefined,
    completedFrom: params.completedFrom || undefined,
    completedTo: params.completedTo || undefined,
    originCountry: params.originCountry || undefined,
    destinationCountry: params.destinationCountry || undefined,
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  };
}

export const transportAuditService = {
  async archive(
    params: TransportArchiveQuery,
    signal?: AbortSignal,
  ): Promise<TransportArchiveResponse> {
    return parse(
      await apiClient.get("/transport-archive", {
        params: toArchiveQueryParams(params),
        signal,
      }),
      archiveResponseSchema,
    );
  },
  async audit(
    transportId: string,
    blocks?: string,
    signal?: AbortSignal,
  ): Promise<TransportAuditFull> {
    return parse(
      await apiClient.get(
        `/transports/${encodeURIComponent(transportId)}/audit`,
        {
          params: blocks ? { Blocks: blocks, blocks } : undefined,
          signal,
        },
      ),
      auditResponseSchema,
    );
  },
  async createExport(
    transportId: string,
    body: AuditExportRequest,
  ): Promise<AuditExportJobResponse> {
    return parse(
      await apiClient.post(
        `/transports/${encodeURIComponent(transportId)}/audit-exports`,
        body,
      ),
      exportJobSchema,
    );
  },
  async exportJob(
    exportId: string,
    signal?: AbortSignal,
  ): Promise<AuditExportJobResponse> {
    return parse(
      await apiClient.get(`/audit-exports/${encodeURIComponent(exportId)}`, {
        signal,
      }),
      exportJobSchema,
    );
  },
  async downloadEpod(
    handoverRecordId: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    return (await apiClient.get(
      `/handover-records/${encodeURIComponent(handoverRecordId)}/epod`,
      { responseType: "blob", signal },
    )) as Blob;
  },
};
