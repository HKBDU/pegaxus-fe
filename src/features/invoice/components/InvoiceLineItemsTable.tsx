import { getCoreRowModel, getPaginationRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { List, Lock, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useFieldArray, useFormContext } from "react-hook-form"

import { DESCRIPTION_MAX_LENGTH, INVOICE_ITEM_TYPE, INVOICE_ITEM_TYPE_LABELS } from "@/features/invoice/constants"
import { emptyItem, type InvoiceFormValues } from "@/features/invoice/schemas"
import type { InvoiceCurrency, InvoiceItem } from "@/features/invoice/types"
import { formatMoney, parseDecimal, roundMoney } from "@/features/invoice/utils"
import { cn } from "@/lib/utils"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

const NO_HORSE = "__none__"
const DEFAULT_PAGE_SIZE = 5

const inputClass = "h-8 w-full rounded-[2px] border-slate-300 bg-white px-2 text-xs shadow-none focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
const selectClass = "h-8 w-full rounded-[2px] border-slate-300 bg-white px-2 text-xs shadow-none"
const selectContentClass = "rounded-[2px] border-slate-200 bg-white p-0.5 shadow-md"
const selectItemClass = "h-7 rounded-[2px] text-xs"

/** A table row is either a read-only deposit deduction or the n-th editable line of the form array. */
type LineRow = { kind: "deduction"; item: InvoiceItem } | { kind: "line"; index: number }

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
 * "Line items" of the create/edit dialog: a data table whose rows are inputs. It is paged like the transport request
 * table (rows per page + page buttons), so a long invoice never makes the dialog grow without limit.
 */
export function InvoiceLineItemsTable({ currency, horses, depositDeductionItems, focusRow, disabled = false }: InvoiceLineItemsTableProps) {
  const { control, register, watch, formState: { errors } } = useFormContext<InvoiceFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: "items" })
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })

  const rows = useMemo<LineRow[]>(
    () => [
      ...depositDeductionItems.map((item) => ({ kind: "deduction", item }) as const),
      ...fields.map((_, index) => ({ kind: "line", index }) as const),
    ],
    [depositDeductionItems, fields],
  )
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))
  const pageIndex = Math.min(pagination.pageIndex, pageCount - 1)

  // A failed submit points at the first invalid line, which may be on another page (adjusted while rendering, once per request).
  const [handledNonce, setHandledNonce] = useState<number | null>(null)
  if (focusRow && focusRow.nonce !== handledNonce) {
    setHandledNonce(focusRow.nonce)
    setPagination((current) => ({ ...current, pageIndex: Math.floor((depositDeductionItems.length + focusRow.index) / current.pageSize) }))
  }

  function addLine() {
    append(emptyItem(), { shouldFocus: false })
    setPagination((current) => ({ ...current, pageIndex: Math.floor(total / current.pageSize) }))
  }

  const lineErrors = (errors.items ?? []) as ({ [key: string]: { message?: string } | undefined } | undefined)[]
  const errorMessages = lineErrors.flatMap((line, index) =>
    line ? Object.values(line).filter((field) => field?.message).slice(0, 1).map((field) => `Line ${index + 1}: ${field?.message}`) : [],
  )

  const columns: ColumnDef<LineRow>[] = [
    {
      id: "no",
      header: "#",
      cell: ({ row }) => <span className="text-gray-500">{row.index + 1}</span>,
    },
    {
      id: "itemType",
      header: "FEE TYPE",
      cell: ({ row }) =>
        row.original.kind === "deduction" ? (
          <span className="block min-w-32">{INVOICE_ITEM_TYPE_LABELS[row.original.item.itemType]}</span>
        ) : (
          <Controller
            control={control}
            name={`items.${row.original.index}.itemType`}
            render={({ field: typeField }) => (
              <Select value={typeField.value} onValueChange={typeField.onChange} disabled={disabled}>
                <SelectTrigger aria-label={`Fee type of line ${row.index + 1}`} className={cn(selectClass, "min-w-32")}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {Object.values(INVOICE_ITEM_TYPE).map((itemType) => <SelectItem key={itemType} value={itemType} className={selectItemClass}>{INVOICE_ITEM_TYPE_LABELS[itemType]}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        ),
    },
    {
      id: "description",
      header: "DESCRIPTION",
      cell: ({ row }) => {
        const line = row.original
        if (line.kind === "deduction") {
          return (
            <div className="min-w-52">
              <p className="m-0 truncate font-medium text-gray-900" title={line.item.description}>{line.item.description}</p>
              <p className="m-0 text-[11px] text-gray-500">Added from a paid deposit, read-only</p>
            </div>
          )
        }
        return (
          <Input
            aria-label={`Description of line ${row.index + 1}`}
            className={cn(inputClass, "min-w-52", lineErrors[line.index]?.description && "border-red-500")}
            maxLength={DESCRIPTION_MAX_LENGTH}
            disabled={disabled}
            aria-invalid={Boolean(lineErrors[line.index]?.description)}
            {...register(`items.${line.index}.description`)}
          />
        )
      },
    },
    {
      id: "horse",
      header: "HORSE",
      cell: ({ row }) =>
        row.original.kind === "deduction" ? null : (
          <Controller
            control={control}
            name={`items.${row.original.index}.horseId`}
            render={({ field: horseField }) => (
              <Select value={horseField.value || NO_HORSE} onValueChange={(value) => horseField.onChange(value === NO_HORSE ? "" : value)} disabled={disabled}>
                <SelectTrigger aria-label={`Horse of line ${row.index + 1}`} className={cn(selectClass, "min-w-32")}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentClass}>
                  <SelectItem value={NO_HORSE} className={selectItemClass}>Whole trip</SelectItem>
                  {horses.map((horse) => <SelectItem key={horse.horseId} value={horse.horseId} className={selectItemClass}>{horse.horseName}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        ),
    },
    {
      id: "quantity",
      header: "QTY",
      cell: ({ row }) => {
        const line = row.original
        if (line.kind === "deduction") return <span className="tabular-nums">{line.item.quantity}</span>
        return (
          <Input
            aria-label={`Quantity of line ${row.index + 1}`}
            inputMode="decimal"
            className={cn(inputClass, "w-16", lineErrors[line.index]?.quantity && "border-red-500")}
            disabled={disabled}
            aria-invalid={Boolean(lineErrors[line.index]?.quantity)}
            {...register(`items.${line.index}.quantity`)}
          />
        )
      },
    },
    {
      id: "price",
      header: "UNIT PRICE",
      cell: ({ row }) => {
        const line = row.original
        if (line.kind === "deduction") return <span className="whitespace-nowrap tabular-nums">{formatMoney(line.item.price, currency)}</span>
        return (
          <Input
            aria-label={`Unit price of line ${row.index + 1}`}
            inputMode="decimal"
            className={cn(inputClass, "w-28", lineErrors[line.index]?.price && "border-red-500")}
            disabled={disabled}
            aria-invalid={Boolean(lineErrors[line.index]?.price)}
            {...register(`items.${line.index}.price`)}
          />
        )
      },
    },
    {
      id: "amount",
      header: () => <span className="block w-full text-right">AMOUNT</span>,
      cell: ({ row }) => {
        const line = row.original
        if (line.kind === "deduction") return <span className="block whitespace-nowrap text-right font-medium tabular-nums">{formatMoney(line.item.total, currency)}</span>
        const quantity = parseDecimal(watch(`items.${line.index}.quantity`) ?? "")
        const price = parseDecimal(watch(`items.${line.index}.price`) ?? "")
        const amount = Number.isNaN(quantity) || Number.isNaN(price) ? null : roundMoney(quantity * price)
        return <span className={cn("block whitespace-nowrap text-right font-medium tabular-nums", amount === null && "text-gray-400")}>{amount === null ? "—" : formatMoney(amount, currency)}</span>
      },
    },
    {
      id: "note",
      header: "NOTE",
      cell: ({ row }) =>
        row.original.kind === "deduction" ? null : <Input aria-label={`Note of line ${row.index + 1}`} className={cn(inputClass, "min-w-32")} disabled={disabled} {...register(`items.${row.original.index}.note`)} />,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        row.original.kind === "deduction" ? (
          <div className="flex justify-center text-emerald-700"><Lock className="size-3.5" aria-label="Locked" /></div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              disabled={disabled}
              className="flex size-7 items-center justify-center rounded-[2px] text-red-500 hover:bg-red-50 disabled:opacity-50"
              aria-label={`Delete line ${row.index + 1}`}
              onClick={() => remove((row.original as { kind: "line"; index: number }).index)}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ),
    },
  ]

  const table = useReactTable({
    data: rows,
    columns,
    state: { pagination: { pageIndex, pageSize: pagination.pageSize } },
    onPaginationChange: (updater) => setPagination((current) => (typeof updater === "function" ? updater({ pageIndex, pageSize: current.pageSize }) : updater)),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <section className="border border-[#e5e2d9] bg-white" aria-label="Line items">
      <div className="flex items-center justify-between gap-2 border-b border-[#e5e2d9] bg-[#f7f6f3] px-4 py-2.5">
        <h3 className="m-0! flex items-center gap-2 font-heading text-[13px]! font-bold! uppercase tracking-[0.04em]! text-gray-900!">
          <List className="size-4 text-[#ef8f00]" aria-hidden="true" />
          Line items ({total})
        </h3>
        <Button type="button" variant="outline" size="sm" disabled={disabled} className="h-8 rounded-[2px] border-gray-900 bg-white text-xs" onClick={addLine}>
          <Plus className="size-3.5" aria-hidden="true" />
          Add line
        </Button>
      </div>

      <div className="p-3">
        <DataTable
          table={table}
          className="gap-2.5"
          containerClassName="booking-panel overflow-x-auto"
          tableClassName="min-w-[900px]"
          headerClassName="bg-[#e9e6de]"
          headerCellClassName="h-10 whitespace-nowrap px-2 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          rowClassName={cn("border-slate-200 hover:bg-amber-50/60")}
          cellClassName="px-2 py-1.5 text-xs"
          emptyMessage="No fee lines yet. A draft can be saved without lines, but it cannot be issued until it has at least one."
          footer={
            total > 0 ? (
              <TablePagination
                meta={{
                  totalItems: total,
                  totalPages: pageCount,
                  itemsPerPage: pagination.pageSize,
                  currentPage: pageIndex + 1,
                  hasPreviousPage: pageIndex > 0,
                  hasNextPage: pageIndex < pageCount - 1,
                }}
                onPageChange={(page) => setPagination((current) => ({ ...current, pageIndex: page - 1 }))}
                onPageSizeChange={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
                pageSizeAriaLabel="Lines per page"
              />
            ) : null
          }
        />
      </div>

      {errorMessages.length ? (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">
          {errorMessages.slice(0, 3).join(" · ")}{errorMessages.length > 3 ? ` · +${errorMessages.length - 3} more` : ""}
        </p>
      ) : null}
    </section>
  )
}
