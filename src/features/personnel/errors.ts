import type { ScheduleConflictDetails } from "@/features/personnel/types"

/** Error(errorCode) so the UI reacts to contract codes; `errors` carries per-field validation messages. */
export class PersonnelApiError extends Error {
  backendMessage?: string
  errors?: { field: string; message: string }[]
  /** `value` of a SCHEDULE_CONFLICT answer: which person / segment collided. */
  details?: ScheduleConflictDetails

  constructor(
    code: string,
    options?: { cause?: unknown; backendMessage?: string; errors?: { field: string; message: string }[]; details?: ScheduleConflictDetails },
  ) {
    super(code, { cause: options?.cause })
    this.name = "PersonnelApiError"
    this.backendMessage = options?.backendMessage
    this.errors = options?.errors
    this.details = options?.details
  }
}
