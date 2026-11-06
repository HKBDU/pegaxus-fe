import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm, type Path } from "react-hook-form"
import { toast } from "sonner"
import {
  ACTIVE_PRICELIST_LOCKED,
  DUPLICATE_ITEM_CODE,
  PRICE_LIST_ITEM_MODIFIED,
  PRICE_LIST_ITEM_NOT_FOUND,
  PRICE_LIST_NOT_FOUND,
  VALIDATION_ERROR,
} from "@/features/price-list/constants"
import { getPriceListErrorCode, getPriceListErrorMessage, PriceListApiError } from "@/features/price-list/errors"
import { useCreatePriceListItem, useReloadPriceLists, useUpdatePriceListItem } from "@/features/price-list/hooks/usePriceListItemMutations"
import {
  emptyPriceListItemFormValues,
  getPriceListItemFormSchema,
  toCreateItemPayload,
  toItemFormValues,
  toUpdateItemPayload,
  type PriceListItemFormValues,
} from "@/features/price-list/schemas"
import type { PriceListItem, PriceListItemFormMode } from "@/features/price-list/types"

interface UsePriceListItemFormOptions {
  priceListId: string
  isActive: boolean
  item?: PriceListItem
  onOpenChange: (open: boolean) => void
  onSaved?: (item: PriceListItem) => void
}

/** What the form shows apart from field errors: a banner, or the "changed by someone else" state that offers a reload (never an overwrite). */
export type PriceListItemFormFailure = { kind: "banner"; message: string } | { kind: "stale"; message: string }

/** The BE may name a field `UnitPrice` or `unitPrice`; the form uses the camelCase one. */
function toFieldName(field: string) {
  return field.replace(/^\w/, (char) => char.toLowerCase())
}

/**
 * Logic of the add / edit line form (U-03), kept apart from the markup:
 * form state, locked-list rules, payloads and the mapping of every BE error to a place on screen.
 * The form starts from `item` once, when it mounts: the dialog is mounted with a new `key` for every opening,
 * so there is nothing to reset and a refetch behind the dialog never overwrites what the manager is typing.
 */
export function usePriceListItemForm({ priceListId, isActive, item, onOpenChange, onSaved }: UsePriceListItemFormOptions) {
  const mode: PriceListItemFormMode = item ? "edit" : "create"
  // On the active list an existing line only lets name, price and tier change; the rest is shown and sent back as it was.
  const locked = isActive && mode === "edit"
  const schema = useMemo(() => getPriceListItemFormSchema(mode), [mode])
  const form = useForm<PriceListItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toItemFormValues(item),
    mode: "onTouched",
  })
  const createMutation = useCreatePriceListItem(priceListId)
  const updateMutation = useUpdatePriceListItem(priceListId)
  const reloadPriceLists = useReloadPriceLists()
  const [failure, setFailure] = useState<PriceListItemFormFailure>()
  const isPending = createMutation.isPending || updateMutation.isPending

  function handleFailure(error: unknown) {
    const code = getPriceListErrorCode(error)
    const message = getPriceListErrorMessage(error)

    if (code === VALIDATION_ERROR && error instanceof PriceListApiError && error.errors?.length) {
      let placed = false
      for (const { field, message: fieldMessage } of error.errors) {
        const name = toFieldName(field)
        if (name in emptyPriceListItemFormValues) {
          form.setError(name as Path<PriceListItemFormValues>, { type: "server", message: fieldMessage })
          placed = true
        }
      }
      if (placed) return
    }
    if (code === DUPLICATE_ITEM_CODE) {
      form.setError("itemCode", { type: "server", message })
      return
    }
    if (code === PRICE_LIST_ITEM_MODIFIED) {
      setFailure({ kind: "stale", message })
      return
    }
    // The list changed under the user's feet (activated in another tab, or removed): refresh what the page shows.
    if (code === ACTIVE_PRICELIST_LOCKED || code === PRICE_LIST_NOT_FOUND || code === PRICE_LIST_ITEM_NOT_FOUND) void reloadPriceLists()
    setFailure({ kind: "banner", message })
  }

  const submit = form.handleSubmit((values) => {
    setFailure(undefined)
    const finish = (saved: PriceListItem) => {
      toast.success(mode === "create" ? `Price line ${saved.itemCode} added` : `Price line ${saved.itemCode} saved`)
      onOpenChange(false)
      onSaved?.(saved)
    }
    if (!item) {
      createMutation.mutate(toCreateItemPayload(values), { onSuccess: finish, onError: handleFailure })
      return
    }
    // Locked fields go back exactly as the BE sent them (it only refuses a changed value).
    const sent = locked ? { ...values, itemType: item.itemType, unit: item.unit, sortOrder: String(item.sortOrder) } : values
    updateMutation.mutate(
      { priceListItemId: item.priceListItemId, payload: toUpdateItemPayload(sent, item.updatedAt) },
      { onSuccess: finish, onError: handleFailure },
    )
  })

  function changeOpen(next: boolean) {
    if (isPending) return
    onOpenChange(next)
  }

  /** The "changed by someone else" state: load the current line, then the manager opens it again. */
  async function reload() {
    await reloadPriceLists()
    onOpenChange(false)
  }

  return { form, mode, locked, isPending, failure, submit, changeOpen, reload }
}
