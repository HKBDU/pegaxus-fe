import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { Ban, LockKeyhole, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { AddDossierRequirementDialog } from "@/features/compliance-catalog/components/AddDossierRequirementDialog"
import { MandatoryBadge, REQUIREMENT_STATUS_OPTIONS, RequirementStatusBadge, ScopeBadge } from "@/features/compliance-catalog/components/RequirementBadges"
import { RemoveDossierRequirementDialog } from "@/features/compliance-catalog/components/RemoveDossierRequirementDialog"
import { DossierRequirementActionDialog, type DossierRequirementAction } from "@/features/compliance-catalog/components/DossierRequirementActionDialog"
import { TruncatedText } from "@/features/compliance-catalog/components/TruncatedText"
import {
  useActiveRequirementOptions,
  useDossierRequirements,
  useRemoveDossierRequirement,
} from "@/features/compliance-catalog/hooks"
import type { DossierRequirementItem, DossierRequirementParams, RequirementStatus } from "@/features/compliance-catalog/dossier-types"
import { getRequirementErrorMessage } from "@/features/compliance-catalog/template-utils"
import { DossierHeaderCard } from "@/features/dossier/components/DossierHeaderCard"
import { DossierTabs } from "@/features/dossier/components/DossierTabs"
import { useDossierOverview } from "@/features/dossier/hooks"
import { formatDossierDate } from "@/features/dossier/utils"
import { ErrorState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableRadioFilter, type DataTableRadioOption } from "@/shared/components/ui/data-table-radio-filter"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"

const initialParams: DossierRequirementParams = { pageIndex: 1, pageSize: 10, status: "ALL", horseId: "ALL" }
const ALL_LINES: DossierRequirementParams = { pageIndex: 1, pageSize: 100, status: "ALL", horseId: "ALL" }

/**
 * "Requirements" tab of a dossier: the list (D8) plus Add (SCR-F2-009) and Remove (SCR-F2-010) for the TS.
 * Temporary host for those two dialogs until the dossier detail page (SCR-F2-008) embeds them.
 */
export function DossierRequirementsPanel({ embedded = false }: { embedded?: boolean }) {
  const { dossierId } = useParams()
  const principal = useAuthStore((state) => state.principal)
  const canManage = canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  const [params, setParams] = useState(initialParams)
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<DossierRequirementItem | null>(null)
  const [action, setAction] = useState<DossierRequirementAction>(null)

  const overviewQuery = useDossierOverview(dossierId)
  const listQuery = useDossierRequirements(dossierId, params)
  const allLinesQuery = useDossierRequirements(dossierId, ALL_LINES)
  const requirementOptions = useActiveRequirementOptions()
  const removeRequirement = useRemoveDossierRequirement(dossierId ?? "")
  const attempt = useRequestAttemptGuard()

  const overview = overviewQuery.data
  const allLines = useMemo(() => allLinesQuery.data?.data ?? [], [allLinesQuery.data])
  const locked = Boolean(overview?.writeLocked)

  // The booking's horses are not part of D7, so the horses that already have lines are the ones offered.
  const horses = useMemo(
    () => [...new Map(allLines.filter((line) => line.horseId !== null).map((line) => [String(line.horseId), { id: line.horseId as string | number, name: line.horseName ?? String(line.horseId) }])).values()],
    [allLines],
  )

  const horseOptions = useMemo<DataTableRadioOption[]>(
    () => [{ value: "ALL", label: "All horses" }, ...horses.map((horse) => ({ value: String(horse.id), label: horse.name }))],
    [horses],
  )

  const columns = useMemo<ColumnDef<DossierRequirementItem>[]>(
    () => [
      {
        accessorKey: "requirementName",
        header: "REQUIREMENT",
        enableHiding: false,
        cell: ({ row }) => <TruncatedText text={row.original.requirementName} className="max-w-[18rem] font-semibold text-slate-900" />,
      },
      {
        id: "scope",
        header: "APPLIES TO",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ScopeBadge scope={row.original.horseId === null ? "TRIP" : "HORSE"} />
            <span className="text-slate-700">{row.original.horseName ?? ""}</span>
          </div>
        ),
      },
      { id: "status", header: "STATUS", cell: ({ row }) => <RequirementStatusBadge status={row.original.status} /> },
      { id: "mandatory", header: "MANDATORY", cell: ({ row }) => <MandatoryBadge mandatory={row.original.isMandatory} /> },
      { id: "dueDate", header: "DUE DATE", cell: ({ row }) => <span className="whitespace-nowrap text-slate-700">{row.original.dueDate ? formatDossierDate(row.original.dueDate) : "—"}</span> },
      { id: "validUntil", header: "VALID UNTIL", cell: ({ row }) => <span className="whitespace-nowrap text-slate-700">{row.original.validUntil ? formatDossierDate(row.original.validUntil) : "—"}</span> },
      { id: "document", header: "DOCUMENT", cell: ({ row }) => <span className="whitespace-nowrap text-slate-600">{row.original.document?.documentCode ?? "—"}</span> },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "ACTIONS",
              enableHiding: false,
              enableSorting: false,
              cell: ({ row }) => (
                <div className="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${row.original.requirementName}`} disabled={locked}>
                        <MoreVertical className="size-3.5 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
                      {!row.original.document ? <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={() => setAction({ type: "edit", requirement: row.original })}>
                        <Pencil className="size-3.5" />
                        Edit
                      </DropdownMenuItem> : null}
                      {!row.original.document && row.original.status !== "WAIVED" ? <DropdownMenuItem className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]" onSelect={() => setAction({ type: "waive", requirement: row.original })}>
                        <Ban className="size-3.5" />
                        Waive
                      </DropdownMenuItem> : null}
                      <DropdownMenuItem
                        variant="destructive"
                        className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!"
                        onSelect={() => setRemoveTarget(row.original)}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ),
            } satisfies ColumnDef<DossierRequirementItem>,
          ]
        : []),
    ],
    [canManage, locked],
  )

  const lines = useMemo(() => listQuery.data?.data ?? [], [listQuery.data])
  const table = useReactTable({ data: lines, columns, getRowId: (row) => String(row.dossierRequirementId), getCoreRowModel: getCoreRowModel() })

  const confirmRemove = async () => {
    if (!removeTarget) return
    try {
      const guarded = await attempt.run(() => removeRequirement.mutateAsync(removeTarget.dossierRequirementId))
      if (!guarded.started) return
      toast.success("DossierRequirement removed successfully.")
      setRemoveTarget(null)
    } catch (error) {
      toast.error(getRequirementErrorMessage(error, "Unable to remove this requirement"))
    }
  }

  const lockMessage = getRequirementErrorMessage(new Error(overview?.writeLockReason ?? "DOSSIER_LOCKED"), "This dossier cannot be modified.")

  return (
    <div className={embedded ? "grid gap-5" : "booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10"}>
      <div className="booking-page-enter mx-auto w-full max-w-[1280px]">
        {!embedded ? <div className="mb-6">
          <PageHeader
            title="DOSSIER REQUIREMENTS"
            backHref="/compliance-dossiers"
            backLabel="Back to dossier tracking"
            action={
              canManage ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={locked || !overview}
                  className="h-9 shrink-0 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="size-4" />
                  Add DossierRequirement
                </Button>
              ) : undefined
            }
          />
          <p className="m-0 text-sm text-slate-500">Manage the documents this booking has to provide.</p>
        </div> : null}

        {overviewQuery.isError ? (
          <ErrorState message="Unable to load this dossier." onRetry={() => void overviewQuery.refetch()} />
        ) : (
          <div className="grid gap-5">
            {!embedded ? (overview ? <DossierHeaderCard overview={overview} /> : <Skeleton className="h-20 rounded-none bg-[#e9e6de]" />) : null}
            {!embedded && dossierId ? <DossierTabs dossierId={dossierId} active="requirements" /> : null}

            {locked ? (
              <div role="alert" className="flex items-start gap-2 rounded-[2px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
                <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <p className="m-0">{lockMessage}</p>
              </div>
            ) : null}

            {listQuery.isError ? (
              <ErrorState message="Unable to load the dossier requirements." onRetry={() => void listQuery.refetch()} />
            ) : (
              <DataTable
                table={table}
                isLoading={listQuery.isLoading && !listQuery.data}
                className="gap-2.5"
                containerClassName="booking-panel overflow-x-auto"
                headerClassName="bg-[#e9e6de]"
                headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
                rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
                cellClassName="px-2.5 py-2.5 text-xs"
                emptyMessage="No requirements match the current filters."
                footer={
                  listQuery.data ? (
                    <TablePagination
                      meta={listQuery.data.meta}
                      onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
                      onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
                    />
                  ) : null
                }
              >
                <div role="toolbar" className="grid grid-cols-2 gap-2 lg:grid-cols-[10rem_10rem_1fr_auto]">
                  <DataTableRadioFilter
                    title="Status"
                    value={params.status}
                    options={REQUIREMENT_STATUS_OPTIONS}
                    onValueChange={(status) => setParams((current) => ({ ...current, status: status as RequirementStatus | "ALL", pageIndex: 1 }))}
                  />
                  <DataTableRadioFilter title="Horse" value={params.horseId} options={horseOptions} onValueChange={(horseId) => setParams((current) => ({ ...current, horseId, pageIndex: 1 }))} />
                  <span className="hidden lg:block" />
                  <div className="flex justify-end"><DataTableViewOptions table={table} /></div>
                </div>
              </DataTable>
            )}
          </div>
        )}
      </div>

      {overview && dossierId && overview.bookingSummary.requestedDepartureDate ? (
        <AddDossierRequirementDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dossierId={dossierId}
          bookingCode={overview.bookingCode}
          plannedDepartureDate={overview.bookingSummary.requestedDepartureDate}
          horses={horses}
          requirements={requirementOptions.data ?? []}
          requirementsLoading={requirementOptions.isLoading}
          existing={allLines}
        />
      ) : null}

      <RemoveDossierRequirementDialog
        requirement={removeTarget}
        bookingCode={overview?.bookingCode ?? ""}
        isPending={removeRequirement.isPending}
        onConfirm={() => void confirmRemove()}
        onClose={() => {
          setRemoveTarget(null)
          attempt.reset()
        }}
      />
      <DossierRequirementActionDialog dossierId={dossierId ?? ""} action={action} onClose={() => setAction(null)} />
    </div>
  )
}

export default function DossierRequirementsPage() {
  return <DossierRequirementsPanel />
}