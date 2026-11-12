import { isAxiosError } from "axios"
import { z } from "zod"

import { crewTurnErrorMessage } from "@/shared/constants/crew-turn"

/**
 * A readable message for a failed health request. The page used to show `error.message`, which for an AxiosError is
 * the generic "Request failed with status code 400" and for a ZodError is a JSON dump of the issues.
 */
export function healthErrorMessage(cause: unknown, fallback: string): string {
  const crewTurn = crewTurnErrorMessage(cause)
  if (crewTurn) return crewTurn
  if (cause instanceof z.ZodError)
    return "The server reply could not be read. Reload the health overview to check whether the log was saved."
  if (isAxiosError(cause)) {
    if (!cause.response) return "Unable to reach the server. Check your connection and try again."
    const message = (cause.response.data as { message?: unknown } | undefined)?.message
    return typeof message === "string" && message.trim() ? message : fallback
  }
  return cause instanceof Error && cause.message ? cause.message : fallback
}

const FIELD_MESSAGES: Record<string, string> = {
  horseId: "Select a horse.",
  temperatureCelsius: "Enter the temperature as a number, for example 38.0.",
  heartRateBpm: "Enter the heart rate as a whole number, for example 36.",
  respiratoryRateBpm: "Enter the respiratory rate as a whole number, for example 12.",
  locationDescription: "Keep the location under 500 characters.",
}

/** One readable message per form field, from the input schema's issues. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "")
    if (!field || errors[field]) continue
    errors[field] = FIELD_MESSAGES[field] ?? "Keep this note under 2,000 characters."
  }
  return errors
}
