import { Check, ChevronDown, ChevronUp, List, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"

import { DESCRIPTION_MAX_LENGTH, INVOICE_ITEM_TYPES, INVOICE_ITEM_TYPE_LABELS } from "@/features/invoice/constants"
import { emptyItem, type InvoiceFormValues } from "@/features/invoice/schemas"
import type { InvoiceCurrency, InvoiceItem } from "@/features/invoice/types"
import { formatMoney, parseDecimal, roundMoney } from "@/features/invoice/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

const NO_HORSE = "__none__"
const labelClass = "text-[11px] font-medium text-gray-500"
const headClass = "px-3 py-2 text-left text-[11px] font-medium text-gray-500"

interface InvoiceLineItemsTableProps {
  currency: InvoiceCurrency
  horses: { horseId: string; horseName: string }[]
  /** Read-only lines the server adds to a FINAL invoice. They are never sent back. */
  depositDeductionItems: InvoiceItem[]
  /** Row currently open in the editor; owned by the dialog so a failed submit can open the first invalid row. */
  editingIndex: number | null
  onEditingIndexChange: (index: number | null) => void
  disabled?: boolean
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-[11px] text-red-600" role="alert">{message}</p> : null
}

/** "Line Items" card of the dialog: a table with an edit and a delete action per row, like the design. */
export function InvoiceLineItemsTable({ currency, horses, depositDeductionItems, editingIndex, onEditingIndexChange, disabled = false }: InvoiceLineItemsTableProps) {
  const { control, register, watch, trigger, formState: { errors } } = useFormContext<InvoiceFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const [collapsed, setCollapsed] = useState(false)
  const rowCount = depositDeductionItems.length + fields.length

  function addLine() {
    setCollapsed(false)
    append(emptyItem(), { shouldFocus: false })
    onEditingIndexChange(fields.length)
  }

  function removeLine(index: number) {
    remove(index)
    if (editingIndex === null) return
    if (editingIndex === index) onEditingIndexChange(null)
    else if (editingIndex > index) onEditingIndexChange(editingIndex - 1)
  }

  async function finishEditing(index: number) {
    if (await trigger(`items.${index}`)) onEditingIndexChange(null)
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white" aria-label="Line items">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="m-0! flex items-center gap-2 text-sm! font-semibold! tracking-normal! text-gray-900!">
          <List className="size-4 text-orange-500" aria-hidden="true" />
          Line Items ({rowCount})
        </h3>
        <button
          type="button"
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand line items" : "Collapse line items"}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>

      {collapsed ? null : (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[620px] border-collapse text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`${headClass} w-10`}>#</th>
                  <th className={headClass}>Description</th>
                  <th className={`${headClass} w-14`}>Qty</th>
                  <th className={`${headClass} w-28`}>Unit Price</th>
                  <th className={`${headClass} w-28`}>Amount</th>
                  <th className={`${headClass} w-20`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {depositDeductionItems.map((item, index) => (
                  <tr key={item.invoiceItemId ?? item.description} className="border-t border-gray-100 bg-emerald-50/50">
                    <td className="px-3 py-2.5 text-gray-500">{index + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <p className="text-[11px] text-gray-500">Added automatically from a paid deposit. It cannot be edited or removed.</p>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{item.quantity}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatMoney(item.price, currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums">{formatMoney(item.total, currency)}</td>
                    <td className="px-3 py-2.5 text-emerald-700"><Lock className="size-3.5" aria-label="Locked" /></td>
                  </tr>
                ))}

                {fields.map((field, index) => {
                  const rowNumber = depositDeductionItems.length + index + 1
                  const lineErrors = errors.items?.[index]
                  if (editingIndex === index) {
                    return (
                      <tr key={field.id} className="border-t border-gray-100 bg-orange-50/40">
                        <td className="px-3 py-3 align-top text-gray-500">{rowNumber}</td>
                        <td colSpan={5} className="px-3 py-3">
                          <div className="grid gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-4">
                              <label className={labelClass} htmlFor={`items.${index}.itemType`}>Fee type</label>
                              <Controller
                                control={control}
                                name={`items.${index}.itemType`}
                                render={({ field: typeField }) => (
                                  <Select value={typeField.value} onValueChange={typeField.onChange}>
                                    <SelectTrigger id={`items.${index}.itemType`} className="mt-1 h-9 w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {INVOICE_ITEM_TYPES.map((itemType) => (
                                        <SelectItem key={itemType} value={itemType}>{INVOICE_ITEM_TYPE_LABELS[itemType]}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                            <div className="sm:col-span-8">
                              <label className={labelClass} htmlFor={`items.${index}.description`}>Description</label>
                              <Input
                                id={`items.${index}.description`}
                                className="mt-1 h-9 bg-white text-xs"
                                maxLength={DESCRIPTION_MAX_LENGTH}
                                autoFocus
                                aria-invalid={Boolean(lineErrors?.description)}
                                {...register(`items.${index}.description`)}
                              />
                              <FieldError message={lineErrors?.description?.message} />
                            </div>
                            <div className="sm:col-span-3">
                              <label className={labelClass} htmlFor={`items.${index}.quantity`}>Quantity</label>
                              <Input
                                id={`items.${index}.quantity`}
                                inputMode="decimal"
                                className="mt-1 h-9 bg-white text-xs"
                                aria-invalid={Boolean(lineErrors?.quantity)}
                                {...register(`items.${index}.quantity`)}
                              />
                              <FieldError message={lineErrors?.quantity?.message} />
                            </div>
                            <div className="sm:col-span-4">
                              <label className={labelClass} htmlFor={`items.${index}.price`}>Unit price ({currency})</label>
                              <Input
                                id={`items.${index}.price`}
                                inputMode="decimal"
                                className="mt-1 h-9 bg-white text-xs"
                                aria-invalid={Boolean(lineErrors?.price)}
                                {...register(`items.${index}.price`)}
                              />
                              <FieldError message={lineErrors?.price?.message} />
                            </div>
                            <div className="sm:col-span-5">
                              <label className={labelClass} htmlFor={`items.${index}.horseId`}>Horse (optional)</label>
                              <Controller
                                control={control}
                                name={`items.${index}.horseId`}
                                render={({ field: horseField }) => (
                                  <Select value={horseField.value || NO_HORSE} onValueChange={(value) => horseField.onChange(value === NO_HORSE ? "" : value)}>
                                    <SelectTrigger id={`items.${index}.horseId`} className="mt-1 h-9 w-full bg-white text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={NO_HORSE}>Whole trip</SelectItem>
                                      {horses.map((horse) => <SelectItem key={horse.horseId} value={horse.horseId}>{horse.horseName}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <FieldError message={lineErrors?.horseId?.message} />
                            </div>
                            <div className="sm:col-span-12">
                              <label className={labelClass} htmlFor={`items.${index}.note`}>Note (optional)</label>
                              <Input id={`items.${index}.note`} className="mt-1 h-9 bg-white text-xs" {...register(`items.${index}.note`)} />
                              <FieldError message={lineErrors?.note?.message} />
                            </div>
                            <div className="flex justify-end gap-2 sm:col-span-12">
                              <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeLine(index)}>
                                <Trash2 className="size-3.5" aria-hidden="true" />
                                Remove
                              </Button>
                              <Button type="button" size="sm" className="bg-orange-600 text-white hover:bg-orange-700" onClick={() => void finishEditing(index)}>
                                <Check className="size-3.5" aria-hidden="true" />
                                Done
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  const quantity = parseDecimal(watch(`items.${index}.quantity`) ?? "")
                  const price = parseDecimal(watch(`items.${index}.price`) ?? "")
                  const valid = !Number.isNaN(quantity) && !Number.isNaN(price)
                  const itemType = watch(`items.${index}.itemType`)
                  const horseName = horses.find((horse) => horse.horseId === watch(`items.${index}.horseId`))?.horseName
                  return (
                    <tr key={field.id} className="border-t border-gray-100">
                      <td className="px-3 py-2.5 text-gray-500">{rowNumber}</td>
                      <td className="px-3 py-2.5">
                        <p className="break-words text-gray-900">{watch(`items.${index}.description`) || "—"}</p>
                        <p className="text-[11px] text-gray-500">{[INVOICE_ITEM_TYPE_LABELS[itemType], horseName].filter(Boolean).join(" · ")}</p>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{valid ? quantity : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{valid ? formatMoney(price, currency) : "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums">{valid ? formatMoney(roundMoney(quantity * price), currency) : "—"}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={disabled}
                            className="rounded p-1 text-orange-500 hover:bg-orange-50 disabled:opacity-50"
                            aria-label={`Edit line ${rowNumber}`}
                            onClick={() => onEditingIndexChange(index)}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
                            aria-label={`Delete line ${rowNumber}`}
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {rowCount === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      No fee lines yet. A draft can be saved without lines, but it cannot be issued until it has at least one.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="outline" disabled={disabled} className="mt-3 h-9 text-xs" onClick={addLine}>
            <Plus className="size-4" aria-hidden="true" />
            Add Line Item
          </Button>
        </div>
      )}
    </section>
  )
}
