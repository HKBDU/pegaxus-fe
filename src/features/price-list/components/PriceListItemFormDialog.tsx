import { Lock } from "lucide-react"
import { Controller } from "react-hook-form"
import {
  ALL_TIERS_LABEL,
  ALL_TIERS_VALUE,
  PRICE_LIST_ITEM_LIMITS,
  PRICE_LIST_ITEM_TYPE_LABELS,
  PRICE_LIST_ITEM_TYPES,
  PRICE_LIST_TIER_LABELS,
  PRICE_LIST_TIERS,
  PRICE_LIST_UNIT_HINTS,
  PRICE_LIST_UNIT_LABELS,
  PRICE_LIST_UNITS,
} from "@/features/price-list/constants"
import { FieldError, controlClass, fieldLabelClass, outlineButtonClass, primaryButtonClass } from "@/features/price-list/components/PriceListPrimitives"
import { usePriceListItemForm } from "@/features/price-list/hooks/usePriceListItemForm"
import type { PriceListItemFormDialogProps } from "@/features/price-list/types"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { MoneyInput } from "@/shared/components/ui/money-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

function ReadOnlyMark() {
  return (
    <span className="ml-1.5 inline-flex items-center gap-0.5 normal-case tracking-normal text-gray-500">
      <Lock aria-hidden="true" className="size-3" />
      read-only
    </span>
  )
}

/**
 * Add a price line, or edit one (UC-79). Only offered for a list that is not active: an active list is locked as a whole.
 * Every field can be edited except the item code, which is read-only once the line exists. All the logic lives in `usePriceListItemForm`.
 * Give it a new `key` for every opening: the form takes its starting values from `item` when it mounts.
 */
export function PriceListItemFormDialog({ priceListId, item, currency = "VND", open, onOpenChange, onSaved }: PriceListItemFormDialogProps) {
  const { form, mode, isPending, failure, submit, changeOpen, reload } = usePriceListItemForm({ priceListId, item, onOpenChange, onSaved })
  const { control, register, watch, formState: { errors } } = form
  const unit = watch("unit")
  const stale = failure?.kind === "stale"
  const disabled = isPending || stale

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-[0.04em]">
            {mode === "create" ? "Add price line" : `Edit price line · ${item?.itemCode}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "The line becomes part of this price list. Invoices created after it is activated can use it."
              : "Changes apply to invoices created from now on. Saved invoices keep their numbers."}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={submit} className="space-y-3" aria-label={mode === "create" ? "Add price line" : "Edit price line"}>
          <div>
            <label htmlFor="price-item-code" className={fieldLabelClass}>Item code {mode === "create" ? <span className="text-red-500">*</span> : <ReadOnlyMark />}</label>
            <Controller
              control={control}
              name="itemCode"
              render={({ field }) => (
                <Input
                  id="price-item-code"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                  onBlur={field.onBlur}
                  readOnly={mode === "edit"}
                  maxLength={PRICE_LIST_ITEM_LIMITS.itemCodeMax}
                  placeholder="e.g. STRAW"
                  autoComplete="off"
                  className={`${controlClass} font-mono ${mode === "edit" ? "bg-gray-50 text-gray-500" : ""}`}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.itemCode)}
                />
              )}
            />
            {mode === "create" ? <p className="mt-1 text-[11px] text-gray-500">Letters A–Z, digits and _ only. It cannot be changed later.</p> : null}
            <FieldError message={errors.itemCode?.message} />
          </div>

          <div>
            <label htmlFor="price-item-name" className={fieldLabelClass}>Name <span className="text-red-500">*</span></label>
            <Input
              id="price-item-name"
              maxLength={PRICE_LIST_ITEM_LIMITS.itemNameMax}
              placeholder="Shown as the description of the invoice line"
              className={controlClass}
              disabled={disabled}
              aria-invalid={Boolean(errors.itemName)}
              {...register("itemName")}
            />
            <FieldError message={errors.itemName?.message} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="price-item-type" className={fieldLabelClass}>Type <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="itemType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                    <SelectTrigger id="price-item-type" className={controlClass} aria-invalid={Boolean(errors.itemType)}>
                      <SelectValue placeholder="Select a type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_LIST_ITEM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{PRICE_LIST_ITEM_TYPE_LABELS[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.itemType?.message} />
            </div>

            <div>
              <label htmlFor="price-item-unit" className={fieldLabelClass}>Unit <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                    <SelectTrigger id="price-item-unit" className={controlClass} aria-invalid={Boolean(errors.unit)}>
                      <SelectValue placeholder="Select a unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICE_LIST_UNITS.map((value) => (
                        <SelectItem key={value} value={value}>{PRICE_LIST_UNIT_LABELS[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {unit ? <p className="mt-1 text-[11px] text-gray-500">{PRICE_LIST_UNIT_HINTS[unit]}</p> : null}
              <FieldError message={errors.unit?.message} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="price-item-price" className={fieldLabelClass}>Unit price ({currency}) <span className="text-red-500">*</span></label>
              <Controller
                control={control}
                name="unitPrice"
                render={({ field }) => (
                  <MoneyInput
                    id="price-item-price"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="e.g. 1,600"
                    className={controlClass}
                    disabled={disabled}
                    aria-invalid={Boolean(errors.unitPrice)}
                  />
                )}
              />
              <FieldError message={errors.unitPrice?.message} />
            </div>

            <div>
              <label htmlFor="price-item-tier" className={fieldLabelClass}>Vehicle tier</label>
              <Controller
                control={control}
                name="vehicleTier"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                    <SelectTrigger id="price-item-tier" className={controlClass} aria-invalid={Boolean(errors.vehicleTier)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TIERS_VALUE}>{ALL_TIERS_LABEL}</SelectItem>
                      {PRICE_LIST_TIERS.map((tier) => (
                        <SelectItem key={tier} value={tier}>{PRICE_LIST_TIER_LABELS[tier]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.vehicleTier?.message} />
            </div>
          </div>

          <div>
            <label htmlFor="price-item-order" className={fieldLabelClass}>Sort order</label>
            <Controller
              control={control}
              name="sortOrder"
              render={({ field }) => (
                <Input
                  id="price-item-order"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
                  onBlur={field.onBlur}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={mode === "create" ? "Leave empty to put the line last" : "Leave empty to keep the current order"}
                  className={controlClass}
                  disabled={disabled}
                  aria-invalid={Boolean(errors.sortOrder)}
                />
              )}
            />
            <p className="mt-1 text-[11px] text-gray-500">Whole number from 0 to 1,000,000. Lines are listed, and shown on invoices, in this order.</p>
            <FieldError message={errors.sortOrder?.message} />
          </div>

          {failure ? (
            <div role="alert" className="flex flex-col gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{failure.message}</span>
              {stale ? (
                <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => void reload()}>Reload latest</Button>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className={outlineButtonClass} disabled={isPending} onClick={() => changeOpen(false)}>Cancel</Button>
            <Button type="submit" className={primaryButtonClass} disabled={disabled}>
              {isPending ? "Saving..." : mode === "create" ? "Add line" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
