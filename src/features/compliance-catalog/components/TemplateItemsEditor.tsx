import { MoreVertical, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form"

import { cn } from "@/lib/utils"
import { templateItemSchema, type TemplateFormValues, type TemplateItemFormValues } from "@/features/compliance-catalog/template-schemas"
import { TablePagination } from "@/shared/components/common/TablePagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Switch } from "@/shared/components/ui/switch"
import { Textarea } from "@/shared/components/ui/textarea"
import { TruncatedText } from "@/features/compliance-catalog/components/TruncatedText"
import { TooltipProvider } from "@/shared/components/ui/tooltip"

export const templateControlClass =
  "h-9 w-full rounded-[2px] border border-slate-300 bg-white px-3 text-xs text-[#181818] shadow-none placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 disabled:opacity-60"
export const templateSectionTitleClass = "m-0! text-base! leading-6! font-semibold! tracking-normal! text-slate-900!"

const menuItemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"
const DEFAULT_PAGE_SIZE = 5

export interface RequirementOption {
  id: string
  label: string
  name: string
}

function newTemplateItem(sequenceNo: number): TemplateItemFormValues {
  return { complianceRequirementId: "", sequenceNo: String(sequenceNo), isMandatory: true, appliesPerHorse: false, isEditing: false, instruction: "" }
}


interface TemplateItemsEditorProps {
  form: UseFormReturn<TemplateFormValues>
  options: RequirementOption[]
  optionsLoading: boolean
  fallbackNames: Map<string, string>
  readOnly: boolean
}

export function TemplateItemsEditor({ form, options, optionsLoading, fallbackNames, readOnly }: TemplateItemsEditorProps) {
  const { fields, append, update, remove } = useFieldArray({ control: form.control, name: "items" })
  const items = useWatch({ control: form.control, name: "items" })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<TemplateItemFormValues | null>(null)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [draftErrors, setDraftErrors] = useState<{ complianceRequirementId?: string; instruction?: string }>({})

  const totalPages = Math.max(1, Math.ceil(fields.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const visible = fields.slice(start, start + pageSize)
  const chosenIds = new Set(items.filter((_, index) => index !== editIndex).map((item) => item.complianceRequirementId).filter(Boolean))
  const itemsError = form.formState.errors.items?.root?.message ?? form.formState.errors.items?.message
  const { submitCount, errors } = form.formState

  // A failed submit must not leave the error on a page the user is not looking at.
  useEffect(() => {
    const rowErrors = errors.items
    if (!Array.isArray(rowErrors)) return
    const firstInvalid = rowErrors.findIndex(Boolean)
    if (firstInvalid >= 0) setPage(Math.floor(firstInvalid / pageSize) + 1)
    // Only react to a new submit attempt, not to every keystroke that clears an error.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount])

  // Sequence numbers are automatic: keep them 1..n after every add/remove (UC-17 ALT-03 step 2).
  const renumber = () => {
    form.getValues("items").forEach((_, index) => form.setValue(`items.${index}.sequenceNo`, String(index + 1), { shouldDirty: true }))
  }

  const optionOf = (id: string) => options.find((option) => option.id === id)
  const nameOf = (id: string) => optionOf(id)?.name ?? fallbackNames.get(id) ?? "—"

  const openItem = (index: number | null) => {
    setEditIndex(index)
    setDraft(index === null ? newTemplateItem(fields.length + 1) : { ...form.getValues(`items.${index}`) })
    setDraftErrors({})
  }

  const saveItem = () => {
    if (!draft || readOnly) return
    const parsed = templateItemSchema.safeParse(draft)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setDraftErrors({ complianceRequirementId: fieldErrors.complianceRequirementId?.[0], instruction: fieldErrors.instruction?.[0] })
      return
    }
    if (chosenIds.has(parsed.data.complianceRequirementId)) {
      setDraftErrors({ complianceRequirementId: "This requirement is already added." })
      return
    }
    const item = { ...parsed.data, isEditing: false }
    if (editIndex === null) {
      append(item)
      setPage(Math.ceil((fields.length + 1) / pageSize))
    } else {
      update(editIndex, item)
      form.clearErrors(`items.${editIndex}`)
    }
    setDraft(null)
  }

  const confirmRemove = () => {
    if (removeIndex === null) return
    remove(removeIndex)
    renumber()
    setRemoveIndex(null)
  }

  const removing = removeIndex === null ? undefined : items[removeIndex]

  return (
    <section className="booking-panel border bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className={templateSectionTitleClass}>Dossier Template Items</h2>
          <p className="m-0 mt-0.5 text-xs text-slate-500">Define the compliance requirements this template asks for, in order.</p>
        </div>
        {!readOnly ? (
          <button
            type="button"
            disabled={optionsLoading}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
            onClick={() => openItem(null)}
          >
            <Plus className="size-3.5" />
            Add item
          </button>
        ) : null}
      </div>

      <TooltipProvider delayDuration={200}>
      <div className="relative overflow-x-auto border border-slate-200">
        {/* Keep long requirement labels and instructions within their columns. */}
        <table className="w-full min-w-[1120px] table-fixed border-collapse text-xs">
          <colgroup>
            <col className="w-[64px]" />
            <col />
            <col />
            <col className="w-[120px]" />
            <col className="w-[260px]" />
            <col className="w-[56px]" />
          </colgroup>
          <thead className="bg-[#e9e6de]">
            <tr className="text-left font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600">
              <th className="h-10 px-2.5">No.</th>
              <th className="h-10 px-2.5">Compliance requirement</th>
              <th className="h-10 px-2.5">Requirement name</th>
              <th className="h-10 px-2.5">Mandatory</th>
              <th className="h-10 px-2.5">Instruction</th>
              <th className="h-10 px-1" />
            </tr>
          </thead>
          <tbody>
            {visible.map((field, offset) => {
              const index = start + offset
              const item = items[index]
              return (
                <tr key={field.id} className={cn("border-t border-slate-200 align-top", offset % 2 === 1 && "bg-[#f7f6f3]")}>
                  <td className="px-2.5 py-3 font-semibold text-slate-900">{index + 1}</td>

                  <td className="overflow-hidden px-2.5 py-2">
                    <TruncatedText className="text-slate-700" text={optionOf(item?.complianceRequirementId ?? "")?.label ?? nameOf(item?.complianceRequirementId ?? "")} />
                    {errors.items?.[index]?.complianceRequirementId?.message ? <p role="alert" className="mt-1 text-destructive">{errors.items[index]?.complianceRequirementId?.message}</p> : null}
                  </td>

                  <td className="overflow-hidden px-2.5 py-2"><TruncatedText className="text-slate-700" text={nameOf(item?.complianceRequirementId ?? "")} /></td>

                  <td className="px-2.5 py-2.5">
                    <span className="text-slate-700">{item?.isMandatory ? "Yes" : "No"}</span>
                  </td>

                  <td className="overflow-hidden px-2.5 py-2">
                    <TruncatedText className="text-slate-700" text={item?.instruction || "—"} />
                    {errors.items?.[index]?.instruction?.message ? <p role="alert" className="mt-1 text-destructive">{errors.items[index]?.instruction?.message}</p> : null}
                  </td>

                  <td className="px-1 py-1.5 text-center">
                    {!readOnly ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="ghost" className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" aria-label={`Actions for item ${index + 1}`}>
                            <MoreVertical className="size-3.5 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={2} className="w-36 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                          <DropdownMenuItem className={menuItemClass} onSelect={() => openItem(index)}>
                            <Pencil className="size-3.5 text-amber-600" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="my-0.5" />
                          <DropdownMenuItem
                            variant="destructive"
                            className={cn(menuItemClass, "data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!")}
                            onSelect={() => setRemoveIndex(index)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            {fields.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-20 text-center text-sm text-slate-500">No items yet. Add at least one compliance requirement.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      </TooltipProvider>

      {itemsError ? <p role="alert" className="mt-2 text-xs text-destructive">{itemsError}</p> : null}

      <div className="mt-3">
        <TablePagination
          meta={{
            totalItems: fields.length,
            totalPages,
            itemsPerPage: pageSize,
            currentPage,
            hasPreviousPage: currentPage > 1,
            hasNextPage: currentPage < totalPages,
          }}
          pageSizeAriaLabel="Items per page"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="rounded-[2px] sm:max-w-xl" onKeyDown={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{editIndex === null ? "Add template item" : "Edit template item"}</DialogTitle>
            <DialogDescription>Choose a compliance requirement and save this item to the template.</DialogDescription>
          </DialogHeader>
          {draft ? (
            <form onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); saveItem() }} className="grid gap-4" noValidate>
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="template-item-requirement">Compliance requirement <span className="text-destructive">*</span></Label>
                <Select value={draft.complianceRequirementId} onValueChange={(value) => setDraft({ ...draft, complianceRequirementId: value })} disabled={optionsLoading || readOnly}>
                  <SelectTrigger id="template-item-requirement" aria-invalid={Boolean(draftErrors.complianceRequirementId)} aria-describedby={draftErrors.complianceRequirementId ? "template-item-requirement-error" : undefined} className={cn(templateControlClass, "min-w-0 justify-between *:data-[slot=select-value]:truncate")}>
                    <SelectValue placeholder="Select requirement" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 rounded-[2px]">
                    {options.map((option) => <SelectItem key={option.id} value={option.id} disabled={chosenIds.has(option.id)} className="text-xs">{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {draftErrors.complianceRequirementId ? <p id="template-item-requirement-error" role="alert" className="text-xs text-destructive">{draftErrors.complianceRequirementId}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <Switch id="template-item-mandatory" checked={draft.isMandatory} onCheckedChange={(value) => setDraft({ ...draft, isMandatory: value })} disabled={readOnly} />
                <Label htmlFor="template-item-mandatory">Mandatory</Label>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="template-item-instruction">Instruction</Label>
                <Textarea id="template-item-instruction" value={draft.instruction} onChange={(event) => setDraft({ ...draft, instruction: event.target.value })} rows={4} maxLength={1000} disabled={readOnly} aria-invalid={Boolean(draftErrors.instruction)} aria-describedby={draftErrors.instruction ? "template-item-instruction-error" : undefined} placeholder="Instruction for the customer" className="resize-y rounded-[2px] text-sm" />
                <span className="text-right text-xs text-slate-500">{draft.instruction.length}/1000</span>
                {draftErrors.instruction ? <p id="template-item-instruction-error" role="alert" className="text-xs text-destructive">{draftErrors.instruction}</p> : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button type="submit" disabled={optionsLoading || readOnly}>Save item</Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeIndex !== null} onOpenChange={(open) => !open && setRemoveIndex(null)}>
        <AlertDialogContent className="gap-3 rounded-[2px] border-slate-200 bg-white p-4 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[400px]">
          <AlertDialogHeader className="grid grid-rows-none grid-cols-[28px_minmax(0,1fr)] place-items-start gap-2.5 text-left">
            <AlertDialogMedia className="m-0 grid size-7 shrink-0 place-items-center rounded-[2px] bg-red-50 text-red-600">
              <TriangleAlert className="size-3.5" />
            </AlertDialogMedia>
            <div className="grid gap-0.5">
              <AlertDialogTitle className="m-0! w-full! justify-self-start! text-left! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">Remove this item?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs leading-4 text-slate-600">
                {removing?.complianceRequirementId ? <span className="font-semibold text-slate-900">{nameOf(removing.complianceRequirementId)}: </span> : null}
                Removes this item and renumbers the remaining items on save.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1.5">
            <AlertDialogCancel size="sm" className="h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 rounded-[2px] bg-red-600 px-3 text-xs font-normal text-white shadow-none hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault()
                confirmRemove()
              }}
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
