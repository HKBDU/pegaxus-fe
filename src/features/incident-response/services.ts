import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { canAccess, normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import type { AuthPrincipal } from "@/features/auth/types";
import {
  emergencyCostEnvelopeSchema,
  emergencyCostPageSchema,
  emergencyCostQuerySchema,
  type EmergencyCostQuery,
} from "./schemas";

export function canReadEmergencyCosts(principal: AuthPrincipal | null) {
  return !canAccess(principal, { anyRole: ["CUSTOMER"] }) && canAccess(principal, {
    anyRole: [
      "LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST",
      "DRIVER", "ESCORT",
    ],
  });
}

class EmergencyCostApiError extends Error {
  readonly status: number;
  readonly errorCode?: string | null;

  constructor(status: number, errorCode?: string | null) {
    super("Emergency cost request failed.");
    this.status = status;
    this.errorCode = errorCode;
  }
}

export const emergencyCostService = {
  async list(input: EmergencyCostQuery, signal?: AbortSignal) {
    const auth = useAuthStore.getState();
    if (!auth.accessToken || !canReadEmergencyCosts(auth.principal))
      throw new EmergencyCostApiError(403, "FORBIDDEN");
    const params = emergencyCostQuerySchema.parse({
      ...input,
      status: input.status ?? (canAccess(auth.principal, {
        anyRole: ["LOGISTICS_MANAGER"],
      }) ? "PENDING" : undefined),
    });
    const roles = auth.principal!.roles.map(normalizeRole).sort().join(",");
    signal?.throwIfAborted();
    const response = await apiClient.get<unknown, unknown>("/emergency-cost-requests", {
      params,
      signal,
    });
    signal?.throwIfAborted();
    const current = useAuthStore.getState();
    if (!current.accessToken || current.sessionVersion !== auth.sessionVersion ||
        current.principal?.id !== auth.principal!.id ||
        current.principal.roles.map(normalizeRole).sort().join(",") !== roles ||
        !canReadEmergencyCosts(current.principal))
      throw new EmergencyCostApiError(401, "UNAUTHORIZED");
    const envelope = emergencyCostEnvelopeSchema.parse(response);
    if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300)
      throw new EmergencyCostApiError(envelope.code, envelope.errorCode);
    const page = emergencyCostPageSchema.parse(envelope.value);
    // A pinned scope is an invariant, not a client-side authorization filter.
    if (page.items.some((item) =>
      (params.incidentReportId !== undefined && item.incident.incidentReportId.toLowerCase() !== params.incidentReportId.toLowerCase()) ||
      (params.transportId !== undefined && item.incident.transportId.toLowerCase() !== params.transportId.toLowerCase())))
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
    return page;
  },
};

export function getEmergencyCostError(error: unknown) {
  const payload = isAxiosError(error)
    ? emergencyCostEnvelopeSchema.safeParse(error.response?.data)
    : null;
  const status = error instanceof EmergencyCostApiError
    ? error.status : isAxiosError(error) ? error.response?.status : undefined;
  const code = error instanceof EmergencyCostApiError
    ? error.errorCode : payload?.success ? payload.data.errorCode : undefined;
  if (status === 401 || code === "UNAUTHORIZED")
    return { message: "Your session is unavailable. Sign in again to view emergency costs.", retryable: false };
  if (status === 403 || code === "FORBIDDEN")
    return { message: "You do not have permission to view these emergency cost requests.", retryable: false };
  if (status === 404 || status === 501)
    return { message: "Emergency cost requests are unavailable on this backend. No list or totals could be loaded.", retryable: false };
  if (error instanceof z.ZodError || code === "COST_SCOPE_MISMATCH")
    return { message: "The backend returned an unexpected emergency cost response. No financial data is displayed.", retryable: false };
  if (status === 400 || status === 422 || code === "VALIDATION_ERROR")
    return { message: "The backend rejected these filters. Review the selected filters and date range.", retryable: false };
  return { message: "Emergency cost requests could not be loaded. Check your connection and try again.", retryable: true };
}
