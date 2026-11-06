import {
  isAxiosError,
  type AxiosRequestConfig,
  type AxiosRequestTransformer,
} from "axios";
import { z } from "zod";
import apiClient from "@/lib/axios";
import { canAccess, normalizeRole } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { PRICE_LIST_HEADER_ERROR_MESSAGES } from "../header.constants";
import {
  createPriceListHeaderSchema,
  updatePriceListHeaderSchema,
  priceListHeaderSchema,
  priceListHeaderEnvelopeSchema,
  type CreatePriceListHeaderInput,
  type UpdatePriceListHeaderInput,
} from "../header.schemas";

export class PriceListHeaderApiError extends Error {
  readonly errorCode: string;
  readonly status: number;
  readonly backendMessage?: string;
  readonly errors: { field: string; message: string }[];
  readonly retryAfterSeconds?: number;
  constructor(
    errorCode: string,
    status = 0,
    backendMessage?: string,
    errors: { field: string; message: string }[] = [],
    retryAfterSeconds?: number,
  ) {
    super(errorCode);
    this.name = "PriceListHeaderApiError";
    this.errorCode = errorCode;
    this.status = status;
    this.backendMessage = backendMessage;
    this.errors = errors;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function priceListHeaderScope() {
  const auth = useAuthStore.getState();
  return JSON.stringify([
    auth.principal?.id,
    auth.sessionVersion,
    Boolean(auth.accessToken),
    auth.principal?.roles.map(normalizeRole).sort(),
  ]);
}
export function canManagePriceListHeaders() {
  const auth = useAuthStore.getState();
  return (
    Boolean(auth.accessToken && !auth.accessToken.startsWith("demo-")) &&
    canAccess(auth.principal, { anyRole: ["LOGISTICS_MANAGER"] })
  );
}
function assertSession(scope: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (scope !== priceListHeaderScope())
    throw new PriceListHeaderApiError("SESSION_CHANGED");
  if (!canManagePriceListHeaders())
    throw new PriceListHeaderApiError("FORBIDDEN", 403);
}
function retryAfter(header: unknown) {
  if (typeof header !== "string" && typeof header !== "number")
    return undefined;
  const numeric = Number(header);
  if (String(header).trim() && Number.isFinite(numeric) && numeric >= 0)
    return Math.ceil(numeric);
  const at = Date.parse(String(header));
  return Number.isFinite(at)
    ? Math.max(0, Math.ceil((at - Date.now()) / 1000))
    : undefined;
}
export function getPriceListHeaderError(
  error: unknown,
): PriceListHeaderApiError {
  if (error instanceof PriceListHeaderApiError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const parsed = priceListHeaderEnvelopeSchema.safeParse(
      error.response?.data,
    );
    const code = parsed.success ? parsed.data.errorCode : undefined;
    return new PriceListHeaderApiError(
      code ||
        (status === 401
          ? "UNAUTHORIZED"
          : status === 403
            ? "FORBIDDEN"
            : status === 429
              ? "TOO_MANY_REQUESTS"
              : status === 0 || status >= 500
                ? "OUTCOME_UNKNOWN"
                : "REQUEST_FAILED"),
      status,
      parsed.success ? parsed.data.message : undefined,
      parsed.success ? (parsed.data.errors ?? []) : [],
      retryAfter(error.response?.headers?.["retry-after"]),
    );
  }
  return new PriceListHeaderApiError(
    error instanceof z.ZodError ? "VALIDATION_ERROR" : "OUTCOME_UNKNOWN",
  );
}
export function getPriceListHeaderErrorMessage(error: unknown) {
  const failure = getPriceListHeaderError(error);
  if (failure.status >= 500)
    return PRICE_LIST_HEADER_ERROR_MESSAGES.OUTCOME_UNKNOWN;
  // Tier names come from the server, not a client-side eligibility calculation.
  const text =
    failure.errorCode === "PRICE_LIST_TIER_MISSING"
      ? (failure.backendMessage ??
        "The price list must cover vehicle tiers S, M and L.")
      : (PRICE_LIST_HEADER_ERROR_MESSAGES[failure.errorCode] ??
        failure.backendMessage ??
        "Unable to complete this price list action.");
  return failure.retryAfterSeconds
    ? `${text} Try again in ${failure.retryAfterSeconds} seconds.`
    : text;
}

async function write(
  config: AxiosRequestConfig,
  scope: string,
  signal?: AbortSignal,
) {
  assertSession(scope, signal);
  try {
    const guard: AxiosRequestTransformer = (data: unknown) => {
      assertSession(scope, signal);
      return data;
    };
    const defaults = apiClient.defaults.transformRequest;
    const serializers = Array.isArray(defaults)
      ? defaults
      : defaults
        ? [defaults]
        : [];
    const response = await apiClient.request<unknown, unknown>({
      ...config,
      signal,
      transformRequest: [guard, ...serializers],
    });
    assertSession(scope, signal);
    const parsed = priceListHeaderEnvelopeSchema.safeParse(response);
    if (!parsed.success) throw new PriceListHeaderApiError("INVALID_RESPONSE");
    const envelope = parsed.data;
    if (!envelope.isSuccess || envelope.code < 200 || envelope.code >= 300)
      throw new PriceListHeaderApiError(
        envelope.errorCode ?? "REQUEST_FAILED",
        envelope.code,
        envelope.message,
        envelope.errors ?? [],
      );
    const result = priceListHeaderSchema.safeParse(envelope.value);
    if (!result.success) throw new PriceListHeaderApiError("INVALID_RESPONSE");
    return result.data;
  } catch (error) {
    if (scope !== priceListHeaderScope())
      throw new PriceListHeaderApiError("SESSION_CHANGED");
    throw getPriceListHeaderError(error);
  }
}
const path = (id: string) =>
  `/price-lists/${encodeURIComponent(z.string().min(1).parse(id))}`;
export function createPriceList(
  input: CreatePriceListHeaderInput,
  signal?: AbortSignal,
  scope = priceListHeaderScope(),
) {
  return write(
    {
      method: "POST",
      url: "/price-lists",
      data: createPriceListHeaderSchema.parse(input),
    },
    scope,
    signal,
  );
}
export function updatePriceList(
  id: string,
  input: UpdatePriceListHeaderInput,
  signal?: AbortSignal,
  scope = priceListHeaderScope(),
) {
  return write(
    {
      method: "PUT",
      url: path(id),
      data: updatePriceListHeaderSchema.parse(input),
    },
    scope,
    signal,
  );
}
export function activatePriceList(
  id: string,
  signal?: AbortSignal,
  scope = priceListHeaderScope(),
) {
  return write({ method: "POST", url: `${path(id)}/activate` }, scope, signal);
}
export function clonePriceList(
  id: string,
  signal?: AbortSignal,
  scope = priceListHeaderScope(),
) {
  return write({ method: "POST", url: `${path(id)}/clone` }, scope, signal);
}
