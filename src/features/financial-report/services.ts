import { isAxiosError, isCancel } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { REPORT_MOCK_MODE, REPORT_DATA_SOURCE } from "@/lib/report-mode";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import {
  financialEnvelopeSchema,
  financialReportSchema,
  transportIdSchema,
  updateFinancialNoteSchema,
  type UpdateFinancialNote,
} from "./schemas";

export class FinancialReportError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly fields: { field: string; message: string }[];
  constructor(
    code: string,
    message: string,
    status?: number,
    fields: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "FinancialReportError";
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function hasFinancialAccess(scope: string) {
  const state = useAuthStore.getState();
  return (
    Boolean(state.accessToken) &&
    canAccess(state.principal, { anyRole: ["LOGISTICS_MANAGER"] }) &&
    scope ===
      JSON.stringify([
        state.principal?.id ?? null,
        state.sessionVersion,
        REPORT_DATA_SOURCE,
      ])
  );
}

function assertAccess(scope: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (!hasFinancialAccess(scope))
    throw new FinancialReportError(
      "SESSION_CHANGED",
      "Your session or financial access changed. Please sign in again.",
      403,
    );
}

export function financialError(error: unknown): FinancialReportError {
  if (error instanceof FinancialReportError) return error;
  if (error instanceof z.ZodError)
    return new FinancialReportError(
      "CONTRACT_MISMATCH",
      "The financial figures could not be verified. Contact support before continuing.",
    );
  if (
    isCancel(error) ||
    (error instanceof Error && error.name === "AbortError")
  )
    return new FinancialReportError(
      "REQUEST_CANCELLED",
      "The financial request was cancelled. Its server outcome may be unknown.",
    );
  if (isAxiosError(error)) {
    const parsed = financialEnvelopeSchema.safeParse(error.response?.data);
    const status = error.response?.status;
    if (parsed.success)
      return new FinancialReportError(
        parsed.data.errorCode ?? "REQUEST_FAILED",
        parsed.data.message,
        status,
        parsed.data.errors ?? [],
      );
    const code =
      status === 401
        ? "UNAUTHORIZED"
        : status === 403
          ? "FORBIDDEN"
          : status === 404
            ? "TRANSPORT_NOT_FOUND"
            : "REQUEST_FAILED";
    const message =
      status === 401
        ? "Your session has expired. Please sign in again."
        : status === 403
          ? "You no longer have access to this financial report."
          : status === 404
            ? "This transport or financial report is unavailable."
            : "Unable to reach the financial service. Check your connection. A failed response does not confirm whether a change was saved.";
    return new FinancialReportError(code, message, status);
  }
  return new FinancialReportError(
    "REQUEST_FAILED",
    "Unable to load financial data. Please try again.",
  );
}

export function isFinancialTerminal(error: FinancialReportError) {
  return (
    [
      "UNAUTHORIZED",
      "FORBIDDEN",
      "SESSION_CHANGED",
      "TRANSPORT_NOT_FOUND",
      "INVALID_TRANSPORT_STATUS",
      "CONTRACT_MISMATCH",
    ].includes(error.code) || [401, 403, 404].includes(error.status ?? 0)
  );
}

async function requestReport(
  id: string,
  scope: string,
  signal: AbortSignal | undefined,
  send: (path: string) => Promise<unknown>,
) {
  try {
    const transportId = transportIdSchema.parse(id);
    assertAccess(scope, signal);
    const payload = await send(
      `/transports/${encodeURIComponent(transportId)}/financial-report`,
    );
    assertAccess(scope, signal);
    const envelope = financialEnvelopeSchema.parse(payload);
    if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300) {
      throw new FinancialReportError(
        envelope.errorCode ?? "REQUEST_FAILED",
        envelope.message,
        envelope.code,
        envelope.errors ?? [],
      );
    }
    const report = financialReportSchema.parse(envelope.value);
    if (
      report.transport.transportId.toLowerCase() !== transportId.toLowerCase()
    ) {
      throw new FinancialReportError(
        "CONTRACT_MISMATCH",
        "The financial response belongs to a different transport.",
      );
    }
    return report;
  } catch (error) {
    throw financialError(error);
  }
}

export const financialReportService = {
  async get(
    id: string,
    allowProvisional: boolean,
    scope: string,
    signal?: AbortSignal,
  ) {
    if (import.meta.env.DEV && REPORT_MOCK_MODE) {
      try {
        const transportId = transportIdSchema.parse(id);
        assertAccess(scope, signal);
        const { getFinancialDemo } = await import("./mocks/fixtures");
        const value = getFinancialDemo(transportId);
        assertAccess(scope, signal);
        if (!value)
          throw new FinancialReportError(
            "TRANSPORT_NOT_FOUND",
            "Select a sample transport from the demo choices above.",
            404,
          );
        const report = financialReportSchema.parse(value);
        if (report.isProvisional && !allowProvisional)
          throw new FinancialReportError(
            "TRANSPORT_NOT_COMPLETED",
            "This sample transport is still in progress. Confirm to view provisional figures.",
            409,
          );
        return report;
      } catch (error) {
        throw financialError(error);
      }
    }
    return requestReport(id, scope, signal, (path) =>
      apiClient.get<unknown, unknown>(path, {
        params: { allowProvisional },
        signal,
      }),
    );
  },
  refresh(id: string, scope: string, signal?: AbortSignal) {
    if (REPORT_MOCK_MODE) {
      assertAccess(scope, signal);
      return Promise.reject(
        new FinancialReportError(
          "DEMO_MODE",
          "Refreshing financial figures is unavailable in demo mode.",
        ),
      );
    }
    return requestReport(id, scope, signal, (path) =>
      apiClient.post<unknown, unknown>(`${path}/refresh`, undefined, {
        signal,
      }),
    );
  },
  updateNote(
    id: string,
    payload: UpdateFinancialNote,
    scope: string,
    signal?: AbortSignal,
  ) {
    if (REPORT_MOCK_MODE) {
      assertAccess(scope, signal);
      return Promise.reject(
        new FinancialReportError(
          "DEMO_MODE",
          "Saving financial notes is unavailable in demo mode.",
        ),
      );
    }
    return requestReport(id, scope, signal, (path) =>
      apiClient.patch<unknown, unknown>(
        path,
        updateFinancialNoteSchema.parse(payload),
        { signal },
      ),
    );
  },
};
