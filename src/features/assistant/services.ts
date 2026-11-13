import apiClient from "@/lib/axios"
import { assistantReplySchema, assistantRequestSchema } from "./schemas"
import type { AssistantReply, AssistantRequest } from "./types"

interface ApiEnvelope<T> { value: T }
interface AssistantApiError { response?: { status?: number; data?: { errorCode?: string } } }

export function getAssistantErrorCode(cause: unknown): string {
  const { response } = (cause ?? {}) as AssistantApiError
  if (response?.status === 504) return "GEMINI_TIMEOUT"
  if (response?.status === 502) return "GEMINI_UNAVAILABLE"
  return response?.data?.errorCode ?? "ASSISTANT_ERROR"
}

export async function sendAssistantMessage(request: AssistantRequest, signal?: AbortSignal): Promise<AssistantReply> {
  const parsedRequest = assistantRequestSchema.parse(request)
  try {
    const response = await apiClient.post<unknown>("assistant/chat", parsedRequest, { signal })
    return assistantReplySchema.parse((response as unknown as ApiEnvelope<unknown>).value) as AssistantReply
  } catch (cause) {
    const error = new Error(getAssistantErrorCode(cause), { cause })
    Object.assign(error, { status: (cause as AssistantApiError)?.response?.status })
    throw error
  }
}