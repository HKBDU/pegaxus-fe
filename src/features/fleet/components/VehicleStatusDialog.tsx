import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { MANUAL_STATUS_OPTION_LABEL } from "@/features/fleet/constants/fleet.constants"
import { useChangeVehicleStatus } from "@/features/fleet/hooks"
import { vehicleStatusSchema, type VehicleStatusFormValues } from "@/features/fleet/schemas"
import { MANUAL_VEHICLE_STATUSES, type Vehicle } from "@/features/fleet/types"
import { getFleetErrorCode, getFleetErrorMessage } from "@/features/fleet/utils"
import { VehicleStatusBadge } from "@/features/fleet/components/VehicleBadges"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const labelClass = "font-heading text-[11px] font-semibold uppercase leading-4 tracking-[0.06em] text-[#181818]"
const controlClass = "w-full rounded-[2px] border-0 bg-[#f3f3f3] px-3 text-xs text-[#181818] shadow-none focus-visible:ring-2 focus-visible:ring-primary/40"

function defaultStatus(vehicle: Vehicle): VehicleStatusFormValues["status"] {
  return MANUAL_VEHICLE_STATUSES.find((status) => status !== vehicle.status) ?? "AVAILABLE"
}

interface VehicleStatusDialogProps {
  /** Dialog is open while a vehicle is given. */
  vehicle: Vehicle | null
  onOpenChange: (open: boolean) => void
  onChanged?: () => void
}

/** SCR-F3-027: manual status change (AVAILABLE / MAINTENANCE / INACTIVE) with a mandatory reason (VH5). */
export function VehicleStatusDialog({ vehicle, onOpenChange, onChanged }: VehicleStatusDialogProps) {
  const changeStatus = useChangeVehicleStatus()
  const attempt = useRequestAttemptGuard()
  const form = useForm<VehicleStatusFormValues>({
    resolver: zodResolver(vehicleStatusSchema),
    defaultValues: { status: "MAINTENANCE", reason: "" },
  })

  useEffect(() => {
    if (vehicle) form.reset({ status: defaultStatus(vehicle), reason: "" })
  }, [vehicle, form])

  const isSystemManaged = vehicle?.status === "ASSIGNED" || vehicle?.status === "IN_USE"

  const submit = form.handleSubmit(async (values) => {
    if (!vehicle) return
    try {
      const guarded = await attempt.run(() =>
        changeStatus.mutateAsync({ id: vehicle.vehicleId, payload: { lastUpdatedAt: vehicle.updatedAt, ...values } }),
      )
      if (!guarded.started) return
      toast.success("Vehicle status updated successfully.")
      onChanged?.()
      onOpenChange(false)
    } catch (error) {
      attempt.reset()
      const code = getFleetErrorCode(error)
      if (code === "VEHICLE_MODIFIED") onChanged?.()
      toast.error(getFleetErrorMessage(error, "Unable to update the vehicle status."))
    }
  })

  return (
    <Dialog open={vehicle !== null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden rounded-[2px] border-0 bg-white p-0 sm:max-w-[500px]">
        <DialogHeader className="gap-0 bg-[#e9e6de] px-5 py-3 text-left">
          <DialogTitle className="m-0! flex items-center gap-2 font-heading text-lg! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">
            <span className="inline-block size-2 bg-[#ef8f00]" aria-hidden="true" />
            Update vehicle status
          </DialogTitle>
          <DialogDescription className="sr-only">Change the operational status of the selected vehicle.</DialogDescription>
        </DialogHeader>

        {vehicle ? (
          <Form {...form}>
            <form onSubmit={submit} noValidate>
              <fieldset disabled={changeStatus.isPending} className="grid gap-4 px-5 py-4">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <p className="m-0 font-heading text-sm font-bold uppercase text-slate-900">
                    {vehicle.vehicleCode}
                    {vehicle.vehicleName ? ` — ${vehicle.vehicleName}` : ""}
                  </p>
                  <span className="flex shrink-0 items-center gap-1.5 font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">
                    Current: <VehicleStatusBadge status={vehicle.status} />
                  </span>
                </div>

                {isSystemManaged ? (
                  <p role="alert" className="m-0 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    This vehicle is {vehicle.status === "ASSIGNED" ? "assigned to a route" : "in use on an active trip"}. Its status is managed automatically and cannot be changed manually.
                  </p>
                ) : null}

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>New status *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className={`${controlClass} h-9 justify-between`}>
                            <SelectValue placeholder="Select new status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-[2px]">
                          {MANUAL_VEHICLE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status} className="text-xs">
                              {MANUAL_STATUS_OPTION_LABEL[status]}
                            </SelectItem>
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
                    <FormItem className="gap-1.5">
                      <FormLabel className={labelClass}>Reason / operational note *</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} maxLength={500} placeholder="Describe why the status is changing" className={`${controlClass} min-h-24 py-2`} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </fieldset>

              <div className="flex justify-end gap-2 bg-[#f5f3ee] px-5 py-3">
                <Button type="button" variant="outline" className="h-9 rounded-[2px] border-0 bg-[#e0ded8] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-800 shadow-none hover:bg-[#d5d3cc]" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={changeStatus.isPending} className="h-9 rounded-[2px] bg-[#ef8f00] px-5 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]">
                  {changeStatus.isPending ? "Updating..." : "Confirm status change"}
                </Button>
              </div>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
