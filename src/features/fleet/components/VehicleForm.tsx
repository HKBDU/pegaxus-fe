import { zodResolver } from "@hookform/resolvers/zod"
import { addDays, format } from "date-fns"
import { Hash, Lock, Minus, Plus } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { useForm, type Control, type Path } from "react-hook-form"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import { VehicleStatusBadge } from "@/features/fleet/components/VehicleBadges"
import {
  EQUIPMENT_PRESETS,
  VEHICLE_CAPACITY_MAX,
  VEHICLE_CAPACITY_MIN,
} from "@/features/fleet/constants/fleet.constants"
import { toVehicleDefaults } from "@/features/fleet/vehicle-form"
import { vehicleFormSchema, type VehicleFormValues } from "@/features/fleet/schemas"
import { type Vehicle } from "@/features/fleet/types"
import { Button } from "@/shared/components/ui/button"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"

export type VehicleFormMode = "create" | "edit" | "view"

const labelClass = "font-heading text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-[#181818]"
const controlClass =
  "h-10 w-full rounded-[2px] border-0 bg-[#f3f3f3] px-3 text-xs text-[#181818] shadow-none placeholder:text-[#8a8780] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-100 disabled:text-[#181818]"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 border-b border-slate-200 py-7 first:pt-0 lg:grid-cols-[200px_minmax(0,1fr)]">
      <h2 className="m-0! font-heading text-lg! leading-6! font-bold! tracking-[0.01em]! text-black! uppercase">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Locked({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <span className="flex items-center gap-1 font-heading text-[9px] font-medium uppercase tracking-[0.08em] text-slate-400">
          <Lock className="size-3" aria-hidden="true" />
          Locked
        </span>
      </div>
      <div className="flex h-10 items-center rounded-[2px] bg-[#e7e5e0] px-3 text-xs text-slate-500">{children}</div>
    </div>
  )
}

type TextName = "vehicleCode" | "vehicleName" | "licensePlate" | "vehicleType" | "manufacturer" | "model" | "registrationNumber" | "insuranceNumber"

function TextField({
  control,
  name,
  label,
  placeholder,
  required,
  adornment,
}: {
  control: Control<VehicleFormValues>
  name: TextName
  label: string
  placeholder: string
  required?: boolean
  adornment?: ReactNode
}) {
  return (
    <FormField
      control={control}
      name={name as Path<VehicleFormValues>}
      render={({ field }) => (
        <FormItem className="gap-1.5">
          <FormLabel className={labelClass}>
            {label}
            {required ? <span className="text-red-600"> *</span> : null}
          </FormLabel>
          <div className="relative">
            <FormControl>
              <Input {...field} value={String(field.value ?? "")} placeholder={placeholder} spellCheck={false} className={cn(controlClass, adornment && "pr-9")} />
            </FormControl>
            {adornment ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{adornment}</span> : null}
          </div>
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

function DateField({ control, name, label }: { control: Control<VehicleFormValues>; name: "registrationExpiryDate" | "insuranceExpiryDate"; label: string }) {
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd")
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="gap-1.5">
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              minDate={tomorrow}
              placeholder="Select date"
              displayFormat="MM/dd/yyyy"
              className={cn(controlClass, "justify-between text-left font-normal")}
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
  /** Extra footer actions shown in view mode (Edit / Update status). */
  viewActions?: ReactNode
  /** Lets the page push server-side field errors into the form. */
  onFormReady?: (form: ReturnType<typeof useForm<VehicleFormValues>>) => void
}

/** SCR-F3-025 (add), SCR-F3-026 (edit) and SCR-F3-024 (view): one layout, three modes. */
export function VehicleForm({ mode, vehicle, isSaving = false, cancelHref, onSubmit, viewActions, onFormReady }: VehicleFormProps) {
  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toVehicleDefaults(vehicle),
  })
  const isView = mode === "view"
  const isEdit = mode === "edit"

  useEffect(() => onFormReady?.(form), [form, onFormReady])
  useEffect(() => {
    if (vehicle) form.reset(toVehicleDefaults(vehicle))
  }, [vehicle, form])

  const submit = form.handleSubmit((values) => onSubmit?.(values))

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate className="booking-panel mt-4 border bg-white p-6 sm:p-8">
        <fieldset disabled={isSaving || isView} className="m-0 min-w-0 border-0 p-0">
          <Section title="Basic information">
            {isEdit || isView ? (
              <Locked label="Vehicle code">{vehicle?.vehicleCode}</Locked>
            ) : (
              <TextField control={form.control} name="vehicleCode" label="Vehicle code" placeholder="e.g., FL-RD-25" required adornment={<Hash className="size-4" />} />
            )}
            {isEdit || isView ? (
              <Locked label="Internal system ref">{vehicle?.vehicleId}</Locked>
            ) : (
              <TextField control={form.control} name="vehicleName" label="Vehicle name" placeholder="e.g., Pegaxus Titan Cruiser" />
            )}
            {isEdit || isView ? (
              <>
                <Locked label="Current status">{vehicle ? <VehicleStatusBadge status={vehicle.status} /> : null}</Locked>
                <TextField control={form.control} name="vehicleName" label="Vehicle name" placeholder="e.g., Pegaxus Titan Cruiser" />
              </>
            ) : null}
            <TextField control={form.control} name="licensePlate" label="License plate / registration no." placeholder="e.g., 29C-882.14" required />
          </Section>

          <Section title="Specifications & technical">
            <TextField control={form.control} name="vehicleType" label="Vehicle type" placeholder="e.g., Semi-Trailer Livestock Transporter" />
            <TextField control={form.control} name="manufacturer" label="Manufacturer" placeholder="e.g., Volvo, Scania, MAN, Boeing..." />
            <TextField control={form.control} name="model" label="Series / model" placeholder="e.g., FH16 EquiTrek, 777-F Horse Module..." />
            <FormField
              control={form.control}
              name="capacityHorses"
              render={({ field }) => (
                <FormItem className="gap-1.5">
                  <div className="flex items-center justify-between">
                    <FormLabel className={labelClass}>Capacity (horse stalls)</FormLabel>
                    <span className="text-[10px] text-slate-400">Standard {VEHICLE_CAPACITY_MIN} - {VEHICLE_CAPACITY_MAX} stalls</span>
                  </div>
                  <div className="grid h-10 grid-cols-[2.5rem_1fr_2.5rem] bg-[#f3f3f3]">
                    <button
                      type="button"
                      aria-label="Decrease capacity"
                      disabled={isSaving || isView || field.value <= VEHICLE_CAPACITY_MIN}
                      onClick={() => field.onChange(Math.max(VEHICLE_CAPACITY_MIN, field.value - 1))}
                      className="grid place-items-center bg-[#0b0b0b] text-white disabled:opacity-40"
                    >
                      <Minus className="size-4" />
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
                        className="min-w-0 bg-transparent text-center text-sm font-bold text-[#181818] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </FormControl>
                    <button
                      type="button"
                      aria-label="Increase capacity"
                      disabled={isSaving || isView || field.value >= VEHICLE_CAPACITY_MAX}
                      onClick={() => field.onChange(Math.min(VEHICLE_CAPACITY_MAX, (Number.isNaN(field.value) ? VEHICLE_CAPACITY_MIN - 1 : field.value) + 1))}
                      className="grid place-items-center bg-[#0b0b0b] text-white disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Inspection & insurance">
            <TextField control={form.control} name="registrationNumber" label="Inspection certificate no." placeholder="Enter certificate number" />
            <DateField control={form.control} name="registrationExpiryDate" label="Inspection expiration date" />
            <TextField control={form.control} name="insuranceNumber" label="Insurance policy no." placeholder="Enter transit insurance policy number" />
            <DateField control={form.control} name="insuranceExpiryDate" label="Insurance expiration date" />
          </Section>

          <Section title="Specialized equipment">
            <div className="grid gap-3 sm:col-span-2">
              <FormField
                control={form.control}
                name="equipmentTags"
                render={({ field }) => (
                  <FormItem className="gap-2">
                    <div role="group" aria-label="Equipment presets" className="flex flex-wrap gap-1.5">
                      {EQUIPMENT_PRESETS.map((tag) => {
                        const selected = field.value.includes(tag)
                        return (
                          <button
                            key={tag}
                            type="button"
                            aria-pressed={selected}
                            disabled={isSaving || isView}
                            onClick={() => field.onChange(selected ? field.value.filter((item) => item !== tag) : [...field.value, tag])}
                            className={cn(
                              "h-6 rounded-[2px] px-2 font-heading text-[10px] font-semibold uppercase tracking-[0.04em] transition-colors disabled:cursor-default",
                              selected ? "bg-[#ef8f00] text-slate-950" : "bg-[#0b0b0b] text-white hover:bg-slate-700",
                            )}
                          >
                            {selected ? "✓" : "+"} {tag}
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
                  <FormItem className="gap-1.5">
                    <FormLabel className={labelClass}>Detailed custom equipment notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Describe additional equipment, telemetry or special handling features" className={cn(controlClass, "h-auto min-h-28 py-2 leading-5")} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </Section>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="m-0 flex items-center gap-1.5 font-heading text-[9px] font-medium uppercase tracking-[0.08em] text-slate-500">
            <span className="inline-block size-1.5 bg-[#ef8f00]" aria-hidden="true" />
            End-to-end network encrypted data
          </p>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="h-10 rounded-[2px] px-4 font-heading text-xs font-semibold uppercase tracking-[0.06em] text-slate-900 hover:bg-slate-100">
              <Link to={cancelHref}>{isView ? "Back" : "Cancel"}</Link>
            </Button>
            {isView ? (
              viewActions
            ) : (
              <Button type="submit" disabled={isSaving} className="h-10 rounded-[2px] bg-[#ef8f00] px-8 font-heading text-xs font-semibold uppercase tracking-[0.06em] text-slate-950 hover:bg-[#db8300]">
                {isSaving ? "Saving..." : isEdit ? "Update vehicle" : "Save vehicle"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}
