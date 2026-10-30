import { Check, X } from "lucide-react"
import { formatInvoiceDateTime } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import type { Claim } from "@/features/claim/types"
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperNav, StepperSeparator, StepperTitle } from "@/shared/components/ui/stepper"

interface Step {
  key: string
  label: string
  at: string | null
  state: "done" | "current" | "todo" | "failed"
}

/** Progress as the customer reads it: derived only from the dates the BE returns, never from guessed rules. */
function buildSteps(claim: Claim): Step[] {
  const decidedAt = claim.resolution?.resolvedAt ?? null
  const decision: Step =
    claim.status === "REJECTED"
      ? { key: "decision", label: "Rejected", at: claim.resolvedAt ?? decidedAt, state: "failed" }
      : { key: "decision", label: "Approved", at: decidedAt, state: decidedAt ? "done" : "todo" }
  const steps: Step[] = [
    { key: "submitted", label: "Submitted", at: claim.submittedAt, state: "done" },
    { key: "review", label: "Under review", at: claim.reviewedAt, state: claim.reviewedAt ? "done" : "todo" },
    decision,
  ]
  if (claim.status !== "REJECTED") steps.push({ key: "resolved", label: "Resolved", at: claim.status === "RESOLVED" ? claim.resolvedAt : null, state: claim.status === "RESOLVED" ? "done" : "todo" })
  if (claim.status === "CANCELLED") steps.push({ key: "cancelled", label: "Cancelled", at: claim.cancelledAt, state: "failed" })

  // The first open step of a live claim is the one being worked on.
  if (claim.status !== "CANCELLED") {
    const next = steps.find((step) => step.state === "todo")
    if (next) next.state = "current"
  }
  return steps
}

const stateLabel: Record<Step["state"], string> = { done: "completed", failed: "failed", current: "in progress", todo: "not reached yet" }

/** What the dot of a step shows: a tick when reached, a cross when it ended badly, a pulse for the open step, else its number. */
function StepMark({ state, index }: { state: Step["state"]; index: number }) {
  if (state === "done") return <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
  if (state === "failed") return <X className="size-3.5" strokeWidth={3} aria-hidden="true" />
  if (state === "current") return <span className="block size-2 rounded-full bg-current motion-safe:animate-pulse" aria-hidden="true" />
  return <span aria-hidden="true">{index + 1}</span>
}

/**
 * Read-only progress on the reui Stepper (no trigger, so nothing is clickable). `value` is the open step; reached steps are
 * marked `completed` explicitly because a claim can skip one (a decision without a recorded review) or end early (rejected,
 * cancelled), where "everything before the open step is done" would be wrong. `data-tone` lets the indicator turn red.
 * Steps share the width equally and sit centred in their column; the line runs from one dot to the next, so the margins on
 * both sides match and the lines get longer when there are fewer steps.
 */
export function ClaimProgress({ claim }: { claim: Claim }) {
  const steps = buildSteps(claim)
  const openStep = steps.findIndex((step) => step.state === "current") + 1
  return (
    <Stepper value={openStep} role="group" aria-label="Claim progress">
      <StepperNav>
        {steps.map((step, index) => (
          <StepperItem
            key={step.key}
            step={index + 1}
            completed={step.state === "done" || step.state === "failed"}
            data-tone={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative min-w-0 flex-1 items-start justify-center"
          >
            <div className="flex min-w-0 flex-col items-center gap-2 px-1 text-center">
              <StepperIndicator
                className={cn(
                  "size-6 text-[11px] font-semibold",
                  "data-[state=completed]:bg-emerald-600 data-[state=completed]:text-white group-data-[tone=failed]/step:data-[state=completed]:bg-red-600",
                  "data-[state=active]:bg-amber-50 data-[state=active]:text-[#ef8f00] data-[state=active]:ring-2 data-[state=active]:ring-[#ef8f00]",
                  "data-[state=inactive]:bg-slate-100 data-[state=inactive]:text-slate-400 data-[state=inactive]:ring-1 data-[state=inactive]:ring-slate-300 data-[state=inactive]:ring-inset",
                )}
              >
                <StepMark state={step.state} index={index} />
              </StepperIndicator>
              <div className="min-w-0 space-y-0.5">
                <StepperTitle
                  className={cn(
                    "font-heading text-[11px] leading-4 font-semibold tracking-[0.05em] uppercase",
                    step.state === "todo" ? "text-gray-400" : step.state === "failed" ? "text-red-700" : "text-gray-900",
                  )}
                >
                  {step.label}
                  <span className="sr-only">, {stateLabel[step.state]}</span>
                </StepperTitle>
                <StepperDescription className="text-[11px] leading-4 text-gray-500">
                  {step.at ? formatInvoiceDateTime(step.at) : step.state === "current" ? "In progress" : "—"}
                </StepperDescription>
              </div>
            </div>
            {index < steps.length - 1 ? (
              <StepperSeparator className="absolute top-3 right-[calc(-50%+1.125rem)] left-[calc(50%+1.125rem)] m-0 -translate-y-1/2 bg-slate-200 data-[state=completed]:bg-emerald-500" />
            ) : null}
          </StepperItem>
        ))}
      </StepperNav>
    </Stepper>
  )
}
