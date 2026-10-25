import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Textarea } from "@/shared/components/ui/textarea"

import { useCancelIncident } from "../hooks/useIncidents"
import { CANCEL_REASON_MAX, CANCEL_REASON_MIN, cancelFormSchema } from "../schemas"
import type { CancelFormValues, Incident } from "../types"
import { IncidentErrorAlert } from "./IncidentErrorAlert"

interface CancelIncidentDialogProps {
  incident: Incident
  open: boolean
  onOpenChange: (open: boolean) => void
  onReload: () => void
}

/** SCR-F5-006 (IN10, Logistics Manager): cancel an incident that was reported by mistake. Pending cost requests are cancelled with it. */
export function CancelIncidentDialog({ incident, open, onOpenChange, onReload }: CancelIncidentDialogProps) {
  const cancel = useCancelIncident(incident.incidentReportId)
  const [error, setError] = useState<unknown>(null)
  const form = useForm<CancelFormValues>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: { cancellationReason: "" },
    mode: "onChange",
  })
  const reason = form.watch("cancellationReason")
  const pending = incident.costSummary.pendingCount

  const close = (next: boolean) => {
    if (!next) {
      form.reset()
      setError(null)
      cancel.reset()
    }
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await cancel.mutateAsync({ lastUpdatedAt: incident.updatedAt, cancellationReason: values.cancellationReason.trim() })
      toast.success(`Incident ${incident.incidentCode} cancelled`)
      close(false)
    } catch (caught) {
      setError(caught)
    }
  })

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[420px]">
        <AlertDialogHeader className="grid grid-rows-none grid-cols-[28px_minmax(0,1fr)] place-items-start gap-2.5 text-left">
          <AlertDialogMedia className="m-0 grid size-7 shrink-0 place-items-center rounded-[2px] bg-red-50 text-red-600">
            <TriangleAlert className="size-3.5" />
          </AlertDialogMedia>
          <div className="grid gap-0.5">
            <AlertDialogTitle className="col-auto! m-0! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">
              Cancel incident {incident.incidentCode}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              Use this only when the incident was reported by mistake. A cancelled incident cannot be reopened.
              {pending > 0 ? ` ${pending} pending cost request${pending > 1 ? "s" : ""} will be cancelled automatically.` : ""}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <Form {...form}>
          <form id="cancel-incident-form" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="cancellationReason"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="font-heading text-[11px] font-medium tracking-[0.04em] text-slate-700 uppercase">Cancellation reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      maxLength={CANCEL_REASON_MAX}
                      disabled={cancel.isPending}
                      placeholder="Explain why this incident is being cancelled"
                      className="min-h-16 resize-y rounded-[2px] border-slate-300 bg-white px-3 py-2 text-xs leading-4 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                    />
                  </FormControl>
                  <div className="flex items-start justify-between gap-2">
                    <FormMessage />
                    <span className={`ml-auto text-[11px] ${reason.trim().length < CANCEL_REASON_MIN ? "text-slate-500" : "text-emerald-700"}`}>
                      {reason.length} / {CANCEL_REASON_MAX} (min {CANCEL_REASON_MIN})
                    </span>
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>

        {error ? <IncidentErrorAlert error={error} onReload={() => { close(false); onReload() }} /> : null}

        <AlertDialogFooter className="gap-1.5 [&>button]:h-10 sm:[&>button]:h-8">
          <AlertDialogCancel size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none" disabled={cancel.isPending}>
            Keep incident
          </AlertDialogCancel>
          <button
            type="submit"
            form="cancel-incident-form"
            disabled={cancel.isPending || !form.formState.isValid}
            className="inline-flex h-8 items-center justify-center rounded-[2px] bg-red-600 px-3 text-xs font-normal text-white shadow-none transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50"
          >
            {cancel.isPending ? "Cancelling..." : "Cancel incident"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
