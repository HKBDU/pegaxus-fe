import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { canAccess } from "@/features/auth/access-control";
import { cohortKey } from "./filters";
import {
  getOnTimeReport,
  reportScope,
  hasReportAccess,
  reportError,
  type ReportError,
} from "./services";
import { exportOnTimeReport, saveReportFile } from "./export";
import {
  reportFiltersSchema,
  onTimeReportSchema,
  type ReportFilters,
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
export function useOnTimeDeliveryReport(filters: ReportFilters | null) {
  const { allowed, scope } = useReportAccess();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["management-report", scope, "on-time-delivery", filters],
    queryFn: ({ signal }) => {
      if (!filters) throw new Error("Valid filters are required.");
      return getOnTimeReport(filters, scope, signal);
    },
    enabled: allowed && filters !== null,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 60000,
    placeholderData: (previous, previousQuery) => {
      const old = previousQuery?.queryKey[3];
      const parsed = reportFiltersSchema.safeParse(old);
      if (!filters || previousQuery?.queryKey[1] !== scope || !parsed.success)
        return undefined;
      // Keep charts only for changes that leave the report-wide cohort unchanged.
      return cohortKey(parsed.data) === cohortKey(filters)
        ? previous
        : undefined;
    },
  });
  const sameCohort =
    allowed && filters && !query.data
      ? client
          .getQueryCache()
          .findAll({
            queryKey: ["management-report", scope, "on-time-delivery"],
          })
          .filter((cached) => {
            const parsed = reportFiltersSchema.safeParse(cached.queryKey[3]);
            return (
              cached.state.status === "success" &&
              parsed.success &&
              cohortKey(parsed.data) === cohortKey(filters)
            );
          })
          .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0]
      : undefined;
  const previous = onTimeReportSchema.safeParse(sameCohort?.state.data);
  const fallback = previous.success ? previous.data : undefined;
  return {
    ...query,
    data: query.data ?? fallback,
    previousRows: query.isPlaceholderData || (!query.data && Boolean(fallback)),
    scope,
  };
}
export function useReportExport() {
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
  async function download(filters: ReportFilters, format: ExportFormat) {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setPending(format);
    setError(null);
    setCompleted("");
    try {
      const file = await exportOnTimeReport(
        filters,
        format,
        scope,
        current.signal,
      );
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
