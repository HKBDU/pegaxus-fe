import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Info, MoreVertical, Plus, Trash2, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import type { Booking } from "@/features/booking/types"
import { AddCustomRequirementPanel } from "@/features/compliance-catalog/components/AddCustomRequirementPanel"
import { CategoryBadge, MandatoryBadge, ScopeBadge } from "@/features/compliance-catalog/components/RequirementBadges"
import { RequirementCountTiles } from "@/features/compliance-catalog/components/RequirementCountTiles"
import { TruncatedText } from "@/features/compliance-catalog/components/TruncatedText"
import type { CustomRequirementDraft } from "@/features/compliance-catalog/dossier-types"
import { buildFinalRows, countRows, templateItemKey } from "@/features/compliance-catalog/dossier-utils"
import type { DossierTemplate, DossierTemplateItem } from "@/features/compliance-catalog/template-types"
import type { ComplianceCategory, ComplianceRequirementSummary } from "@/features/compliance-catalog/types"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"

type Row =
  | { key: string; kind: "template"; item: DossierTemplateItem }
  | { key: string; kind: "custom"; custom: CustomRequirementDraft }

const sectionTitleClass = "m-0! font-heading text-lg! leading-6! font-bold! tracking-[0.02em]! text-[#ef8f00]! uppercase"

interface CustomizeRequirementsStepProps {
  booking: Booking
  /** null = custom dossier without a template (ALT-01). */
  template: DossierTemplate | null
  templateLoading: boolean
  selectedItemIds: Set<string>
  onToggleItem: (key: string) => void
  onToggleAll: (checked: boolean) => void
  customs: CustomRequirementDraft[]
  onAddCustom: (draft: CustomRequirementDraft) => string | null
  onRemoveCustom: (key: string) => void
  requirements: ComplianceRequirementSummary[]
  requirementsLoading: boolean
  showSummary?: boolean
}

/** SCR-F2-007, step 2: untick template lines that this trip does not need and add custom ones. */
export function CustomizeRequirementsStep({
  booking,
  template,
  templateLoading,
  selectedItemIds,
  onToggleItem,
  onToggleAll,
  customs,
  onAddCustom,
  onRemoveCustom,
  requirements,
  requirementsLoading,
  showSummary = true,
}: CustomizeRequirementsStepProps) {
  const [pageIndex, setPageIndex] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [noticeOpen, setNoticeOpen] = useState(true)
  const [customOpen, setCustomOpen] = useState(false)

  const categoryById = useMemo(
    () => new Map(requirements.map((requirement) => [String(requirement.complianceRequirementId), requirement.category] as const)),
    [requirements],
  )
  const categoryOf = useCallback(
    (id: DossierTemplateItem["complianceRequirementId"]): ComplianceCategory | null => categoryById.get(String(id)) ?? null,
    [categoryById],
  )

  const templateItems = useMemo(() => [...(template?.items ?? [])].sort((left, right) => left.sequenceNo - right.sequenceNo), [template])
  const rows = useMemo<Row[]>(
    () => [
      ...templateItems.map((item): Row => ({ key: templateItemKey(item), kind: "template", item })),
      ...customs.map((custom): Row => ({ key: `custom-${custom.key}`, kind: "custom", custom })),
    ],
    [customs, templateItems],
  )
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(pageIndex, totalPages)
  // useReactTable needs a stable `data`: a fresh array on every render makes it reset its state in a loop.
  const pageRows = useMemo(() => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize), [currentPage, pageSize, rows])

  const counts = countRows(buildFinalRows(templateItems, selectedItemIds, customs, booking.horses, categoryOf))
  const allChecked = templateItems.length > 0 && templateItems.every((item) => selectedItemIds.has(templateItemKey(item)))
  const someChecked = templateItems.some((item) => selectedItemIds.has(templateItemKey(item)))

  const columns = useMemo<ColumnDef<Row>[]>(() => [
    {
      id: "select",
      enableHiding: false,
      header: () => (
        <div className="flex justify-center">
          <Checkbox
            checked={allChecked ? true : someChecked ? "indeterminate" : false}
            disabled={!templateItems.length}
            onCheckedChange={(checked) => onToggleAll(Boolean(checked))}
            aria-label="Include all template requirements"
            className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={row.original.kind === "custom" ? true : selectedItemIds.has(row.original.key)}
            disabled={row.original.kind === "custom"}
            onCheckedChange={() => onToggleItem(row.original.key)}
            aria-label={`Include ${row.original.kind === "template" ? row.original.item.requirementName : row.original.custom.requirementName}`}
            className="size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"
          />
        </div>
      ),
    },
    {
      id: "name",
      header: "REQUIREMENT NAME",
      enableHiding: false,
      cell: ({ row }) => {
        const name = row.original.kind === "template" ? row.original.item.requirementName : row.original.custom.requirementName
        return (
          <div className="flex min-w-0 items-center gap-1.5">
            <TruncatedText text={name} className="max-w-[15rem] font-semibold text-slate-900" />
            {row.original.kind === "custom" ? <span className="shrink-0 rounded-[2px] bg-amber-100 px-1 py-0.5 text-[0.6rem] font-semibold uppercase leading-none text-amber-800">Custom</span> : null}
          </div>
        )
      },
    },
    {
      id: "category",
      header: "CATEGORY",
      cell: ({ row }) => (
        <CategoryBadge category={row.original.kind === "template" ? categoryOf(row.original.item.complianceRequirementId) : row.original.custom.category} />
      ),
    },
    {
      id: "scope",
      header: "APPLIES TO",
      cell: ({ row }) => (
        <ScopeBadge scope={row.original.kind === "template" ? (row.original.item.appliesPerHorse ? "HORSE" : "TRIP") : row.original.custom.horseId === null ? "TRIP" : "HORSE"} />
      ),
    },
    {
      id: "horse",
      header: "HORSE",
      cell: ({ row }) => {
        if (row.original.kind === "custom") return <span className="text-slate-700">{row.original.custom.horseName ?? "—"}</span>
        return <span className="text-slate-700">{row.original.item.appliesPerHorse ? `All horses (${booking.horses.length})` : "—"}</span>
      },
    },
    {
      id: "mandatory",
      header: "MANDATORY",
      cell: ({ row }) => <MandatoryBadge mandatory={row.original.kind === "template" ? row.original.item.isMandatory : row.original.custom.isMandatory} />,
    },
    {
      id: "notes",
      header: "NOTES",
      cell: ({ row }) => <TruncatedText text={(row.original.kind === "template" ? row.original.item.instruction : row.original.custom.instruction) || "—"} className="max-w-[11rem] text-slate-600" />,
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        row.original.kind === "custom" ? (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" aria-label={`Actions for ${row.original.custom.requirementName}`}>
                  <MoreVertical className="size-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={2} className="w-36 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!"
                  onSelect={() => row.original.kind === "custom" && onRemoveCustom(row.original.custom.key)}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null,
    },
  ], [allChecked, booking.horses.length, categoryOf, onRemoveCustom, onToggleAll, onToggleItem, selectedItemIds, someChecked, templateItems.length])

  const table = useReactTable({
    data: pageRows,
    columns,
    getRowId: (row) => row.key,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {noticeOpen ? (
        <div role="note" className="flex items-start gap-2 rounded-[2px] border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-900">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p className="m-0 flex-1">
            {template
              ? "The original dossier template will not be modified. These customizations will only be applied to the new compliance dossier created for this booking."
              : "No template is used: the dossier will only contain the custom requirements you add here."}
          </p>
          <button type="button" aria-label="Dismiss" className="shrink-0 text-sky-700 hover:text-sky-950" onClick={() => setNoticeOpen(false)}>
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className={cn("grid items-start gap-6", showSummary ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
        <section aria-labelledby="selected-title" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="selected-title" className={sectionTitleClass}>Selected Requirements</h2>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                {template ? "Untick the requirements this trip does not need, or add custom ones. Per-horse lines are created for every horse of the booking." : "Add the requirements this booking needs."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <DataTableViewOptions table={table} />
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 transition-colors hover:bg-[#db8300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => setCustomOpen(true)}
              >
                <Plus className="size-3.5" />
                Add custom requirement
              </button>
            </div>
          </div>

          {templateLoading ? (
            <Skeleton className="h-64 rounded-none bg-[#e9e6de]" />
          ) : (
            <DataTable
              table={table}
              className="gap-2.5"
              containerClassName="booking-panel overflow-x-auto"
              headerClassName="bg-[#e9e6de]"
              headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
              rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
              cellClassName="px-2.5 py-2 text-xs"
              emptyMessage="No requirements yet. Add a custom requirement to continue."
              footer={
                <TablePagination
                  meta={{
                    totalItems: rows.length,
                    totalPages,
                    itemsPerPage: pageSize,
                    currentPage,
                    hasPreviousPage: currentPage > 1,
                    hasNextPage: currentPage < totalPages,
                  }}
                  onPageChange={setPageIndex}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPageIndex(1)
                  }}
                />
              }
            />
          )}
        </section>

        {showSummary ? <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <section aria-labelledby="summary-title" className="booking-panel border bg-white p-5">
            <h2 id="summary-title" className={sectionTitleClass}>Current Summary</h2>
            <p className="m-0 mb-3 mt-0.5 text-xs text-slate-500">Overview of the requirements this dossier will contain.</p>
            <RequirementCountTiles total={counts.total} horse={counts.horse} trip={counts.trip} />
            <p className={cn("m-0 mt-2 text-[0.7rem] text-slate-400", counts.total === 0 && "text-red-600")}>
              {counts.total === 0 ? "Add at least one requirement to continue." : `Horse-related lines are counted once per horse (${booking.horses.length} in this booking).`}
            </p>
          </section>
        </aside> : null}
      </div>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-[2px] border-slate-200 bg-white p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
            <DialogTitle className="m-0! font-heading text-2xl! font-bold! uppercase tracking-[0.02em]! text-[#ef8f00]!">Add custom dossier requirement</DialogTitle>
            <DialogDescription className="m-0! text-xs text-slate-500">As a Transport Specialist, you can add a custom DossierRequirement to this ComplianceDossier.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <AddCustomRequirementPanel horses={booking.horses} requirements={requirements} requirementsLoading={requirementsLoading} onAdd={(draft) => {
              const error = onAddCustom(draft)
              if (!error) setCustomOpen(false)
              return error
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
