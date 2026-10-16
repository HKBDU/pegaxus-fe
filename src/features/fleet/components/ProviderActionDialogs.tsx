import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { ProviderStatusBadge } from "@/features/fleet/components/ProviderBadges"
import { providerKeys, useChangeProviderStatus, useDeleteProvider } from "@/features/fleet/hooks"
import { providerStatusSchema, type ProviderStatusFormValues } from "@/features/fleet/schemas"
import { PROVIDER_STATUS_LABEL } from "@/features/fleet/constants/fleet.constants"
import { PROVIDER_STATUSES, type Provider } from "@/features/fleet/types"
import { getFleetErrorCode, getFleetErrorMessage } from "@/features/fleet/utils"
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
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const labelClass = "font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-slate-700"
const controlClass = "w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs text-[#181818] shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"

/** PV5: change provider status; Inactive / Suspended need a reason. */
export function ProviderStatusDialog({ provider, onOpenChange }: { provider: Provider | null; onOpenChange: (open: boolean) => void }) {
  const changeStatus = useChangeProviderStatus()
  const queryClient = useQueryClient()
  const attempt = useRequestAttemptGuard()
  const form = useForm<ProviderStatusFormValues>({
    resolver: zodResolver(providerStatusSchema),
    defaultValues: { status: "INACTIVE", reason: "" },
  })

  useEffect(() => {
    if (provider) form.reset({ status: PROVIDER_STATUSES.find((status) => status !== provider.status) ?? "ACTIVE", reason: "" })
  }, [provider, form])

  const submit = form.handleSubmit(async (values) => {
    if (!provider) return
    try {
      const guarded = await attempt.run(() =>
        changeStatus.mutateAsync({
          id: provider.transportProviderId,
          payload: { status: values.status, ...(values.reason ? { reason: values.reason } : {}), lastUpdatedAt: provider.updatedAt },
        }),
      )
      if (!guarded.started) return
      toast.success("Provider status updated successfully.")
      onOpenChange(false)
    } catch (error) {
      attempt.reset()
      toast.error(getFleetErrorMessage(error, "Unable to update the provider status."))
      if (getFleetErrorCode(error) === "PROVIDER_MODIFIED") {
        // Stale updatedAt: reload the list so the next attempt starts from the current row.
        void queryClient.invalidateQueries({ queryKey: providerKeys.lists() })
        onOpenChange(false)
      }
    }
  })

  return (
    <Dialog open={provider !== null} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 rounded-[2px] border-slate-200 bg-white sm:max-w-[440px]">
        <DialogHeader className="text-left">
          <DialogTitle className="m-0! font-heading text-2xl! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">Change provider status</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {provider ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">{provider.providerCode} — {provider.providerName}</span>
                <ProviderStatusBadge status={provider.status} />
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} noValidate className="grid gap-3">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className={labelClass}>New status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={`${controlClass} h-9 justify-between`}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
                      {PROVIDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="h-7 rounded-[2px] text-xs">{PROVIDER_STATUS_LABEL[status]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className={labelClass}>Reason (required for Inactive / Suspended)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} maxLength={500} placeholder="e.g., Contract ended" className={`${controlClass} min-h-20 py-2`} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 shadow-none" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={changeStatus.isPending} className="h-8 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 shadow-none hover:bg-[#db8300]">
                {changeStatus.isPending ? "Updating..." : "Confirm"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/** PV6: soft delete. A provider still assigned to unfinished segments comes back as 409 PROVIDER_IN_USE. */
export function ProviderDeleteDialog({ provider, onOpenChange, onDeleted }: { provider: Provider | null; onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
  const deleteProvider = useDeleteProvider()
  const attempt = useRequestAttemptGuard()

  const confirm = async () => {
    if (!provider) return
    try {
      const guarded = await attempt.run(() => deleteProvider.mutateAsync(provider.transportProviderId))
      if (!guarded.started) return
      toast.success("Transport provider deleted successfully.")
      onOpenChange(false)
      onDeleted?.()
    } catch (error) {
      attempt.reset()
      toast.error(getFleetErrorMessage(error, "Unable to delete this provider."))
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={provider !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 p-5 data-[size=default]:sm:max-w-[400px]">
        <AlertDialogHeader className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3 text-left">
          <AlertDialogMedia className="m-0 grid size-8 place-items-center rounded-[2px] bg-red-50 text-red-600">
            <Trash2 className="size-4" />
          </AlertDialogMedia>
          <div className="grid gap-1">
            <AlertDialogTitle className="col-start-1! m-0! w-full! justify-self-start! text-left! font-heading text-lg! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">Delete transport provider?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              {provider ? <span className="font-semibold text-slate-900">{provider.providerCode} — {provider.providerName}</span> : null}
              {": "}it will be hidden from new selections. Existing route segments keep their reference.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end gap-2">
          <AlertDialogCancel className="h-8 rounded-[2px] border-slate-300 bg-white px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-900 shadow-none">Cancel</AlertDialogCancel>
          <Button type="button" size="sm" disabled={deleteProvider.isPending} onClick={() => void confirm()} className="h-8 rounded-[2px] bg-red-600 px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-white shadow-none hover:bg-red-700">
            {deleteProvider.isPending ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
