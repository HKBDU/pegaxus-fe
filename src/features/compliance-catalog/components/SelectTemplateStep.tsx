import { getCoreRowModel, useReactTable, type ColumnDef, type RowSelectionState } from "@tanstack/react-table"
import { FilterX, Search, Star, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { RequirementCountTiles } from "@/features/compliance-catalog/components/RequirementCountTiles"
import { TemplateStatusBadge } from "@/features/compliance-catalog/components/TemplateStatusBadge"
import { useDossierTemplate, useRecommendedTemplates } from "@/features/compliance-catalog/hooks"
import type { DossierTemplateListParams, DossierTemplateSummary } from "@/features/compliance-catalog/template-types"
import { formatTemplateDate, getTemplateErrorMessage } from "@/features/compliance-catalog/template-utils"
import { ErrorState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useDebounce } from "@/shared/hooks"
import type { EntityId } from "@/shared/types"

const sectionTitleClass = "m-0! font-heading text-lg! leading-6! font-bold! tracking-[0.02em]! text-[#ef8f00]! uppercase"

function RecommendedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="outline" className={cn("h-5 rounded-[2px] border-amber-300 bg-amber-100 px-1.5 py-0 text-[0.65rem] font-medium text-amber-800", className)}>
      Recommended
    </Badge>
  )
}

function formatEffectiveDates(template: DossierTemplateSummary) {
  if (!template.effectiveFrom && !template.effectiveTo) return "—"
  if (!template.effectiveTo) return `From ${formatTemplateDate(template.effectiveFrom)}`
  return `${formatTemplateDate(template.effectiveFrom)} - ${formatTemplateDate(template.effectiveTo)}`
}

interface SelectTemplateStepProps {
  bookingId: EntityId
  selectedId: EntityId | null
  onSelect: (id: EntityId) => void
}

/** SCR-F2-007, step 1: pick one of the ACTIVE templates, ranked for the route of the booking (T1 with bookingId). */
export function SelectTemplateStep({ bookingId, selectedId, onSelect }: SelectTemplateStepProps) {
  const [pageIndex, setPageIndex] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const params = useMemo<DossierTemplateListParams>(
    () => ({ pageIndex, pageSize, search: debouncedSearch, country: "ALL", status: "ACTIVE", sortBy: "recommendation:desc", bookingId }),
    [bookingId, debouncedSearch, pageIndex, pageSize],
  )
  const templatesQuery = useRecommendedTemplates(params)
  const templates = useMemo(() => templatesQuery.data?.data ?? [], [templatesQuery.data])
  const recommended = templates.find((template) => template.isRecommended)
  const selectedTemplate = useDossierTemplate(selectedId ?? undefined)

  // Start from the best match, like the design: the recommended template is already ticked.
  useEffect(() => {
    if (selectedId === null && templates.length) onSelect((recommended ?? templates[0]).dossierTemplateId)
  }, [onSelect, recommended, selectedId, templates])

  const rowSelection = useMemo<RowSelectionState>(() => (selectedId === null ? {} : { [String(selectedId)]: true }), [selectedId])
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPageIndex(1)
  }, [])

  const columns = useMemo<ColumnDef<DossierTemplateSummary>[]>(
    () => [
      {
        id: "select",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Select</span>,
        cell: ({ row }) => (
          <button
            type="button"
            role="radio"
            aria-checked={row.getIsSelected()}
            aria-label={`Select ${row.original.templateCode}`}
            onClick={() => onSelect(row.original.dossierTemplateId)}
            className="grid size-4 place-items-center rounded-full border border-slate-300 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-500/40 aria-checked:border-[#ef8f00]"
          >
            <span className={cn("size-2 rounded-full", row.getIsSelected() ? "bg-[#ef8f00]" : "bg-transparent")} />
          </button>
        ),
      },
      {
        accessorKey: "templateCode",
        header: "TEMPLATE CODE",
        enableHiding: false,
        cell: ({ row }) => <span className="whitespace-nowrap font-semibold text-slate-900">{row.original.templateCode}</span>,
      },
      {
        accessorKey: "templateName",
        header: "TEMPLATE NAME",
        cell: ({ row }) => <span className="block min-w-40 max-w-64 whitespace-normal font-medium leading-snug text-slate-800">{row.original.templateName}</span>,
      },
      {
        id: "matchedCountries",
        header: "MATCHED COUNTRIES",
        cell: ({ row }) =>
          row.original.matchedCountries?.length ? (
            <div className="flex gap-1">
              {row.original.matchedCountries.map((code) => (
                <span key={code} className="inline-flex min-w-6 justify-center rounded-[2px] bg-slate-900 px-1 py-0.5 text-[0.65rem] font-bold leading-none text-white">{code}</span>
              ))}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      { accessorKey: "versionNo", header: "VERSION", cell: ({ row }) => <span className="text-slate-700">v{row.original.versionNo}</span> },
      {
        id: "effective",
        header: "EFFECTIVE DATES",
        cell: ({ row }) => <span className="block min-w-32 whitespace-normal leading-snug text-slate-700">{formatEffectiveDates(row.original)}</span>,
      },
      {
        accessorKey: "status",
        header: "STATUS",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1">
            <TemplateStatusBadge status={row.original.status} />
            {row.original.isRecommended ? <RecommendedBadge /> : null}
          </div>
        ),
      },
    ],
    [onSelect],
  )

  const table = useReactTable({
    data: templates,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    enableMultiRowSelection: false,
    getRowId: (row) => String(row.dossierTemplateId),
    getCoreRowModel: getCoreRowModel(),
  })

  const detail = selectedTemplate.data
  const horseItems = detail?.items.filter((item) => item.appliesPerHorse).length ?? 0
  const meta = templatesQuery.data?.meta

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="templates-title" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <div>
          <h2 id="templates-title" className={sectionTitleClass}>Dossier Templates</h2>
          <p className="m-0 mt-0.5 text-xs text-slate-500">Browse and select an active dossier template for this booking route.</p>
        </div>

        {templatesQuery.isError ? (
          <ErrorState message={getTemplateErrorMessage(templatesQuery.error, "Unable to load dossier templates.")} onRetry={() => void templatesQuery.refetch()} />
        ) : (
          <DataTable
            table={table}
            isLoading={templatesQuery.isLoading && !templatesQuery.data}
            className="gap-2.5"
            containerClassName="booking-panel overflow-x-auto"
            headerClassName="bg-[#e9e6de]"
            headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
            rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60 data-[state=selected]:bg-amber-50"
            cellClassName="px-2.5 py-2.5 text-xs"
            emptyMessage="No active template is available for this booking route."
            footer={
              meta ? (
                <TablePagination
                  meta={meta}
                  onPageChange={setPageIndex}
                  onPageSizeChange={(size) => {
                    setPageSize(size)
                    setPageIndex(1)
                  }}
                />
              ) : null
            }
          >
            <div role="toolbar" className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => handleSearch(event.target.value)}
                  aria-label="Search templates"
                  placeholder="Search template code or name..."
                  spellCheck={false}
                  className="h-8 rounded-[2px] border-slate-300 bg-white pl-8 pr-8 font-sans text-xs font-normal shadow-none placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20"
                />
                {search ? (
                  <button type="button" aria-label="Clear search" onClick={() => handleSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Reset filters"
                disabled={!search}
                className="size-8 rounded-[2px] border-slate-300 bg-white p-0 shadow-none"
                onClick={() => handleSearch("")}
              >
                <FilterX className="size-3.5 text-slate-600" />
              </Button>
              <DataTableViewOptions table={table} />
            </div>
          </DataTable>
        )}
      </section>

      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <section aria-labelledby="recommended-title" className="grid gap-2">
          <div>
            <h2 id="recommended-title" className={sectionTitleClass}>Recommended Template</h2>
            <p className="m-0 mt-0.5 text-xs text-slate-500">Based on the booking route, we recommend the following template.</p>
          </div>
          {templatesQuery.isLoading && !templatesQuery.data ? (
            <Skeleton className="h-44 rounded-none bg-[#e9e6de]" />
          ) : recommended ? (
            <div className="rounded-[2px] border border-amber-300 bg-amber-50/60 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="m-0 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Star className="size-3.5 fill-[#ef8f00] text-[#ef8f00]" aria-hidden="true" />
                  {recommended.templateCode}
                </p>
                <RecommendedBadge />
              </div>
              <p className="m-0 mt-1.5 text-xs font-semibold leading-snug text-slate-800">{recommended.templateName}</p>
              <dl className="m-0 mt-2.5 grid grid-cols-[6.5rem_1fr] gap-y-1.5 text-xs">
                <dt className="text-slate-500">Matched countries</dt>
                <dd className="m-0 font-medium text-slate-800">{recommended.matchedCountries?.join(", ") || "—"}</dd>
                <dt className="text-slate-500">Version</dt>
                <dd className="m-0 font-medium text-slate-800">v{recommended.versionNo}</dd>
                <dt className="text-slate-500">Effective dates</dt>
                <dd className="m-0 font-medium text-slate-800">{formatEffectiveDates(recommended)}</dd>
                <dt className="text-slate-500">Status</dt>
                <dd className="m-0"><TemplateStatusBadge status={recommended.status} /></dd>
              </dl>
            </div>
          ) : (
            <p className="m-0 rounded-[2px] border border-slate-200 bg-white p-3.5 text-xs text-slate-500">
              No template matches the countries of this booking. Pick any active template, or create a custom dossier without a template.
            </p>
          )}
        </section>

        {recommended?.recommendationReason ? (
          <section aria-labelledby="why-title" className="grid gap-1.5">
            <h2 id="why-title" className="m-0! font-heading text-sm! leading-5! font-bold! tracking-[0.04em]! text-slate-900! uppercase">Why this template?</h2>
            <p className="m-0 text-xs leading-5 text-slate-600">{recommended.recommendationReason}</p>
          </section>
        ) : null}

        <section aria-labelledby="preview-title" className="grid gap-2">
          <h2 id="preview-title" className="m-0! font-heading text-sm! leading-5! font-bold! tracking-[0.04em]! text-slate-900! uppercase">Template preview</h2>
          {selectedTemplate.isLoading ? (
            <Skeleton className="h-28 rounded-none bg-[#e9e6de]" />
          ) : detail ? (
            <>
              <p className="m-0 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{detail.templateCode}</span> will create a compliance dossier with the following requirements:
              </p>
              <RequirementCountTiles total={detail.items.length} horse={horseItems} trip={detail.items.length - horseItems} totalLabel="Template items" />
            </>
          ) : (
            <p className="m-0 text-xs text-slate-500">Select a template to preview what it will create.</p>
          )}
        </section>
      </aside>
    </div>
  )
}
