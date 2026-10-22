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
  rerouteEscalationRequestSchema,
  rerouteEscalationResultSchema,
  type RerouteContext,
  type RerouteEscalationRequest,
} from "./reroute-schemas";

export const canReadReroute = (principal: AuthPrincipal | null) =>
  !canAccess(principal, { anyRole: ["CUSTOMER"] }) &&
  canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"],
  });

export const canEscalateReroute = (
  principal: AuthPrincipal | null,
  context: RerouteContext,
) =>
  canReadReroute(principal) &&
  canAccess(principal, { anyRole: ["FLEET_ROUTE_COORDINATOR"] }) &&
  !canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) &&
  context.availableActions.includes("ESCALATE_REROUTE") &&
  ["REPORTED", "PENDING"].includes(context.incident.status) &&
  context.transport.status === "IN_TRANSIT";

export function getRerouteBlockedPlans(context: RerouteContext) {
  const plans = new Map<string, { id: string; label: string }>();
  const add = (id: string, label: string) => {
    if (
      rerouteIncidentIdSchema.safeParse(id).success &&
      !plans.has(id.toLowerCase())
    )
      plans.set(id.toLowerCase(), { id, label });
  };
  if (context.currentSegment)
    add(
      context.currentSegment.routePlanId,
      `${context.currentSegment.routeType} · Current route`,
    );
  for (const segment of context.remainingSegments)
    add(segment.routePlanId, `${segment.routeType} · Remaining route`);
  for (const plan of context.backupPlans)
    add(plan.routePlanId, `BACKUP · ${plan.routePlanCode}`);
  if (context.returnPlan)
    add(
      context.returnPlan.routePlanId,
      `RETURN · ${context.returnPlan.routePlanCode}`,
    );
  return [...plans.values()];
}

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

class EscalationOutcomeUnknown extends Error {
  constructor() {
    super("The escalation outcome could not be verified.");
  }
}
class EscalationPreflightError extends Error {}
const escalationFlights = new Set<string>();

export async function escalateReroute(
  context: RerouteContext,
  input: RerouteEscalationRequest,
  scope: string,
  signal?: AbortSignal,
) {
  const snapshot = rerouteContextSchema.parse(context);
  const id = rerouteIncidentIdSchema.parse(snapshot.incident.incidentReportId);
  const body = rerouteEscalationRequestSchema.parse(input);
  const requireActor = () => {
    const actor = authorize(scope, signal);
    if (!canEscalateReroute(actor.principal, snapshot))
      throw new RerouteApiError(403, "FORBIDDEN");
    return actor;
  };
  const actor = requireActor();
  const known = new Set(
    getRerouteBlockedPlans(snapshot).map((plan) => plan.id.toLowerCase()),
  );
  if (body.blockedRoutePlanIds?.some((id) => !known.has(id.toLowerCase())))
    throw new EscalationPreflightError(
      "A selected route is no longer present in this context. Refresh and review your selection.",
    );
  const flight = JSON.stringify([scope, id.toLowerCase()]);
  if (escalationFlights.has(flight))
    throw new EscalationPreflightError(
      "An escalation for this incident is already being sent.",
    );
  escalationFlights.add(flight);
  try {
    let value: unknown;
    if (isEmergencyCostMockMode()) {
      const { emergencyCostMockRepository, MockEmergencyCostError } =
        await import("./mocks/repository");
      requireActor();
      try {
        value = emergencyCostMockRepository.escalateReroute(id, body, actor);
      } catch (error) {
        if (error instanceof MockEmergencyCostError)
          throw new RerouteApiError(error.status, error.errorCode);
        throw error;
      }
    } else {
      let responseStatus: number | undefined;
      const response = await apiClient.post<unknown, unknown>(
        `/incidents/${encodeURIComponent(id)}/reroute-escalation`,
        body,
        {
          signal,
          // A 401 must surface without the shared interceptor replaying this notification mutation.
          validateStatus: (status) => {
            responseStatus = status;
            return status === 401 || (status >= 200 && status < 300);
          },
        },
      );
      if (responseStatus === 401)
        throw new RerouteApiError(401, "UNAUTHORIZED");
      if (responseStatus !== 200) throw new EscalationOutcomeUnknown();
      requireActor();
      const envelope = emergencyCostEnvelopeSchema.safeParse(response);
      if (!envelope.success) throw new EscalationOutcomeUnknown();
      if (!envelope.data.isSuccess || envelope.data.code !== 200) {
        if (envelope.data.code >= 400 && envelope.data.code < 500)
          throw new RerouteApiError(
            envelope.data.code,
            envelope.data.errorCode,
          );
        throw new EscalationOutcomeUnknown();
      }
      value = envelope.data.value;
    }
    requireActor();
    const result = rerouteEscalationResultSchema.safeParse(value);
    if (
      !result.success ||
      result.data.incidentReportId.toLowerCase() !== id.toLowerCase()
    )
      throw new EscalationOutcomeUnknown();
    return result.data;
  } finally {
    escalationFlights.delete(flight);
  }
}

export function getRerouteEscalationError(error: unknown) {
  const status =
    error instanceof RerouteApiError
      ? error.status
      : isAxiosError(error)
        ? error.response?.status
        : undefined;
  if (error instanceof EscalationPreflightError)
    return { message: error.message, blocked: true, refreshContext: true };
  if (error instanceof z.ZodError)
    return {
      message:
        "Review the reason, suggestion and selected routes before sending.",
      blocked: false,
      refreshContext: false,
    };
  if (status === 400)
    return {
      message:
        "The backend rejected these details. Check the reason, duration and selected routes; your input is preserved.",
      blocked: false,
      refreshContext: false,
    };
  if (status === 401 || status === 403)
    return {
      message:
        "Your session or coordinator assignment no longer permits escalation. Refresh the context or sign in again.",
      blocked: true,
      refreshContext: true,
    };
  if (status === 404)
    return {
      message: "This incident or escalation endpoint is no longer available.",
      blocked: true,
      refreshContext: true,
    };
  if (status === 409 || status === 422)
    return {
      message:
        "The incident or transport state changed. Close this dialog and review the refreshed context before sending again.",
      blocked: true,
      refreshContext: true,
    };
  return {
    message:
      "Delivery could not be confirmed. The server may have received this escalation. Do not resend until you verify it with Logistics Management; your input is preserved.",
    blocked: true,
    refreshContext: false,
    outcomeUnknown: true,
  };
}
