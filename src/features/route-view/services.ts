import { isAxiosError } from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { canAccess } from "@/features/auth/access-control";
import type { AuthPrincipal } from "@/features/auth/types";
import { useAuthStore } from "@/features/auth/store";
import {
  readEnvelope,
  getApiErrorInfo,
} from "@/features/transport-plan/services";
import {
  actionEntityIdSchema,
  approvedBookingDetailSchema,
  transportPlanDetailSchema,
} from "@/features/transport-plan/schemas";
import {
  routePlanDetailSchema,
  routePlansQuerySchema,
  routePlansSchema,
} from "./schemas";
import type { RoutePlanDetail, RoutePlanSummary, RoutePlansQuery } from "./types";
import {
  backupChangeRequestSchema,
  backupChangeRequestResultSchema,
  routeChangeDecisionSchema,
  routeChangeDecisionResultSchema,
  returnActivationSchema,
  returnActivationResultSchema,
  driverNoticeSchema,
  driverNoticeResultSchema,
} from "./schemas";
import { canUseEmergencyAction } from "./emergency-policy";
import type {
  EmergencyAction,
  EmergencyRequestMap,
  EmergencyResultMap,
} from "./types";

export const canViewRoute = (principal: AuthPrincipal | null) =>
  canAccess(principal, {
    anyRole: [
      "LOGISTICS_MANAGER",
      "FLEET_ROUTE_COORDINATOR",
      "TRANSPORT_SPECIALIST",
    ],
  });
export const canExportRoute = (principal: AuthPrincipal | null) =>
  canAccess(principal, {
    anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"],
  });
const routePath = (id: string) =>
  `/route-plans/${encodeURIComponent(actionEntityIdSchema.parse(id))}`;

const emergencyContracts = {
  request: {
    path: "change-request",
    input: backupChangeRequestSchema,
    output: backupChangeRequestResultSchema,
  },
  decision: {
    path: "change-decision",
    input: routeChangeDecisionSchema,
    output: routeChangeDecisionResultSchema,
  },
  activation: {
    path: "return-activation",
    input: returnActivationSchema,
    output: returnActivationResultSchema,
  },
  notice: {
    path: "driver-notice",
    input: driverNoticeSchema,
    output: driverNoticeResultSchema,
  },
};
export async function executeEmergencyAction<A extends EmergencyAction>(
  action: A,
  id: string,
  input: EmergencyRequestMap[A],
  signal?: AbortSignal,
): Promise<EmergencyResultMap[A]> {
  const path = routePath(id),
    contract = emergencyContracts[action];
  const principal = useAuthStore.getState().principal;
  if (!canUseEmergencyAction(action, principal)) {
    readEnvelope({
      isSuccess: false,
      code: 403,
      errorCode: "FORBIDDEN",
      message: "You do not have permission to perform this emergency action.",
      value: null,
    });
  }
  const body = contract.input.parse(input);
  signal?.throwIfAborted();
  const payload = await apiClient.post<unknown, unknown>(
    `${path}/${contract.path}`,
    body,
    { signal },
  );
  signal?.throwIfAborted();
  return contract.output.parse(readEnvelope(payload)) as EmergencyResultMap[A];
}

export function getEmergencyError(error: unknown) {
  const info = getApiErrorInfo(error);
  const messages: Record<string, string> = {
    APPROVAL_NOT_REQUIRED:
      "This change is below the approval threshold. No emergency approval request was sent.",
    ROUTE_PLAN_MODIFIED:
      "This route changed while you were working. Review the latest route before submitting again.",
    INVALID_ROUTE_PLAN_STATUS:
      "This action is no longer available for the current route status.",
    TRANSPORT_NOT_IN_TRANSIT:
      "Emergency actions require a transport that is in transit.",
    DOSSIER_NOT_APPROVED:
      "The compliance dossier must be approved before this return can proceed.",
    RETURN_DOSSIER_NOT_APPROVED:
      "The EXTRA compliance dossier must be approved before activation.",
    VEHICLE_SCHEDULE_CONFLICT:
      "A vehicle overlaps an assignment in another transport plan.",
    SCHEDULE_CONFLICT: "A segment resource has a scheduling conflict.",
    PROVIDER_INACTIVE: "The selected transport provider is inactive.",
    OUTSOURCED_SEGMENT: "Vehicles cannot be assigned to an outsourced segment.",
    VEHICLE_MODE_MISMATCH: "The vehicle mode does not match the segment.",
    VEHICLE_UNAVAILABLE: "A vehicle is unavailable for this segment.",
    VEHICLE_DOCUMENT_EXPIRED: "A vehicle registration or insurance expires before this segment ends.",
    SEGMENT_TIMES_MISSING: "The segment needs planned departure and arrival times before vehicles can be changed.",
    AMBIGUOUS_REPLACEMENT: "The same vehicle has different replacements. Explicitly select every eligible segment that still uses it.",
    INCIDENT_REQUIRED: "Open vehicle replacement from a verified incident for this transport.",
    INCIDENT_NOT_FOUND: "The incident is unavailable or does not belong to this transport.",
    INVALID_INCIDENT_STATUS: "Only a reported or pending incident allows vehicle replacement.",
    VEHICLE_NOT_IN_INCIDENT: "Only vehicles reported in this incident can be replaced.",
    REPLACEMENT_COST_NOT_APPROVED: "Waiting for replacement vehicle cost approval.",
    SEGMENT_ALREADY_COMPLETED: "Vehicles cannot be changed on an arrived segment.",
    SEGMENT_NOT_IN_ITINERARY: "This segment is superseded or outside the eligible itinerary.",
    INVALID_ROUTE_PLAN_TYPE: "Before departure, vehicles can only be changed on a PRIMARY route plan.",
    VEHICLE_CAPACITY_EXCEEDED:
      "Vehicle capacity is insufficient for this segment.",
    PROVIDER_MODE_MISMATCH:
      "The provider does not support this segment's transport mode.",
  };
  const denied = info.status === 403 || info.code === "FORBIDDEN";
  const unauthorized = info.status === 401 || info.code === "UNAUTHORIZED";
  return {
    ...info,
    denied,
    unauthorized,
    stale: info.code === "ROUTE_PLAN_MODIFIED",
    message: denied
      ? "You do not have permission to access this emergency workspace."
      : unauthorized
        ? "Your session has expired. Please sign in again."
        : error instanceof z.ZodError
          ? "Check the form fields or contact support if the API response is unexpected."
          : info.message ||
            messages[info.code ?? ""] ||
            (error instanceof Error
              ? error.message
              : "Unable to complete the emergency action."),
  };
}

async function parseErrorBlob(blob: Blob) {
  let payload: unknown;
  try {
    payload = JSON.parse(await blob.text());
  } catch {
    throw new Error("The server did not return a valid route PDF.");
  }
  readEnvelope(payload);
  throw new Error("The server did not return a route PDF.");
}

export const routeViewService = {
  async getEmergencyTransportPlan(id: string, signal?: AbortSignal) {
    const response = await apiClient.get<unknown, unknown>(
      `/transport-plans/${encodeURIComponent(actionEntityIdSchema.parse(id))}`,
      { signal },
    );
    signal?.throwIfAborted();
    return transportPlanDetailSchema.parse(readEnvelope(response));
  },
  async getEmergencyBooking(id: string, signal?: AbortSignal) {
    const response = await apiClient.get<unknown, unknown>(
      `/bookings/approved/${encodeURIComponent(actionEntityIdSchema.parse(id))}`,
      { signal },
    );
    signal?.throwIfAborted();
    return approvedBookingDetailSchema.parse(readEnvelope(response));
  },
  async getRoutes(
    transportPlanId: string,
    params: RoutePlansQuery = {},
    signal?: AbortSignal,
  ): Promise<{ items: RoutePlanSummary[] }> {
    const id = actionEntityIdSchema.parse(transportPlanId),
      query = routePlansQuerySchema.parse(params);
    signal?.throwIfAborted();
    const payload = await apiClient.get<unknown, unknown>(
      `/transport-plans/${encodeURIComponent(id)}/route-plans`,
      { params: query, signal },
    );
    signal?.throwIfAborted();
    return routePlansSchema.parse(readEnvelope(payload));
  },
  async getRoute(id: string, signal?: AbortSignal): Promise<RoutePlanDetail> {
    const path = routePath(id);
    signal?.throwIfAborted();
    const payload = await apiClient.get<unknown, unknown>(path, { signal });
    signal?.throwIfAborted();
    return routePlanDetailSchema.refine((route) => route.routePlanId.toLowerCase() === id.toLowerCase(), {
      message: "The route response does not match the requested route.",
    }).parse(readEnvelope(payload));
  },
  async exportPdf(id: string, signal?: AbortSignal): Promise<Blob> {
    const path = routePath(id);
    if (!canExportRoute(useAuthStore.getState().principal))
      throw new Error("You do not have permission to export route plans.");
    let blob: Blob;
    try {
      blob = await apiClient.get<Blob, Blob>(`${path}/export`, {
        params: { format: "pdf" },
        responseType: "blob",
        signal,
      });
    } catch (error) {
      if (isAxiosError(error) && error.response?.data instanceof Blob)
        await parseErrorBlob(error.response.data);
      throw error;
    }
    if (!(blob instanceof Blob)) {
      readEnvelope(blob);
      throw new Error("The server did not return a route PDF.");
    }
    if (blob.type.includes("json")) await parseErrorBlob(blob);
    if (!blob.size || (await blob.slice(0, 5).text()) !== "%PDF-")
      throw new Error("The server did not return a valid route PDF.");
    return blob;
  },
};

export function getRouteViewError(error: unknown) {
  const { code, status, message } = getApiErrorInfo(error);
  if (
    code === "ROUTE_PLAN_NOT_FOUND" ||
    code === "TRANSPORT_PLAN_NOT_FOUND" ||
    status === 404
  )
    return {
      message: message || "Route plan not found or no longer available.",
      retryable: false,
    };
  if (code === "FORBIDDEN" || status === 403)
    return {
      message: "You do not have permission to view this route plan.",
      retryable: false,
    };
  if (code === "UNAUTHORIZED" || status === 401)
    return {
      message: "Your session has expired. Please sign in again.",
      retryable: false,
    };
  if (error instanceof z.ZodError) {
    console.error("Route view Zod validation error issues:", error.issues);
    return {
      message: "The server returned an unexpected route plan response.",
      retryable: false,
    };
  }
  return {
    message: message || "Unable to load the route plan. Please try again.",
    retryable: true,
  };
}
