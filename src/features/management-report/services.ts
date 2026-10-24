import { isAxiosError, isCancel } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { env } from "@/lib/env";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  envelopeSchema,
  guidSchema,
  onTimeReportSchema,
  type LookupKind,
  type ReportFilters,
} from "./schemas";
import { reportParams, incidentReportParams } from "./filters";
import { incidentClaimReportSchema, type IncidentFilters } from "./schemas";

export class ReportError extends Error {
  readonly code: string;
  readonly status?: number;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "ReportError";
    this.code = code;
    this.status = status;
  }
}

export function reportScope() {
  const state = useAuthStore.getState();
  return JSON.stringify([
    env.API_URL,
    state.principal?.id ?? null,
    state.sessionVersion,
  ]);
}
export function hasReportAccess(scope: string) {
  const state = useAuthStore.getState();
  return (
    Boolean(state.accessToken) &&
    canAccess(state.principal, { anyRole: ["LOGISTICS_MANAGER"] }) &&
    scope === reportScope()
  );
}
export function assertReportAccess(scope: string, signal: AbortSignal) {
  signal.throwIfAborted();
  if (!hasReportAccess(scope))
    throw new ReportError(
      "FORBIDDEN",
      "Your session or report access changed. Please sign in again.",
      403,
    );
}
export function reportError(error: unknown): ReportError {
  if (error instanceof ReportError) return error;
  if (error instanceof z.ZodError)
    return new ReportError(
      "CONTRACT_MISMATCH",
      "Report data does not match the expected contract. Contact support before continuing.",
    );
  if (
    isCancel(error) ||
    (error instanceof Error && error.name === "AbortError")
  )
    return new ReportError("CANCELLED", "The report request was cancelled.");
  if (isAxiosError(error)) {
    const parsed = envelopeSchema.safeParse(error.response?.data);
    if (parsed.success)
      return envelopeError(parsed.data, error.response?.status);
    if (error.response?.status === 401)
      return new ReportError(
        "UNAUTHORIZED",
        "Your session expired. Please sign in again.",
        401,
      );
    if (error.response?.status === 403)
      return new ReportError(
        "FORBIDDEN",
        "Only Logistics Managers can access this report.",
        403,
      );
    return new ReportError(
      "REQUEST_FAILED",
      "Unable to load the report. Check your connection and try again.",
      error.response?.status,
    );
  }
  return new ReportError(
    "REQUEST_FAILED",
    "Unable to complete the report request.",
  );
}
export function envelopeError(
  value: z.infer<typeof envelopeSchema>,
  status = value.code,
) {
  const code = value.errorCode ?? "REQUEST_FAILED";
  const message =
    code === "NO_DATA_TO_EXPORT"
      ? "No report data matches these applied filters."
      : code === "EXPORT_TOO_LARGE"
        ? "More than 10,000 detail rows match. Narrow the filters and export again."
        : [
            value.message,
            ...(value.errors ?? []).map(
              (field) => `${field.field}: ${field.message}`,
            ),
          ].join(" ");
  return new ReportError(code, message, status);
}
export function unwrapReport(payload: unknown) {
  const envelope = envelopeSchema.parse(payload);
  if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300)
    throw envelopeError(envelope);
  return envelope.value;
}
export function terminalReportError(error: ReportError) {
  return (
    [401, 403].includes(error.status ?? 0) ||
    ["FORBIDDEN", "UNAUTHORIZED", "CONTRACT_MISMATCH"].includes(error.code)
  );
}

export async function getOnTimeReport(
  filters: ReportFilters,
  scope: string,
  signal: AbortSignal,
) {
  try {
    assertReportAccess(scope, signal);
    const payload = await apiClient.get<unknown, unknown>(
      "/reports/on-time-delivery",
      { params: reportParams(filters), signal },
    );
    assertReportAccess(scope, signal);
    const report = onTimeReportSchema.parse(unwrapReport(payload));
    if (
      report.period.dateFrom !== filters.dateFrom ||
      report.period.dateTo !== filters.dateTo ||
      report.pageIndex !== filters.pageIndex ||
      report.pageSize !== filters.pageSize
    )
      throw new ReportError(
        "CONTRACT_MISMATCH",
        "The response period or pagination does not match the requested report.",
      );
    return report;
  } catch (error) {
    throw reportError(error);
  }
}

export async function getIncidentClaimReport(
  filters: IncidentFilters,
  scope: string,
  signal: AbortSignal,
) {
  try {
    assertReportAccess(scope, signal);
    const payload = await apiClient.get<unknown, unknown>(
      "/reports/incident-claim-frequency",
      { params: incidentReportParams(filters), signal },
    );
    assertReportAccess(scope, signal);
    const report = incidentClaimReportSchema.parse(unwrapReport(payload));
    if (
      report.period.dateFrom !== filters.dateFrom ||
      report.period.dateTo !== filters.dateTo ||
      report.pageIndex !== filters.pageIndex ||
      report.pageSize !== filters.pageSize
    )
      throw new ReportError(
        "CONTRACT_MISMATCH",
        "The response period or pagination does not match the requested report.",
      );
    return report;
  } catch (error) {
    throw reportError(error);
  }
}

const paging = {
  pageIndex: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
};
const routes = z.object({
  ...paging,
  items: z.array(
    z.object({
      routeId: guidSchema,
      routeCode: z.string(),
      routeName: z.string().nullable(),
    }),
  ),
});
const providers = z.object({
  ...paging,
  items: z.array(
    z.object({
      transportProviderId: guidSchema,
      providerCode: z.string(),
      providerName: z.string(),
      status: z.string(),
    }),
  ),
});
const drivers = z.object({
  ...paging,
  items: z.array(
    z.object({
      employeeId: guidSchema,
      employeeCode: z.string(),
      fullName: z.string(),
      role: z.string(),
      accountStatus: z.string(),
      workingStatus: z.string(),
    }),
  ),
});
const vehicles = z.object({
  ...paging,
  items: z.array(
    z.object({
      vehicleId: guidSchema,
      vehicleCode: z.string(),
      vehicleName: z.string().nullable(),
      licensePlate: z.string().nullable(),
      status: z.string(),
    }),
  ),
});
export async function getReportLookup(
  kind: LookupKind,
  search: string,
  pageIndex: number,
  scope: string,
  signal: AbortSignal,
) {
  try {
    assertReportAccess(scope, signal);
    const path =
      kind === "route"
        ? "/routes"
        : kind === "provider"
          ? "/transport-providers"
          : kind === "vehicle"
            ? "/vehicles"
            : "/employees";
    const payload = await apiClient.get<unknown, unknown>(path, {
      params: {
        search: search || undefined,
        pageIndex,
        pageSize: 20,
        ...(kind === "driver" ? { role: "DRIVER" } : {}),
      },
      signal,
    });
    assertReportAccess(scope, signal);
    const value = unwrapReport(payload);
    if (kind === "route") {
      const result = routes.parse(value);
      return {
        ...result,
        items: result.items.map((item) => ({
          id: item.routeId,
          label: `${item.routeCode}${item.routeName ? ` · ${item.routeName}` : ""}`,
        })),
      };
    }
    if (kind === "provider") {
      const result = providers.parse(value);
      return {
        ...result,
        items: result.items.map((item) => ({
          id: item.transportProviderId,
          label: `${item.providerName} · ${item.providerCode} (${item.status})`,
        })),
      };
    }
    if (kind === "vehicle") {
      const result = vehicles.parse(value);
      return {
        ...result,
        items: result.items.map((item) => ({
          id: item.vehicleId,
          label: `${item.vehicleCode}${item.licensePlate ? ` · ${item.licensePlate}` : ""} (${item.status})`,
        })),
      };
    }
    const result = drivers.parse(value);
    return {
      ...result,
      items: result.items.map((item) => ({
        id: item.employeeId,
        label: `${item.fullName} · ${item.employeeCode} (${item.workingStatus})`,
      })),
    };
  } catch (error) {
    throw reportError(error);
  }
}
