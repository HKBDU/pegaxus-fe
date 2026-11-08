import apiClient from "@/lib/axios"
import { PriceListApiError, type ApiFieldError } from "../errors"

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

export function deletePriceListItem(priceListId: string, itemId: string) {
  return call<void>(apiClient.delete(`/price-lists/${encodeURIComponent(priceListId)}/items/${encodeURIComponent(itemId)}`))
}
