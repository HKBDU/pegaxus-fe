import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { cohortKey, incidentCohortKey, transitCohortKey } from "./filters";
import {
  getOnTimeReport,
  getIncidentClaimReport,
  getTransitTimeReport,
  reportScope,
  hasReportAccess,
  reportError,
  type ReportError,
} from "./services";
import {
  exportOnTimeReport,
  exportIncidentClaimReport,
  exportTransitTimeReport,
  saveReportFile,
} from "./export";
import {
  reportFiltersSchema,
  onTimeReportSchema,
  incidentFiltersSchema,
  incidentClaimReportSchema,
  transitFiltersSchema,
  transitTimeReportSchema,
  type TransitFilters,
  type ReportFilters,
  type IncidentFilters,
  type ExportFormat,
} from "./schemas";

export function useReportAccess() {
  const principal = useAuthStore((s) => s.principal);
  const sessionVersion = useAuthStore((s) => s.sessionVersion);
  const tokenAvailable = useAuthStore((s) => Boolean(s.accessToken));
  return {
    allowed:
      tokenAvailable &&
      canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }),
    scope: reportScope(),
    sessionVersion,
  };
}
function useManagementReport<F, T>(
  filters: F | null,
  definition: {
    type: "on-time-delivery" | "incident-claim-frequency" | "transit-time";
    filterSchema: z.ZodType<F>;
    responseSchema: z.ZodType<T>;
    cohort: (filters: F) => string;
    read: (filters: F, scope: string, signal: AbortSignal) => Promise<T>;
  },
) {
  const { allowed, scope } = useReportAccess();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["management-report", scope, definition.type, filters],
    queryFn: ({ signal }) => {
      if (!filters) throw new Error("Valid filters are required.");
      return definition.read(filters, scope, signal);
    },
    enabled: allowed && filters !== null,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60000,
    placeholderData: (previous, previousQuery) => {
      const old = previousQuery?.queryKey[3];
      const parsed = definition.filterSchema.safeParse(old);
      if (!filters || previousQuery?.queryKey[1] !== scope || !parsed.success)
        return undefined;
      // Keep charts only for changes that leave the report-wide cohort unchanged.
      return definition.cohort(parsed.data) === definition.cohort(filters)
        ? previous
        : undefined;
    },
  });
  const sameCohort =
    allowed && filters && !query.data
      ? client
          .getQueryCache()
          .findAll({
            queryKey: ["management-report", scope, definition.type],
          })
          .filter((cached) => {
            const parsed = definition.filterSchema.safeParse(
              cached.queryKey[3],
            );
            return (
              cached.state.status === "success" &&
              parsed.success &&
              definition.cohort(parsed.data) === definition.cohort(filters)
            );
          })
          .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]
      : undefined;
  const previous = definition.responseSchema.safeParse(sameCohort?.state.data);
  const fallback = previous.success ? previous.data : undefined;
  return {
    ...query,
    data: query.data ?? fallback,
    previousRows: query.isPlaceholderData || (!query.data && Boolean(fallback)),
    scope,
  };
}
export function useOnTimeDeliveryReport(filters: ReportFilters | null) {
  return useManagementReport(filters, {
    type: "on-time-delivery",
    filterSchema: reportFiltersSchema,
    responseSchema: onTimeReportSchema,
    cohort: cohortKey,
    read: getOnTimeReport,
  });
}
export function useIncidentClaimReport(filters: IncidentFilters | null) {
  return useManagementReport(filters, {
    type: "incident-claim-frequency",
    filterSchema: incidentFiltersSchema,
    responseSchema: incidentClaimReportSchema,
    cohort: incidentCohortKey,
    read: getIncidentClaimReport,
  });
}

export function useTransitTimeReport(filters: TransitFilters | null) {
  return useManagementReport(filters, {
    type: "transit-time",
    filterSchema: transitFiltersSchema,
    responseSchema: transitTimeReportSchema,
    cohort: transitCohortKey,
    read: getTransitTimeReport,
  });
}

function useReportFileExport<F>(
  send: (
    filters: F,
    format: ExportFormat,
    scope: string,
    signal: AbortSignal,
  ) => Promise<{ blob: Blob; filename: string }>,
) {
  const { scope } = useReportAccess();
  const controller = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<ReportError | null>(null);
  const [completed, setCompleted] = useState("");
  useEffect(() => {
    const stop = useAuthStore.subscribe(() => {
      if (!hasReportAccess(scope)) controller.current?.abort();
    });
    return () => {
      controller.current?.abort();
      stop();
    };
  }, [scope]);
  async function download(filters: F, format: ExportFormat) {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setPending(format);
    setError(null);
    setCompleted("");
    try {
      const file = await send(filters, format, scope, current.signal);
      if (current.signal.aborted || !hasReportAccess(scope)) return;
      saveReportFile(file);
      setCompleted(`Download started: ${file.filename}`);
    } catch (failure) {
      if (!current.signal.aborted && hasReportAccess(scope))
        setError(reportError(failure));
    } finally {
      if (controller.current === current) {
        controller.current = null;
        if (!current.signal.aborted && hasReportAccess(scope)) setPending(null);
      }
    }
  }
  return { pending, error, completed, download };
}
export function useReportExport() {
  return useReportFileExport(exportOnTimeReport);
}
export function useIncidentReportExport() {
  return useReportFileExport(exportIncidentClaimReport);
}
export function useTransitReportExport() {
  return useReportFileExport(exportTransitTimeReport);
}
