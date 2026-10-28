import { RefreshCw, TriangleAlert } from "lucide-react"

import { VndText } from "@/shared/components/incident"

import { incidentErrorMessage, toIncidentError } from "../errors"

interface RequestBrief {
  emergencyCostRequestId: string
  requestCode: string
  status: string
  requestedAmount: number
}

/** The 422 cost errors carry the blocking requests in `value` under one of these keys. */
const REQUEST_KEYS = ["pendingRequests", "requests", "approvedRequests"] as const

function blockingRequests(value: Record<string, unknown> | undefined): RequestBrief[] {
  if (!value) return []
  for (const key of REQUEST_KEYS) {
    const list = value[key]
    if (Array.isArray(list)) return list as RequestBrief[]
  }
  return []
}

interface IncidentErrorAlertProps {
  error: unknown
  /** Offered for `INCIDENT_MODIFIED`: re-read the incident instead of overwriting someone else's change. */
  onReload?: () => void
  /** Wording that replaces the default message of an `errorCode` (the crew reads other advice than the manager). */
  messages?: Record<string, string>
}

/** Error box of the write dialogs: message by `errorCode`, the blocking cost requests, field errors, and Reload on a conflict. */
export function IncidentErrorAlert({ error, onReload, messages }: IncidentErrorAlertProps) {
  const apiError = toIncidentError(error)
  const requests = blockingRequests(apiError.value)
  return (
    <div role="alert" className="grid gap-1.5 rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
      <p className="m-0 flex items-start gap-1.5 font-medium">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{incidentErrorMessage(apiError, undefined, messages)}</span>
      </p>
      {requests.length ? (
        <ul className="m-0 grid list-none gap-0.5 p-0 pl-5">
          {requests.map((request) => (
            <li key={request.emergencyCostRequestId} className="flex flex-wrap items-center gap-x-2">
              <span className="font-semibold">{request.requestCode}</span>
              <VndText amount={request.requestedAmount} />
              <span className="text-red-600">{request.status.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {apiError.errors.length ? (
        <ul className="m-0 list-disc p-0 pl-8">
          {apiError.errors.map((fieldError, index) => <li key={`${fieldError.field}-${index}`}>{fieldError.message}</li>)}
        </ul>
      ) : null}
      {apiError.errorCode === "INCIDENT_MODIFIED" && onReload ? (
        <button type="button" onClick={onReload} className="inline-flex w-fit items-center gap-1 pl-5 font-semibold underline underline-offset-2 hover:text-red-950">
          <RefreshCw className="size-3" aria-hidden="true" />
          Reload latest version
        </button>
      ) : null}
    </div>
  )
}
