import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, Minus, Plus } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { useForm, type Control, type Path } from "react-hook-form"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { VehicleStatusBadge } from "@/features/fleet/components/VehicleBadges"
import { actionButtonClass, FormCard, formControlClass, formLabelClass, outlineButtonClass, primaryButtonClass } from "@/features/fleet/components/DetailParts"
import { EQUIPMENT_PRESETS, ROAD_VEHICLE_TYPE_OPTIONS, VEHICLE_CAPACITY_MAX, VEHICLE_CAPACITY_MIN } from "@/features/fleet/constants/fleet.constants"
import { toVehicleDefaults } from "@/features/fleet/vehicle-form"
import { nextUtcDay } from "@/features/fleet/utils"
import { vehicleFormSchema, type VehicleFormValues } from "@/features/fleet/schemas"
import { type Vehicle } from "@/features/fleet/types"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"

export type VehicleFormMode = "create" | "edit"

function Locked({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <span className={formLabelClass}>{label}</span>
        <span className="flex items-center gap-1 font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-slate-400">
          <Lock className="size-3" aria-hidden="true" />
          Locked
        </span>
      </div>
      <div className="flex h-9 items-center rounded-[2px] border border-slate-200 bg-[#f7f6f3] px-3 text-xs text-slate-500">
        <span className="truncate">{children}</span>
      </div>
    </div>
  )
}

type TextName = "vehicleName" | "licensePlate" | "manufacturer" | "model" | "registrationNumber" | "insuranceNumber"

function TextField({ control, name, label, placeholder, required }: { control: Control<VehicleFormValues>; name: TextName; label: string; placeholder: string; required?: boolean }) {
  return (
    <FormField
      control={control}
      name={name as Path<VehicleFormValues>}
      render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className={formLabelClass}>
            {label}
            {required ? <span className="text-red-600"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input {...field} value={String(field.value ?? "")} placeholder={placeholder} spellCheck={false} className={formControlClass} />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

const NO_TYPE = "__none__"

/** The vehicle type is picked from the fixed list; a type stored by older data stays selectable. */
function VehicleTypeField({ control }: { control: Control<VehicleFormValues> }) {
  return (
    <FormField
      control={control}
      name="vehicleType"
      render={({ field }) => {
        const options = field.value && !ROAD_VEHICLE_TYPE_OPTIONS.includes(field.value) ? [field.value, ...ROAD_VEHICLE_TYPE_OPTIONS] : ROAD_VEHICLE_TYPE_OPTIONS
        return (
          <FormItem className="gap-1">
            <FormLabel className={formLabelClass}>Vehicle type</FormLabel>
            <Select value={field.value || NO_TYPE} onValueChange={(value) => field.onChange(value === NO_TYPE ? "" : value)}>
              <FormControl>
                <SelectTrigger className={cn(formControlClass, "justify-between")} onBlur={field.onBlur}>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md">
                <SelectItem value={NO_TYPE} className="h-7 rounded-[2px] text-xs">Not specified</SelectItem>
                {options.map((type) => (
                  <SelectItem key={type} value={type} className="h-7 rounded-[2px] text-xs">{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage className="text-xs" />
          </FormItem>
        )
      }}
    />
  )
}

function DateField({ control, name, label }: { control: Control<VehicleFormValues>; name: "registrationExpiryDate" | "insuranceExpiryDate"; label: string }) {
  const tomorrow = nextUtcDay()
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1">
          <FormLabel className={formLabelClass}>{label}</FormLabel>
          <FormControl>
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              minDate={tomorrow}
              placeholder="Select date"
              displayFormat="dd/MM/yyyy"
              className={cn(formControlClass, "justify-between text-left font-normal")}
            />
          </FormControl>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

interface VehicleFormProps {
  mode: VehicleFormMode
  vehicle?: Vehicle
  isSaving?: boolean
  cancelHref: string
  onSubmit?: (values: VehicleFormValues) => void | Promise<void>
  /** Lets the page push server-side field errors into the form. */
  onFormReady?: (form: ReturnType<typeof useForm<VehicleFormValues>>) => void
}

/** SCR-F3-025 (add) and SCR-F3-026 (edit): booking-details style cards. The read-only view is VehicleDetailPage. */
export function VehicleForm({ mode, vehicle, isSaving = false, cancelHref, onSubmit, onFormReady }: VehicleFormProps) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toVehicleDefaults(vehicle),
  })
  const isEdit = mode === "edit"

  useEffect(() => onFormReady?.(form), [form, onFormReady])
  useEffect(() => {
    if (vehicle) form.reset(toVehicleDefaults(vehicle))
  }, [vehicle, form])

  const submit = form.handleSubmit((values) => onSubmit?.(values))

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={isSaving} className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
          <div className="grid gap-2.5 lg:grid-cols-2">
            <FormCard title="Basic information">
              {/* The BE generates the vehicle code, so there is nothing to type: it is shown once the vehicle exists. */}
              {isEdit ? <Locked label="Vehicle code">{vehicle?.vehicleCode}</Locked> : null}
              <TextField control={form.control} name="vehicleName" label="Vehicle name" placeholder="e.g., Pegaxus Titan Cruiser" />
              {isEdit ? <Locked label="Current status">{vehicle ? <VehicleStatusBadge status={vehicle.status} /> : null}</Locked> : null}
              <TextField control={form.control} name="licensePlate" label="License plate / registration no." placeholder="e.g., 29C-882.14" required />
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className={formLabelClass}>Current country</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ""} maxLength={2} placeholder="e.g., FR" className={formControlClass} /></FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )} />
            </FormCard>

            <FormCard title="Specifications & technical">
              <VehicleTypeField control={form.control} />
              <TextField control={form.control} name="manufacturer" label="Manufacturer" placeholder="e.g., Volvo, Scania, MAN" />
              <TextField control={form.control} name="model" label="Series / model" placeholder="e.g., FH16 EquiTrek" />
              <FormField
                control={form.control}
                name="capacityHorses"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel className={formLabelClass}>Capacity (horse stalls)</FormLabel>
                      <span className="text-[11px] text-slate-400">{VEHICLE_CAPACITY_MIN}–{VEHICLE_CAPACITY_MAX} stalls</span>
                    </div>
                    <div className="grid h-9 grid-cols-[2.25rem_1fr_2.25rem] border border-slate-300 bg-white">
                      <button
                        type="button"
                        aria-label="Decrease capacity"
                        disabled={isSaving || field.value <= VEHICLE_CAPACITY_MIN}
                        onClick={() => field.onChange(Math.max(VEHICLE_CAPACITY_MIN, field.value - 1))}
                        className="grid place-items-center border-r border-slate-300 text-slate-700 hover:bg-amber-50 disabled:opacity-40"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <FormControl>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={VEHICLE_CAPACITY_MIN}
                          max={VEHICLE_CAPACITY_MAX}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
                          onBlur={field.onBlur}
                          aria-label="Capacity in horse stalls"
                          className="min-w-0 bg-transparent text-center text-xs font-semibold text-[#181818] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </FormControl>
                      <button
                        type="button"
                        aria-label="Increase capacity"
                        disabled={isSaving || field.value >= VEHICLE_CAPACITY_MAX}
                        onClick={() => field.onChange(Math.min(VEHICLE_CAPACITY_MAX, (Number.isNaN(field.value) ? VEHICLE_CAPACITY_MIN - 1 : field.value) + 1))}
                        className="grid place-items-center border-l border-slate-300 text-slate-700 hover:bg-amber-50 disabled:opacity-40"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </FormCard>
          </div>

          <div className="grid gap-2.5 lg:grid-cols-2">
            <FormCard title="Inspection & insurance">
              <TextField control={form.control} name="registrationNumber" label="Inspection certificate no." placeholder="Enter certificate number" />
              <DateField control={form.control} name="registrationExpiryDate" label="Inspection expiration date" />
              <TextField control={form.control} name="insuranceNumber" label="Insurance policy no." placeholder="Enter insurance policy number" />
              <DateField control={form.control} name="insuranceExpiryDate" label="Insurance expiration date" />
            </FormCard>

            <FormCard title="Specialized equipment" columns={1}>
              <FormField
                control={form.control}
                name="equipmentTags"
                render={({ field }) => (
                  <FormItem className="gap-1.5">
                    <FormLabel className={formLabelClass}>Equipment presets</FormLabel>
                    <div role="group" aria-label="Equipment presets" className="flex flex-wrap gap-1.5">
                      {EQUIPMENT_PRESETS.map((tag) => {
                        const selected = field.value.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={selected}
                            disabled={isSaving}
                            onClick={() => field.onChange(selected ? field.value.filter((item) => item !== tag) : [...field.value, tag])}
                            className={cn(
                              "h-7 rounded-[2px] border px-2 text-[11px] font-medium transition-colors",
                              selected ? "border-[#ef8f00] bg-amber-50 text-slate-900" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
                            )}
                          >
                            {selected ? "✓" : "+"} {tag.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                          </button>
                        )
                      })}
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipmentNotes"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel className={formLabelClass}>Custom equipment notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Describe additional equipment, telemetry or special handling features" className={cn(formControlClass, "h-auto min-h-20 resize-none py-2 leading-5")} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </FormCard>
          </div>
        </fieldset>

        <div className="mt-3 flex justify-end gap-2">
          <Link to={cancelHref} className={cn(actionButtonClass, outlineButtonClass)}>
            Cancel
          </Link>
          <button type="submit" disabled={isSaving} className={cn(actionButtonClass, primaryButtonClass)}>
            {isSaving ? "Saving..." : isEdit ? "Update vehicle" : "Save vehicle"}
          </button>
        </div>
      </form>
    </Form>
  )
}
