import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { providerKeys, useCreateProvider, useUpdateProvider } from "@/features/fleet/hooks"
import { providerFormSchema, type ProviderFormValues } from "@/features/fleet/schemas"
import { FleetApiError } from "@/features/fleet/services"
import type { Provider, ProviderPayload } from "@/features/fleet/types"
import { getFleetErrorCode, getFleetErrorMessage } from "@/features/fleet/utils"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const emptyValues: ProviderFormValues = {
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

/**
 * Form state + save of a transport provider (SCR-F3-021, UC-41), shared by the create popup and the edit page.
 * The BE generates providerCode (immutable, shown read-only on edit). `onSaved` runs after a successful save; `onStale` after PROVIDER_MODIFIED.
 */
export function useProviderForm(provider: Provider | null, { enabled = true, onSaved, onStale }: { enabled?: boolean; onSaved: (saved: "created" | "updated") => void; onStale?: () => void }) {
  const queryClient = useQueryClient()
  const createProvider = useCreateProvider()
  const updateProvider = useUpdateProvider()
  const attempt = useRequestAttemptGuard()
  const form = useForm<ProviderFormValues>({ resolver: zodResolver(providerFormSchema), defaultValues: toDefaults(provider) })
  const isSaving = createProvider.isPending || updateProvider.isPending

  useEffect(() => {
    if (enabled) form.reset(toDefaults(provider))
  }, [enabled, provider, form])

  const submit = form.handleSubmit(async (values) => {
    try {
      const guarded = await attempt.run(async () => {
        const payload = toPayload(values)
        if (provider) {
          await updateProvider.mutateAsync({ id: provider.transportProviderId, payload: { ...payload, lastUpdatedAt: provider.updatedAt } })
        } else {
          await createProvider.mutateAsync(payload)
        }
      })
      if (!guarded.started) return
      toast.success(provider ? "Transport provider updated successfully." : "Transport provider created successfully.")
      onSaved(provider ? "updated" : "created")
    } catch (error) {
      attempt.reset()
      const code = getFleetErrorCode(error)
      const message = getFleetErrorMessage(error, "Unable to save this provider.")
      if (code === "TAX_CODE_DUPLICATED") return void form.setError("taxCode", { message }, { shouldFocus: true })
      if (code === "PROVIDER_MODIFIED") {
        void queryClient.invalidateQueries({ queryKey: providerKeys.lists() })
        if (provider) void queryClient.invalidateQueries({ queryKey: providerKeys.detail(provider.transportProviderId) })
        onStale?.()
      }
      if (code === "VALIDATION_ERROR" && error instanceof FleetApiError && error.errors?.length) {
        for (const item of error.errors) form.setError(item.field as keyof ProviderFormValues, { message: item.message })
        return
      }
      toast.error(message)
    }
  })

  return { form, submit, isSaving }
}
