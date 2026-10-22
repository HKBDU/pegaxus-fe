import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import type { AuthPrincipal } from "@/features/auth/types";
import { emergencyCostEnvelopeSchema } from "./schemas";
import { emergencyCostAuthScope } from "./services";
import { isEmergencyCostMockMode } from "./source";
import {
  rerouteContextSchema,
  rerouteIncidentIdSchema,
} from "./reroute-schemas";

export const canReadReroute = (principal: AuthPrincipal | null) =>
  !canAccess(principal, { anyRole: ["CUSTOMER"] }) &&
  canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"],
  });

class RerouteApiError extends Error {
  readonly status: number;
  readonly errorCode?: string | null;
  constructor(status: number, errorCode?: string | null) {
    super("Reroute context could not be verified.");
    this.status = status;
    this.errorCode = errorCode;
  }
}

function authorize(scope: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const auth = useAuthStore.getState();
  if (
    !auth.accessToken ||
    !auth.principal ||
    emergencyCostAuthScope() !== scope
  )
    throw new RerouteApiError(401, "UNAUTHORIZED");
  if (!canReadReroute(auth.principal))
    throw new RerouteApiError(403, "FORBIDDEN");
  return { principal: auth.principal, sessionVersion: auth.sessionVersion };
}

export async function getRerouteContext(
  id: string,
  scope: string,
  signal?: AbortSignal,
) {
  const incidentId = rerouteIncidentIdSchema.parse(id);
  const actor = authorize(scope, signal);
  let value: unknown;
  if (isEmergencyCostMockMode()) {
    const { emergencyCostMockRepository, MockEmergencyCostError } =
      await import("./mocks/repository");
    authorize(scope, signal);
    try {
      value = emergencyCostMockRepository.rerouteContext(incidentId, actor);
    } catch (error) {
      if (error instanceof MockEmergencyCostError)
        throw new RerouteApiError(error.status, error.errorCode);
      throw error;
    }
  } else {
    const response = await apiClient.get<unknown, unknown>(
      `/incidents/${encodeURIComponent(incidentId)}/reroute-context`,
      { signal },
    );
    authorize(scope, signal);
    const envelope = emergencyCostEnvelopeSchema.parse(response);
    if (!envelope.isSuccess || envelope.code !== 200)
      throw new RerouteApiError(
        envelope.code >= 400 ? envelope.code : 502,
        envelope.errorCode ?? "INVALID_REROUTE_ENVELOPE",
      );
    value = envelope.value;
  }
  authorize(scope, signal);
  const context = rerouteContextSchema.parse(value);
  if (
    context.incident.incidentReportId.toLowerCase() !== incidentId.toLowerCase()
  )
    throw new RerouteApiError(502, "REROUTE_SCOPE_MISMATCH");
  return context;
}

export function getRerouteError(error: unknown) {
  const local = error instanceof RerouteApiError;
  const status = local
    ? error.status
    : isAxiosError(error)
      ? error.response?.status
      : undefined;
  const payload = isAxiosError(error)
    ? emergencyCostEnvelopeSchema.safeParse(error.response?.data)
    : null;
  const code = local
    ? error.errorCode
    : payload?.success
      ? payload.data.errorCode
      : undefined;
  if (status === 401)
    return {
      message:
        "Your session is unavailable. Sign in again to view rerouting context.",
      retryable: false,
    };
  if (status === 403)
    return {
      message:
        "Only the assigned coordinator or logistics manager can view this rerouting context.",
      retryable: false,
    };
  if (status === 404)
    return {
      message: "This incident or rerouting endpoint is not available.",
      retryable: false,
    };
  if (
    error instanceof z.ZodError ||
    code === "REROUTE_SCOPE_MISMATCH" ||
    code === "INVALID_REROUTE_ENVELOPE"
  )
    return {
      message:
        "The rerouting response could not be verified. No decision context is displayed.",
      retryable: false,
    };
  if (status === 400 || status === 422)
    return {
      message:
        "The backend rejected this incident identifier or rerouting request.",
      retryable: false,
    };
  return {
    message:
      "Rerouting context could not be loaded. Check your connection and refresh.",
    retryable: true,
  };
}
