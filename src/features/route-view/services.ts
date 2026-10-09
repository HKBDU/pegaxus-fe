import { isAxiosError } from "axios"
import { z } from "zod"
import apiClient from "@/lib/axios"
import { canAccess } from "@/features/auth/access-control"
import type { AuthPrincipal } from "@/features/auth/types"
import { useAuthStore } from "@/features/auth/store"
import { readEnvelope, getApiErrorInfo } from "@/features/transport-plan/services"
import { isFlow3MockMode } from "@/features/transport-plan/source"
import { routePlanIdSchema, routePlanDetailSchema, routePlansQuerySchema, routePlansSchema } from "./schemas"
import type { RoutePlansQuery } from "./types"

export const canViewRoute = (principal: AuthPrincipal | null) => canAccess(principal, { anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR", "TRANSPORT_SPECIALIST"] })
export const canExportRoute = (principal: AuthPrincipal | null) => canAccess(principal, { anyRole: ["LOGISTICS_MANAGER", "FLEET_ROUTE_COORDINATOR"] })
const routePath = (id: string) => `/route-plans/${encodeURIComponent(routePlanIdSchema.parse(id))}`

async function parseErrorBlob(blob: Blob) {
  let payload: unknown
  try { payload = JSON.parse(await blob.text()) } catch { throw new Error("The server did not return a valid route PDF.") }
  readEnvelope(payload)
  throw new Error("The server did not return a route PDF.")
}

export const routeViewService = {
  async getRoutes(transportPlanId: string, params: RoutePlansQuery = {}, signal?: AbortSignal) {
    const id = routePlanIdSchema.parse(transportPlanId), query = routePlansQuerySchema.parse(params)
    signal?.throwIfAborted()
    const payload = !import.meta.env.PROD && isFlow3MockMode()
      ? (await import("@/features/transport-plan/mock/mock-service")).flow3MockService.getRoutes(id, query)
      : await apiClient.get<unknown, unknown>(`/transport-plans/${encodeURIComponent(id)}/route-plans`, { params: query, signal })
    return routePlansSchema.parse(readEnvelope(payload))
  },
  async getRoute(id: string, signal?: AbortSignal) {
    const path = routePath(id)
    signal?.throwIfAborted()
    const payload = !import.meta.env.PROD && isFlow3MockMode()
      ? (await import("@/features/transport-plan/mock/mock-service")).flow3MockService.getRoute(id)
      : await apiClient.get<unknown, unknown>(path, { signal })
    return routePlanDetailSchema.parse(readEnvelope(payload))
  },
  async exportPdf(id: string, signal?: AbortSignal): Promise<Blob> {
    const path = routePath(id)
    if (!canExportRoute(useAuthStore.getState().principal)) throw new Error("You do not have permission to export route plans.")
    if (!import.meta.env.PROD && isFlow3MockMode()) throw new Error("PDF export is unavailable in development mock mode. Use the real API.")
    let blob: Blob
    try {
      blob = await apiClient.get<Blob, Blob>(`${path}/export`, { params: { format: "pdf" }, responseType: "blob", signal })
    } catch (error) {
      if (isAxiosError(error) && error.response?.data instanceof Blob) await parseErrorBlob(error.response.data)
      throw error
    }
    if (!(blob instanceof Blob)) { readEnvelope(blob); throw new Error("The server did not return a route PDF.") }
    if (blob.type.includes("json")) await parseErrorBlob(blob)
    if (!blob.size || await blob.slice(0, 5).text() !== "%PDF-") throw new Error("The server did not return a valid route PDF.")
    return blob
  },
}

export function getRouteViewError(error: unknown) {
  const { code, status, message } = getApiErrorInfo(error)
  if (code === "ROUTE_PLAN_NOT_FOUND" || code === "TRANSPORT_PLAN_NOT_FOUND" || status === 404) return { message: message || "Route plan not found or no longer available.", retryable: false }
  if (code === "FORBIDDEN" || status === 403) return { message: "You do not have permission to view this route plan.", retryable: false }
  if (code === "UNAUTHORIZED" || status === 401) return { message: "Your session has expired. Please sign in again.", retryable: false }
  if (error instanceof z.ZodError) return { message: "The server returned an unexpected route plan response.", retryable: false }
  return { message: message || "Unable to load the route plan. Please try again.", retryable: true }
}
