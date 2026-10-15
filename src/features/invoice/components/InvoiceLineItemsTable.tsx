import { ChevronLeft, ChevronRight, List, Lock, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"

import { DESCRIPTION_MAX_LENGTH, INVOICE_ITEM_TYPE, INVOICE_ITEM_TYPE_LABELS } from "@/features/invoice/constants"
import { emptyItem, type InvoiceFormValues } from "@/features/invoice/schemas"
import type { InvoiceCurrency, InvoiceItem } from "@/features/invoice/types"
import { formatMoney, parseDecimal, roundMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

const NO_HORSE = "__none__"
export const LINES_PER_PAGE = 5

const headClass = "h-9 whitespace-nowrap border-b border-[#e5e2d9] bg-[#f7f6f3] px-2 text-left font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500"
const cellClass = "border-b border-[#eeece6] px-2 py-1.5 align-middle"
const inputClass = "h-8 w-full rounded-none border-[#d8d5cb] bg-white px-2 text-xs shadow-none"
const selectClass = "h-8 w-full rounded-none border-[#d8d5cb] px-2 text-xs shadow-none"

interface InvoiceLineItemsTableProps {
  currency: InvoiceCurrency
  horses: { horseId: string; horseName: string }[]
  /** Read-only lines the server adds to a FINAL invoice. They are never sent back. */
  depositDeductionItems: InvoiceItem[]
  /** Row to bring on screen (the first invalid line after a failed submit). */
  focusRow: { index: number; nonce: number } | null
  disabled?: boolean
}

/**
 * "Line items" of the create/edit dialog: every field of a line is an input in the table row. The manager lines are
 * paged (LINES_PER_PAGE per page) so a long invoice never makes the dialog grow without limit.
 */
export function InvoiceLineItemsTable({ currency, horses, depositDeductionItems, focusRow, disabled = false }: InvoiceLineItemsTableProps) {
  const { control, register, watch, formState: { errors } } = useFormContext<InvoiceFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(fields.length / LINES_PER_PAGE))
  const currentPage = Math.min(page, pageCount - 1)
  const start = currentPage * LINES_PER_PAGE
  const visible = fields.slice(start, start + LINES_PER_PAGE)

  // A failed submit points at the first invalid line, which may be on another page (adjusted while rendering, once per request).
  const [handledNonce, setHandledNonce] = useState<number | null>(null)
  if (focusRow && focusRow.nonce !== handledNonce) {
    setHandledNonce(focusRow.nonce)
    setPage(Math.floor(focusRow.index / LINES_PER_PAGE))
  }

  function addLine() {
    append(emptyItem(), { shouldFocus: false })
    setPage(Math.floor(fields.length / LINES_PER_PAGE))
  }

  const lineErrors = (errors.items ?? []) as ({ [key: string]: { message?: string } | undefined } | undefined)[]
  const errorMessages = lineErrors.flatMap((line, index) =>
    line ? Object.values(line).filter((field) => field?.message).slice(0, 1).map((field) => `Line ${index + 1}: ${field?.message}`) : [],
  )
  const total = depositDeductionItems.length + fields.length

  return (
    <section className="border border-[#e5e2d9] bg-white" aria-label="Line items">
      <div className="flex items-center justify-between gap-2 border-b border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2.5">
        <h3 className="m-0! flex items-center gap-2 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!">
          <List className="size-4 text-orange-600" aria-hidden="true" />
          Line items ({total})
        </h3>
        <Button type="button" variant="outline" size="sm" disabled={disabled} className="h-8 rounded-none border-gray-900 bg-white text-xs" onClick={addLine}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add line
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-10" />
            <col className="w-[150px]" />
            <col />
            <col className="w-[150px]" />
            <col className="w-[72px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            <col className="w-[160px]" />
            <col className="w-10" />
          </colgroup>
          <thead>
            <tr>
              <th className={headClass}>#</th>
              <th className={headClass}>Fee type</th>
              <th className={headClass}>Description</th>
              <th className={headClass}>Horse</th>
              <th className={headClass}>Qty</th>
              <th className={headClass}>Unit price</th>
              <th className={cn(headClass, "text-right")}>Amount</th>
              <th className={headClass}>Note</th>
              <th className={headClass}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {depositDeductionItems.map((item, index) => (
              <tr key={item.invoiceItemId ?? item.description} className="bg-emerald-50/60">
                <td className={cn(cellClass, "text-gray-500")}>{index + 1}</td>
                <td className={cellClass}>{INVOICE_ITEM_TYPE_LABELS[item.itemType]}</td>
                <td className={cellClass} colSpan={2}>
                  <p className="truncate font-medium text-gray-900" title={item.description}>{item.description}</p>
                  <p className="text-[11px] text-gray-500">Added from a paid deposit, read-only</p>
                </td>
                <td className={cn(cellClass, "tabular-nums")}>{item.quantity}</td>
                <td className={cn(cellClass, "whitespace-nowrap tabular-nums")}>{formatMoney(item.price, currency)}</td>
                <td className={cn(cellClass, "whitespace-nowrap text-right font-medium tabular-nums")}>{formatMoney(item.total, currency)}</td>
                <td className={cellClass} />
                <td className={cn(cellClass, "text-emerald-700")}><Lock className="size-3.5" aria-label="Locked" /></td>
              </tr>
            ))}

            {visible.map((field, offset) => {
              const index = start + offset
              const row = lineErrors[index]
              const quantity = parseDecimal(watch(`items.${index}.quantity`) ?? "")
              const price = parseDecimal(watch(`items.${index}.price`) ?? "")
              const amount = Number.isNaN(quantity) || Number.isNaN(price) ? null : roundMoney(quantity * price)
              return (
                <tr key={field.id} className={cn(focusRow?.index === index && "bg-orange-50/50")}>
                  <td className={cn(cellClass, "text-gray-500")}>{depositDeductionItems.length + index + 1}</td>
                  <td className={cellClass}>
                    <Controller
                      control={control}
                      name={`items.${index}.itemType`}
                      render={({ field: typeField }) => (
                        <Select value={typeField.value} onValueChange={typeField.onChange} disabled={disabled}>
                          <SelectTrigger aria-label={`Fee type of line ${index + 1}`} className={selectClass}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.values(INVOICE_ITEM_TYPE).map((itemType) => <SelectItem key={itemType} value={itemType}>{INVOICE_ITEM_TYPE_LABELS[itemType]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </td>
                  <td className={cellClass}>
                    <Input
                      aria-label={`Description of line ${index + 1}`}
                      className={cn(inputClass, row?.description && "border-red-500")}
                      maxLength={DESCRIPTION_MAX_LENGTH}
                      disabled={disabled}
                      aria-invalid={Boolean(row?.description)}
                      {...register(`items.${index}.description`)}
                    />
                  </td>
                  <td className={cellClass}>
                    <Controller
                      control={control}
                      name={`items.${index}.horseId`}
                      render={({ field: horseField }) => (
                        <Select value={horseField.value || NO_HORSE} onValueChange={(value) => horseField.onChange(value === NO_HORSE ? "" : value)} disabled={disabled}>
                          <SelectTrigger aria-label={`Horse of line ${index + 1}`} className={selectClass}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_HORSE}>Whole trip</SelectItem>
                            {horses.map((horse) => <SelectItem key={horse.horseId} value={horse.horseId}>{horse.horseName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </td>
                  <td className={cellClass}>
                    <Input
                      aria-label={`Quantity of line ${index + 1}`}
                      inputMode="decimal"
                      className={cn(inputClass, row?.quantity && "border-red-500")}
                      disabled={disabled}
                      aria-invalid={Boolean(row?.quantity)}
                      {...register(`items.${index}.quantity`)}
                    />
                  </td>
                  <td className={cellClass}>
                    <Input
                      aria-label={`Unit price of line ${index + 1}`}
                      inputMode="decimal"
                      className={cn(inputClass, row?.price && "border-red-500")}
                      disabled={disabled}
                      aria-invalid={Boolean(row?.price)}
                      {...register(`items.${index}.price`)}
                    />
                  </td>
                  <td className={cn(cellClass, "whitespace-nowrap text-right font-medium tabular-nums", amount === null && "text-gray-400")}>
                    {amount === null ? "—" : formatMoney(amount, currency)}
                  </td>
                  <td className={cellClass}>
                    <Input aria-label={`Note of line ${index + 1}`} className={inputClass} disabled={disabled} {...register(`items.${index}.note`)} />
                  </td>
                  <td className={cellClass}>
                    <button
                      type="button"
                      disabled={disabled}
                      className="flex size-7 items-center justify-center text-red-500 hover:bg-red-50 disabled:opacity-50"
                      aria-label={`Delete line ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {total === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                  No fee lines yet. A draft can be saved without lines, but it cannot be issued until it has at least one.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {errorMessages.length ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
          {errorMessages.slice(0, 3).join(" · ")}{errorMessages.length > 3 ? ` · +${errorMessages.length - 3} more` : ""}
        </p>
      ) : null}

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2 text-xs text-gray-600">
          <span>Lines {start + 1}–{Math.min(start + LINES_PER_PAGE, fields.length)} of {fields.length}</span>
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon" className="size-7 rounded-none" aria-label="Previous page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-16 text-center tabular-nums">Page {currentPage + 1} / {pageCount}</span>
            <Button type="button" variant="outline" size="icon" className="size-7 rounded-none" aria-label="Next page" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
