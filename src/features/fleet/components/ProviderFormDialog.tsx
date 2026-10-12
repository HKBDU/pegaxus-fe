import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Building2, FileText, Info, Truck, UserRound } from "lucide-react"
import { useEffect, type ReactNode } from "react"
import { useForm, type Control, type Path } from "react-hook-form"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { PROVIDER_COUNTRY_OPTIONS, PROVIDER_MODE_LABEL, PROVIDER_NOTE_MAX } from "@/features/fleet/constants/fleet.constants"
import { providerKeys, useCreateProvider, useUpdateProvider } from "@/features/fleet/hooks"
import { providerFormSchema, type ProviderFormValues } from "@/features/fleet/schemas"
import { FleetApiError } from "@/features/fleet/services"
import { TRANSPORT_MODES, type Provider, type ProviderPayload } from "@/features/fleet/types"
import { getFleetErrorCode, getFleetErrorMessage } from "@/features/fleet/utils"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const labelClass = "text-xs font-semibold leading-4 text-slate-800"
const controlClass = "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-500/30 disabled:bg-slate-50"
const hintClass = "text-[11px] leading-4 text-slate-500"

const emptyValues: ProviderFormValues = {
  providerCode: "",
  providerName: "",
  taxCode: "",
  supportedModes: [],
  contactName: "",
  phone: "",
  email: "",
  address: "",
  country: "",
  note: "",
}

function toDefaults(provider: Provider | null): ProviderFormValues {
  if (!provider) return emptyValues
  return {
    providerCode: provider.providerCode,
    providerName: provider.providerName,
    taxCode: provider.taxCode ?? "",
    supportedModes: provider.supportedModes,
    contactName: provider.contactName ?? "",
    phone: provider.phone ?? "",
    email: provider.email ?? "",
    address: provider.address ?? "",
    country: provider.country ?? "",
    note: provider.note ?? "",
  }
}

const optional = (value: string) => value.trim() || undefined

function toPayload(values: ProviderFormValues): ProviderPayload {
  return {
    providerCode: values.providerCode.trim(),
    providerName: values.providerName.trim(),
    supportedModes: values.supportedModes,
    taxCode: values.taxCode.trim(),
    contactName: optional(values.contactName),
    phone: optional(values.phone),
    email: optional(values.email),
    address: optional(values.address),
    country: optional(values.country),
    note: optional(values.note),
  }
}

function Card({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <header className="mb-3 flex items-start gap-2 border-b border-slate-100 pb-3">
        <span className="mt-0.5 text-sky-600" aria-hidden="true">{icon}</span>
        <div>
          <h3 className="m-0! text-sm! font-semibold! leading-5! text-slate-900!">{title}</h3>
          <p className={`${hintClass} m-0`}>{subtitle}</p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  )
}

type TextName = "providerName" | "taxCode" | "contactName" | "phone" | "email" | "address"

function TextField({ control, name, label, placeholder, hint, required, className }: { control: Control<ProviderFormValues>; name: TextName; label: string; placeholder: string; hint?: string; required?: boolean; className?: string }) {
  return (
    <FormField
      control={control}
      name={name as Path<ProviderFormValues>}
      render={({ field }) => (
        <FormItem className={cn("gap-1", className)}>
          <FormLabel className={labelClass}>
            {label}
            {required ? <span className="text-red-600"> *</span> : null}
          </FormLabel>
          <FormControl>
            <Input {...field} value={String(field.value ?? "")} placeholder={placeholder} spellCheck={false} className={controlClass} />
          </FormControl>
          {hint ? <p className={`${hintClass} m-0`}>{hint}</p> : null}
          <FormMessage className="text-xs" />
        </FormItem>
      )}
    />
  )
}

interface ProviderFormDialogProps {
  /** `null` = closed, `"create"` = new provider, a Provider = edit it (SCR-F3-021). */
  target: Provider | "create" | null
  onOpenChange: (open: boolean) => void
}

/** SCR-F3-021 (UC-41): create / edit transport provider. providerCode is immutable on edit (PV4). */
export function ProviderFormDialog({ target, onOpenChange }: ProviderFormDialogProps) {
  const isEdit = target !== null && target !== "create"
  const provider = isEdit ? target : null
  const queryClient = useQueryClient()
  const createProvider = useCreateProvider()
  const updateProvider = useUpdateProvider()
  const attempt = useRequestAttemptGuard()
  const form = useForm<ProviderFormValues>({ resolver: zodResolver(providerFormSchema), defaultValues: emptyValues })
  const isSaving = createProvider.isPending || updateProvider.isPending

  useEffect(() => {
    if (target !== null) form.reset(toDefaults(provider))
  }, [target, provider, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      const guarded = await attempt.run(async () => {
        const payload = toPayload(values)
        if (provider) {
          const { providerCode: _providerCode, ...rest } = payload
          await updateProvider.mutateAsync({ id: provider.transportProviderId, payload: { ...rest, lastUpdatedAt: provider.updatedAt } })
        } else {
          await createProvider.mutateAsync(payload)
        }
      })
      if (!guarded.started) return
      toast.success(provider ? "Transport provider updated successfully." : "Transport provider created successfully.")
      onOpenChange(false)
    } catch (error) {
      attempt.reset()
      const code = getFleetErrorCode(error)
      const message = getFleetErrorMessage(error, "Unable to save this provider.")
      if (code === "PROVIDER_CODE_DUPLICATED") return void form.setError("providerCode", { message }, { shouldFocus: true })
      if (code === "TAX_CODE_DUPLICATED") return void form.setError("taxCode", { message }, { shouldFocus: true })
      if (code === "PROVIDER_MODIFIED") {
        void queryClient.invalidateQueries({ queryKey: providerKeys.lists() })
        onOpenChange(false)
      }
      if (code === "VALIDATION_ERROR" && error instanceof FleetApiError && error.errors?.length) {
        for (const item of error.errors) form.setError(item.field as keyof ProviderFormValues, { message: item.message })
        return
      }
      toast.error(message)
    }
  })

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden rounded-xl p-0 sm:max-w-[640px]">
        <DialogHeader className="flex-row items-start gap-3 border-b border-slate-100 px-6 py-4 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#ef5b0c] text-white" aria-hidden="true">
            <Truck className="size-5" />
          </span>
          <div className="grid gap-0.5">
            <DialogTitle className="m-0! text-base! font-semibold! leading-6! text-slate-900!">{isEdit ? "Edit Transport Provider" : "Create Transport Provider"}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {isEdit ? "Update the details of this transport provider." : "Register a new transport provider for horse transport services."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
            <fieldset disabled={isSaving} className="m-0 grid min-w-0 gap-4 overflow-y-auto border-0 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="providerCode"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel className={labelClass}>Provider Code <span className="text-red-600">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., PRV-EUR-013" spellCheck={false} disabled={isEdit} className={controlClass} />
                      </FormControl>
                      <p className={`${hintClass} m-0`}>{isEdit ? "The provider code cannot be changed." : "A unique code for this provider."}</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="flex items-start gap-2 rounded-lg bg-sky-50 p-3 text-sky-800">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="m-0 text-xs font-semibold">Duplicate Check</p>
                    <p className="m-0 text-[11px] leading-4">Provider code and tax code will be checked for duplicates before saving.</p>
                  </div>
                </div>
              </div>

              <Card icon={<Building2 className="size-4" />} title="Basic Information" subtitle="Core details of the transport provider.">
                <TextField control={form.control} name="providerName" label="Provider Name" placeholder="e.g., EquiTrans Europe GmbH" hint="Legal name of the transport company." required />
                <TextField control={form.control} name="taxCode" label="Tax Code / VAT Number" placeholder="e.g., DE123456789" hint="Company tax code or VAT number." required />
                <FormField
                  control={form.control}
                  name="supportedModes"
                  render={({ field }) => (
                    <FormItem className="gap-1 sm:col-span-2">
                      <FormLabel className={labelClass}>Service Type <span className="text-red-600">*</span></FormLabel>
                      <div role="group" aria-label="Service types" className="flex flex-wrap gap-2">
                        {TRANSPORT_MODES.map((mode) => {
                          const selected = field.value.includes(mode)
                          return (
                            <button
                              key={mode}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => field.onChange(selected ? field.value.filter((item) => item !== mode) : [...field.value, mode])}
                              className={cn(
                                "h-9 rounded-md border px-3 text-xs font-medium transition-colors",
                                selected ? "border-orange-500 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                            >
                              {PROVIDER_MODE_LABEL[mode]}
                            </button>
                          )
                        })}
                      </div>
                      <p className={`${hintClass} m-0`}>Transport modes this provider supports.</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </Card>

              <Card icon={<UserRound className="size-4" />} title="Contact Information" subtitle="Primary contact details for operational coordination.">
                <TextField control={form.control} name="email" label="Email" placeholder="e.g., ops@equitrans-europe.de" hint="Primary operational email address." />
                <TextField control={form.control} name="phone" label="Hotline" placeholder="e.g., +49 69 1234 5678" hint="24/7 operational contact number." />
                <TextField control={form.control} name="contactName" label="Business Representative" placeholder="e.g., Anna Weber" hint="Name of the main business representative." />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel className={labelClass}>Country</FormLabel>
                      <Select value={field.value || "__none__"} onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)}>
                        <FormControl>
                          <SelectTrigger className={cn(controlClass, "justify-between")}>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-64">
                          <SelectItem value="__none__" className="text-sm">Not specified</SelectItem>
                          {PROVIDER_COUNTRY_OPTIONS.map((country) => (
                            <SelectItem key={country} value={country} className="text-sm">{country}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className={`${hintClass} m-0`}>Country where the provider is based.</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <TextField control={form.control} name="address" label="Address" placeholder="e.g., Frankfurt Airport, Cargo City Süd" className="sm:col-span-2" />
              </Card>

              <Card icon={<FileText className="size-4" />} title="Additional Information (Optional)" subtitle="Notes visible to coordinators when choosing providers.">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="gap-1 sm:col-span-2">
                      <FormControl>
                        <Textarea {...field} rows={4} maxLength={PROVIDER_NOTE_MAX} placeholder="Notes about this provider..." className={cn(controlClass, "h-auto min-h-24 py-2")} />
                      </FormControl>
                      <p className={`${hintClass} m-0 text-right`}>{field.value.length}/{PROVIDER_NOTE_MAX}</p>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </Card>
            </fieldset>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <Button type="button" variant="outline" className="h-9 rounded-md px-4 text-sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="h-9 rounded-md bg-[#ef5b0c] px-4 text-sm font-semibold text-white hover:bg-[#d84f08]">
                {isSaving ? "Saving..." : "Save Provider"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
