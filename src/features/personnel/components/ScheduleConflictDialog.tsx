import { CalendarX2, UserRoundPlus } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { ROLE_LABEL } from "@/features/personnel/constants"
import { useAssignableEmployees } from "@/features/personnel/hooks"
import type { AssignableRole, EmployeeBrief, ScheduleConflictDetails } from "@/features/personnel/types"
import { employeeLabel, formatDateTime, overlapWindow } from "@/features/personnel/utils"
import { CancelButton, InfoNote, PersonnelDialog, PrimaryButton } from "@/features/personnel/components/PersonnelDialog"
import { labelClass } from "@/features/personnel/components/PersonnelUi"

export interface ScheduleConflict {
  /** `message` of the 409 SCHEDULE_CONFLICT answer, shown as is. */
  message: string
  role: Extract<AssignableRole, "DRIVER" | "ESCORT">
  /** Person that caused it. Undefined when the message did not match any selected person. */
  employee?: EmployeeBrief
  segmentLabel: string
  /** Transport plan the segment belongs to (TP3 `planCode`). */
  planCode?: string
  /** Optional structured `value` of the 409 answer; the dialog degrades to the message when it is missing. */
  details?: ScheduleConflictDetails
  window: { from: string; to: string }
}

interface ScheduleConflictDialogProps {
  conflict: ScheduleConflict | null
  onClose: () => void
  /** Called with the chosen replacement; the caller puts it into its own form and keeps every other selection. */
  onChoose: (employee: EmployeeBrief) => void
}

/** SCR-F3-019: the BE rejected a driver / escort with SCHEDULE_CONFLICT; offer the free people of the same window. */
export function ScheduleConflictDialog({ conflict, onClose, onChoose }: ScheduleConflictDialogProps) {
  // The pick belongs to one conflict: a new conflict object starts with nothing selected.
  const [pick, setPick] = useState<{ conflict: ScheduleConflict | null; id: string }>({ conflict: null, id: "" })
  const selectedId = pick.conflict === conflict ? pick.id : ""
  const alternatives = useAssignableEmployees(conflict?.role ?? "DRIVER", { from: conflict?.window.from, to: conflict?.window.to }, conflict !== null)
  const roleLabel = conflict ? ROLE_LABEL[conflict.role].toLowerCase() : "driver"
  const options = (alternatives.data?.items ?? []).filter((employee) => employee.employeeId !== conflict?.employee?.employeeId)

  const chosen = options.find((employee) => employee.employeeId === selectedId)
  // Overlap = intersection of the window being assigned and the window of the segment that already holds the person.
  const existing = conflict?.details
  const overlap =
    conflict && existing?.conflictingPlannedDepartureAt && existing.conflictingPlannedArrivalAt
      ? overlapWindow(conflict.window, { from: existing.conflictingPlannedDepartureAt, to: existing.conflictingPlannedArrivalAt })
      : null

  return (
    <PersonnelDialog
      open={conflict !== null}
      onOpenChange={(open) => !open && onClose()}
      title={`${conflict ? ROLE_LABEL[conflict.role] : "Driver"} schedule conflict`}
      description={`The selected ${roleLabel} is already assigned to another transport during the requested time window.`}
      className="sm:max-w-[520px]"
      footer={
        <>
          <CancelButton onClick={onClose} label="Close" />
          <PrimaryButton type="button" disabled={!chosen} onClick={() => chosen && onChoose(chosen)}>
            <UserRoundPlus className="size-4" aria-hidden="true" />
            Choose another {roleLabel}
          </PrimaryButton>
        </>
      }
    >
      {conflict ? (
        <>
          <dl className="m-0 grid gap-3 border bg-slate-50 p-4 text-xs">
            {conflict.employee ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-slate-500">{ROLE_LABEL[conflict.role]}</dt>
                <dd className="m-0 font-semibold text-slate-900">{employeeLabel(conflict.employee)}</dd>
              </div>
            ) : null}
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-slate-500">Attempted assignment</dt>
              <dd className="m-0 font-semibold text-slate-900">
                {conflict.segmentLabel}
                {conflict.planCode ? <span className="block text-[11px] font-normal text-slate-500">Transport plan: {conflict.planCode}</span> : null}
              </dd>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-slate-500">Time window</dt>
              <dd className="m-0 font-semibold text-slate-900">
                {formatDateTime(conflict.window.from)} → {formatDateTime(conflict.window.to)}
              </dd>
            </div>
            {conflict.details?.conflictingTransportPlanCode ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-slate-500">Conflict found with</dt>
                <dd className="m-0 font-semibold text-slate-900">{conflict.details.conflictingTransportPlanCode}</dd>
              </div>
            ) : null}
            {overlap ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-slate-500">Overlap period</dt>
                <dd className="m-0 font-semibold text-slate-900">
                  {formatDateTime(overlap.from)} → {formatDateTime(overlap.to)}
                </dd>
              </div>
            ) : null}
            {conflict.details?.conflictingFromLocationName && conflict.details.conflictingToLocationName ? (
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <dt className="text-slate-500">Existing assignment route</dt>
                <dd className="m-0 font-semibold text-slate-900">
                  {conflict.details.conflictingFromLocationName} → {conflict.details.conflictingToLocationName}
                </dd>
              </div>
            ) : null}
          </dl>

          <p role="alert" className="m-0 flex items-start gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <CalendarX2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {conflict.message}
          </p>

          <div className="grid gap-2">
            <span className={labelClass}>Alternative available {roleLabel}s</span>
            {alternatives.isLoading ? <p className="m-0 text-xs text-slate-500">Loading available {roleLabel}s...</p> : null}
            {alternatives.isError ? <InfoNote tone="error">Unable to load alternative {roleLabel}s.</InfoNote> : null}
            {!alternatives.isLoading && !alternatives.isError && !options.length ? (
              <InfoNote tone="warning">No other {roleLabel} is available in this time window.</InfoNote>
            ) : null}
            {options.length ? (
              <ul className="m-0 grid list-none gap-1 border p-1" role="radiogroup" aria-label={`Alternative ${roleLabel}s`}>
                {options.map((employee) => {
                  const active = employee.employeeId === selectedId
                  return (
                    <li key={employee.employeeId}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPick({ conflict, id: employee.employeeId })}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-slate-50",
                          active && "bg-orange-50 ring-1 ring-[#ef8f00]",
                        )}
                      >
                        <span className={cn("grid size-4 shrink-0 place-items-center rounded-full border", active ? "border-[#ef8f00]" : "border-slate-300")}>
                          {active ? <span className="size-2 rounded-full bg-[#ef8f00]" /> : null}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{employee.employeeCode}</span>
                        <span className="font-semibold text-slate-900">{employee.fullName}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}
    </PersonnelDialog>
  )
}
