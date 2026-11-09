import apiClient from "@/lib/axios"
import { PriceListApiError, type ApiFieldError } from "../errors"
import type { PriceListPage, PriceListQueryParams } from "../list.schemas"

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) return (payload as { value: T }).value
  return payload as T
}

async function call<T>(request: Promise<unknown>): Promise<T> {
  try {
    return unwrap<T>(await request)
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string; message?: string; errors?: ApiFieldError[] } } }).response?.data
    if (data?.errorCode) throw new PriceListApiError(data.errorCode, { cause: error, backendMessage: data.message, errors: data.errors })
    throw error
  }
}

export function getPriceLists(params: PriceListQueryParams, signal?: AbortSignal) {
  const { pageIndex = 1, pageSize = 10, sortBy = "createdAt:desc", search, isActive } = params
  return call<PriceListPage>(apiClient.get("/price-lists", {
    // The BE accepts a page size of 1 to 100 and answers 400 otherwise.
    params: { pageIndex, pageSize: Math.min(Math.max(pageSize, 1), 100), sortBy, ...(search?.trim() ? { search: search.trim() } : {}), ...(typeof isActive === "boolean" ? { isActive } : {}) },
    signal,
  }))
}
