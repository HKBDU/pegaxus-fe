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
  emergencyCostCreateSchema,
  emergencyCostDetailSchema,
  emergencyCostIdSchema,
  emergencyCostIncidentSchema,
  emergencyCostRequestSchema,
  type EmergencyCostCreateInput,
  type EmergencyCostQuery,
  type EmergencyCostDetail,
} from "./schemas";
import {
  createEmergencyCostDecisionSchema,
  emergencyCostCancelSchema,
  type EmergencyCostCancelInput,
  type EmergencyCostDecisionInput,
} from "./action-schemas";
import { emergencyCostSource, isEmergencyCostMockMode } from "./source";
import type { CostEvidencePreview, MockCostEvidence } from "./mocks/repository";

export function canReadEmergencyCosts(principal: AuthPrincipal | null) {
  return (
    !canAccess(principal, { anyRole: ["CUSTOMER"] }) &&
    canAccess(principal, {
      anyRole: [
        "LOGISTICS_MANAGER",
        "FLEET_ROUTE_COORDINATOR",
        "TRANSPORT_SPECIALIST",
        "DRIVER",
        "ESCORT",
      ],
    })
  );
}

export function canCreateEmergencyCosts(principal: AuthPrincipal | null) {
  return (
    canReadEmergencyCosts(principal) &&
    !canAccess(principal, {
      anyRole: ["LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST"],
    }) &&
    canAccess(principal, {
      anyRole: ["DRIVER", "ESCORT", "FLEET_ROUTE_COORDINATOR"],
    })
  );
}

export function emergencyCostAuthScope() {
  const auth = useAuthStore.getState();
  return JSON.stringify([
    auth.principal?.id,
    auth.sessionVersion,
    auth.principal?.roles.map(normalizeRole).sort(),
    Boolean(auth.accessToken),
  ]);
}

export function canCancelEmergencyCost(
  principal: AuthPrincipal | null,
  request: EmergencyCostDetail,
) {
  return (
    canCreateEmergencyCosts(principal) &&
    request.status === "PENDING" &&
    request.availableActions.includes("CANCEL")
  );
}

export function canDecideEmergencyCost(
  principal: AuthPrincipal | null,
  request: EmergencyCostDetail,
) {
  return (
    canReadEmergencyCosts(principal) &&
    canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] }) &&
    request.status === "PENDING" &&
    request.availableActions.includes("DECIDE") &&
    ["REPORTED", "PENDING"].includes(request.incident.status)
  );
}

export class EmergencyCostApiError extends Error {
  readonly status: number;
  readonly errorCode?: string | null;

  constructor(status: number, errorCode?: string | null) {
    super("Emergency cost request failed.");
    this.status = status;
    this.errorCode = errorCode;
  }
}

function authorize(create = false, expectedScope?: string) {
  const auth = useAuthStore.getState();
  if (!auth.accessToken || !auth.principal)
    throw new EmergencyCostApiError(401, "UNAUTHORIZED");
  if (
    !(create
      ? canCreateEmergencyCosts(auth.principal)
      : canReadEmergencyCosts(auth.principal))
  )
    throw new EmergencyCostApiError(403, "FORBIDDEN");
  if (expectedScope && expectedScope !== emergencyCostAuthScope())
    throw new EmergencyCostApiError(401, "UNAUTHORIZED");
  return {
    principal: auth.principal,
    sessionVersion: auth.sessionVersion,
    scope: emergencyCostAuthScope(),
  };
}

function ensureActive(scope: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  authorize(false, scope);
}

function unwrap(response: unknown) {
  const envelope = emergencyCostEnvelopeSchema.parse(response);
  if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300)
    throw new EmergencyCostApiError(envelope.code, envelope.errorCode);
  return envelope.value;
}

export interface CreateEmergencyCostSubmission {
  incidentReportId: string;
  request: EmergencyCostCreateInput;
  mockEvidence?: readonly MockCostEvidence[];
}

export type EmergencyCostActionSubmission =
  | {
      action: "cancel";
      snapshot: EmergencyCostDetail;
      request: EmergencyCostCancelInput;
    }
  | {
      action: "decision";
      snapshot: EmergencyCostDetail;
      request: EmergencyCostDecisionInput;
    };

async function changeEmergencyCost(
  submission: EmergencyCostActionSubmission,
  signal?: AbortSignal,
  expectedScope?: string,
) {
  const auth = authorize(false, expectedScope);
  const snapshot = emergencyCostDetailSchema.parse(submission.snapshot);
  const id = emergencyCostIdSchema.parse(snapshot.emergencyCostRequestId);
  const allowed =
    submission.action === "cancel"
      ? canCancelEmergencyCost(auth.principal, snapshot)
      : canDecideEmergencyCost(auth.principal, snapshot);
  if (!allowed) throw new EmergencyCostApiError(403, "FORBIDDEN");
  const body =
    submission.action === "cancel"
      ? emergencyCostCancelSchema.parse(submission.request)
      : createEmergencyCostDecisionSchema(snapshot.requestedAmount).parse(
          submission.request,
        );
  if (body.lastUpdatedAt !== snapshot.updatedAt)
    throw new EmergencyCostApiError(409, "EMERGENCY_COST_MODIFIED");
  signal?.throwIfAborted();
  let value: unknown;
  if (isEmergencyCostMockMode()) {
    const { emergencyCostMockRepository } = await import("./mocks/repository");
    ensureActive(auth.scope, signal);
    value =
      submission.action === "cancel"
        ? emergencyCostMockRepository.cancel(
            id,
            emergencyCostCancelSchema.parse(body),
            auth,
          )
        : emergencyCostMockRepository.decide(
            id,
            createEmergencyCostDecisionSchema(snapshot.requestedAmount).parse(
              body,
            ),
            auth,
          );
  } else {
    let responseStatus: number | undefined;
    const response = await apiClient.post<unknown, unknown>(
      `/emergency-cost-requests/${encodeURIComponent(id)}/${submission.action}`,
      body,
      {
        signal,
        // Surface 401 without the shared interceptor replaying a financial POST.
        validateStatus: (status) => {
          responseStatus = status;
          return status === 401 || (status >= 200 && status < 300);
        },
      },
    );
    if (responseStatus === 401)
      throw new EmergencyCostApiError(401, "UNAUTHORIZED");
    value = unwrap(response);
  }
  ensureActive(auth.scope, signal);
  const result = emergencyCostRequestSchema.parse(value);
  if (
    result.emergencyCostRequestId.toLowerCase() !== id.toLowerCase() ||
    result.incident.incidentReportId.toLowerCase() !==
      snapshot.incident.incidentReportId.toLowerCase() ||
    result.requestedAmount !== snapshot.requestedAmount ||
    result.category !== snapshot.category
  )
    throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
  if (submission.action === "cancel") {
    if (
      result.status !== "CANCELLED" ||
      !result.cancelledAt ||
      result.cancellationReason !==
        emergencyCostCancelSchema.parse(body).cancellationReason
    )
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
  } else {
    const decision = createEmergencyCostDecisionSchema(
      snapshot.requestedAmount,
    ).parse(body);
    const status = decision.decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const approvedAmount =
      decision.decision === "APPROVE" ? decision.approvedAmount : 0;
    if (
      result.status !== status ||
      result.approvedAmount !== approvedAmount ||
      result.decision?.decision !== status ||
      result.decision.approvedAmount !== approvedAmount ||
      !result.decision.decidedBy
    )
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
  }
  return result;
}

export const emergencyCostService = {
  cancel: (
    submission: Extract<EmergencyCostActionSubmission, { action: "cancel" }>,
    signal?: AbortSignal,
    expectedScope?: string,
  ) => changeEmergencyCost(submission, signal, expectedScope),
  decide: (
    submission: Extract<EmergencyCostActionSubmission, { action: "decision" }>,
    signal?: AbortSignal,
    expectedScope?: string,
  ) => changeEmergencyCost(submission, signal, expectedScope),
  async list(
    input: EmergencyCostQuery,
    signal?: AbortSignal,
    expectedScope?: string,
  ) {
    const auth = authorize(false, expectedScope);
    const params = emergencyCostQuerySchema.parse({
      ...input,
      status:
        input.status ??
        (canAccess(auth.principal, {
          anyRole: ["LOGISTICS_MANAGER"],
        })
          ? "PENDING"
          : undefined),
    });
    signal?.throwIfAborted();
    let value: unknown;
    if (isEmergencyCostMockMode()) {
      const { emergencyCostMockRepository } =
        await import("./mocks/repository");
      ensureActive(auth.scope, signal);
      value = emergencyCostMockRepository.list(params, auth);
    } else {
      value = unwrap(
        await apiClient.get<unknown, unknown>("/emergency-cost-requests", {
          params,
          signal,
        }),
      );
    }
    ensureActive(auth.scope, signal);
    const page = emergencyCostPageSchema.parse(value);
    page.items.forEach((item) =>
      emergencyCostIdSchema.parse(item.emergencyCostRequestId),
    );
    // A pinned scope is an invariant, not a client-side authorization filter.
    if (
      page.items.some(
        (item) =>
          (params.incidentReportId !== undefined &&
            item.incident.incidentReportId.toLowerCase() !==
              params.incidentReportId.toLowerCase()) ||
          (params.transportId !== undefined &&
            item.incident.transportId.toLowerCase() !==
              params.transportId.toLowerCase()),
      )
    )
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
    return page;
  },

  async getIncidentContext(
    input: string,
    signal?: AbortSignal,
    expectedScope?: string,
  ) {
    const auth = authorize(true, expectedScope);
    const id = emergencyCostIdSchema.parse(input);
    signal?.throwIfAborted();
    let value: unknown;
    if (isEmergencyCostMockMode()) {
      const { emergencyCostMockRepository } =
        await import("./mocks/repository");
      ensureActive(auth.scope, signal);
      value = emergencyCostMockRepository.incidentContext(id, auth);
    } else {
      value = unwrap(
        await apiClient.get<unknown, unknown>(
          `/incidents/${encodeURIComponent(id)}`,
          { signal },
        ),
      );
    }
    ensureActive(auth.scope, signal);
    const incident = emergencyCostIncidentSchema.parse(value);
    if (incident.incidentReportId.toLowerCase() !== id.toLowerCase())
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
    return incident;
  },

  async create(
    submission: CreateEmergencyCostSubmission,
    signal?: AbortSignal,
    expectedScope?: string,
  ) {
    const auth = authorize(true, expectedScope);
    const id = emergencyCostIdSchema.parse(submission.incidentReportId);
    const data = emergencyCostCreateSchema.parse(submission.request);
    signal?.throwIfAborted();
    let value: unknown;
    if (isEmergencyCostMockMode()) {
      const { emergencyCostMockRepository } =
        await import("./mocks/repository");
      ensureActive(auth.scope, signal);
      value = emergencyCostMockRepository.create(
        id,
        data,
        submission.mockEvidence ?? [],
        auth,
      );
    } else {
      if (
        submission.mockEvidence?.length ||
        data.photoFiles?.some((photo) =>
          /^(?:mock-evidence:|blob:|data:)/i.test(photo.publicId),
        )
      )
        throw new EmergencyCostApiError(400, "INVALID_IMAGE");
      if (data.invoiceRequired !== undefined)
        throw new EmergencyCostApiError(400, "INVOICE_CAPABILITY_UNCONFIRMED");
      value = unwrap(
        await apiClient.post<unknown, unknown>(
          `/incidents/${encodeURIComponent(id)}/emergency-cost-requests`,
          data,
          { signal },
        ),
      );
    }
    ensureActive(auth.scope, signal);
    const request = emergencyCostRequestSchema.parse(value);
    emergencyCostIdSchema.parse(request.emergencyCostRequestId);
    if (
      request.incident.incidentReportId.toLowerCase() !== id.toLowerCase() ||
      request.status !== "PENDING" ||
      request.category !== data.category ||
      request.requestedAmount !== data.requestedAmount
    )
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
    return request;
  },

  async getDetail(input: string, signal?: AbortSignal, expectedScope?: string) {
    const auth = authorize(false, expectedScope);
    const id = emergencyCostIdSchema.parse(input);
    signal?.throwIfAborted();
    let value: unknown;
    let evidence: CostEvidencePreview[] = [];
    if (isEmergencyCostMockMode()) {
      const { emergencyCostMockRepository } =
        await import("./mocks/repository");
      ensureActive(auth.scope, signal);
      const result = emergencyCostMockRepository.getDetail(id, auth);
      value = result.request;
      evidence = result.evidence;
    } else {
      value = unwrap(
        await apiClient.get<unknown, unknown>(
          `/emergency-cost-requests/${encodeURIComponent(id)}`,
          { signal },
        ),
      );
    }
    ensureActive(auth.scope, signal);
    const request = emergencyCostDetailSchema.parse(value);
    if (request.emergencyCostRequestId.toLowerCase() !== id.toLowerCase())
      throw new EmergencyCostApiError(502, "COST_SCOPE_MISMATCH");
    return { request, evidence, source: emergencyCostSource() };
  },
};

interface EmergencyCostErrorPresentation {
  message: string;
  retryable: boolean;
  outcomeUnknown?: boolean;
  submissionBlocked?: boolean;
  conflict?: boolean;
}

export function getEmergencyCostError(
  error: unknown,
  operation:
    "list" | "detail" | "create" | "context" | "cancel" | "decision" = "list",
): EmergencyCostErrorPresentation {
  const mutation =
    operation === "create" ||
    operation === "cancel" ||
    operation === "decision";
  const payload = isAxiosError(error)
    ? emergencyCostEnvelopeSchema.safeParse(error.response?.data)
    : null;
  const local =
    error instanceof EmergencyCostApiError ||
    (error instanceof Error && "status" in error && "errorCode" in error);
  const status = local
    ? Number(error.status)
    : isAxiosError(error)
      ? error.response?.status
      : undefined;
  const code = local
    ? error.errorCode
    : payload?.success
      ? payload.data.errorCode
      : undefined;
  if (mutation && status === 409) {
    const message =
      code === "EMERGENCY_COST_ALREADY_DECIDED"
        ? "This request has already been processed. The latest server details are being reloaded."
        : code === "INVALID_EMERGENCY_COST_STATUS"
          ? "Only a pending request can be cancelled. The latest details are being reloaded."
          : "This request was modified. Reload and review its latest status before submitting again.";
    return {
      message,
      retryable: false,
      conflict: true,
      submissionBlocked: true,
    };
  }
  if (code === "AMOUNT_EXCEEDS_REQUESTED")
    return {
      message:
        "Approved amount must be a positive whole number of VND and must not exceed the requested amount.",
      retryable: false,
    };
  if (status === 401 || code === "UNAUTHORIZED")
    return {
      message:
        "Your session is unavailable. Sign in again to view emergency costs.",
      retryable: false,
      submissionBlocked: true,
    };
  if (status === 403 || code === "FORBIDDEN")
    return {
      message:
        "You do not have permission to access these emergency cost requests.",
      retryable: false,
      submissionBlocked: true,
    };
  if (status === 404 || status === 501)
    return {
      message:
        code === "EMERGENCY_COST_NOT_FOUND"
          ? "This emergency cost request does not exist or is no longer available."
          : code === "INCIDENT_NOT_FOUND"
            ? "This incident does not exist or is not available."
            : "This endpoint or record is unavailable on the backend. No success is assumed.",
      retryable: false,
      submissionBlocked: true,
    };
  if (error instanceof z.ZodError || code === "COST_SCOPE_MISMATCH")
    return {
      message: mutation
        ? "The result could not be verified. The server may have processed it; reload the request or check the list before submitting again."
        : "The backend returned an unexpected emergency cost response. No financial data is displayed.",
      retryable: false,
      outcomeUnknown: mutation,
    };
  if (code === "INVALID_INCIDENT_STATUS")
    return {
      message:
        "This incident is resolved or cancelled. Reload its context before continuing.",
      retryable: false,
      submissionBlocked: true,
    };
  if (code === "INVALID_TRANSPORT_STATUS" || status === 409)
    return {
      message:
        "This transport or incident no longer permits new cost requests. Reload its context.",
      retryable: false,
      submissionBlocked: true,
    };
  if (
    code === "INVALID_IMAGE" ||
    code === "INVALID_PUBLIC_ID" ||
    code === "UPLOAD_NOT_FOUND" ||
    code === "TOO_MANY_IMAGES" ||
    code === "INVALID_FILE_TYPE" ||
    code === "FILE_TOO_LARGE" ||
    status === 413
  )
    return {
      message:
        "The supporting images were rejected. Use up to five confirmed JPG/PNG uploads of at most 5 MB each.",
      retryable: false,
    };
  if (code === "INVOICE_CAPABILITY_UNCONFIRMED")
    return {
      message:
        "VAT invoice input is unavailable until the backend DTO is confirmed.",
      retryable: false,
    };
  if (status === 400 || status === 422 || code === "VALIDATION_ERROR")
    return {
      message:
        operation === "list"
          ? "The backend rejected these filters. Review the selected filters and date range."
          : "The backend rejected the request. Review the fields and supporting uploads.",
      retryable: false,
    };
  if (mutation)
    return {
      message:
        "The result is unknown due to a network or server error. Reload the request or check the list before retrying; no automatic retry is sent.",
      retryable: false,
      outcomeUnknown: true,
    };
  return {
    message:
      "Emergency cost requests could not be loaded. Check your connection and try again.",
    retryable: true,
  };
}
