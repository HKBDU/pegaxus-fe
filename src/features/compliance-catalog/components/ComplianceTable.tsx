import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table"
import { Ban, CircleCheck, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ComplianceActionDialog, type ComplianceActionVariant } from "@/features/compliance-catalog/components/ComplianceActionDialog"
import { ComplianceFilters } from "@/features/compliance-catalog/components/ComplianceFilters"
import { ComplianceStatusBadge } from "@/features/compliance-catalog/components/ComplianceStatusBadge"
import { useChangeComplianceStatus, useDeleteComplianceRequirement } from "@/features/compliance-catalog/hooks"
import { complianceService } from "@/features/compliance-catalog/services"
import type {
  ComplianceCategory,
  ComplianceRequirementListParams,
  ComplianceRequirementSummary,
  ComplianceSort,
  ComplianceStatus,
  ReferenceCount,
} from "@/features/compliance-catalog/types"
import {
  formatComplianceDate,
  formatComplianceTime,
  formatValidity,
  getComplianceCategoryLabel,
  getComplianceErrorMessage,
} from "@/features/compliance-catalog/utils"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import type { EntityId, PaginationMeta } from "@/shared/types"

const menuItemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"

interface RowActionsProps {
  requirement: ComplianceRequirementSummary
  disabled: boolean
  onEdit: () => void
  onToggleStatus: () => void
  onDelete: () => void
}

function ComplianceRowActions({ requirement, disabled, onEdit, onToggleStatus, onDelete }: RowActionsProps) {
  const isActive = requirement.status === "ACTIVE"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${requirement.requirementCode}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className={menuItemClass} disabled={disabled} onSelect={onEdit}>
          <Pencil className="size-3.5 text-amber-600" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItemClass} disabled={disabled} onSelect={onToggleStatus}>
          {isActive ? <Ban className="size-3.5 text-slate-600" /> : <CircleCheck className="size-3.5 text-emerald-600" />}
          {isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-0.5" />
        <DropdownMenuItem
          variant="destructive"
          className={cn(menuItemClass, "data-[variant=destructive]:text-red-600 data-[variant=destructive]:focus:bg-accent data-[variant=destructive]:focus:text-red-700 data-[variant=destructive]:*:[svg]:text-red-600!")}
          disabled={disabled}
          onSelect={onDelete}
        >
          <Trash2 className="size-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DialogState {
  variant: ComplianceActionVariant
  requirement: ComplianceRequirementSummary
  referenceCount?: ReferenceCount
}

interface ComplianceTableProps {
  requirements: ComplianceRequirementSummary[]
  filters: ComplianceRequirementListParams
  meta: PaginationMeta
  isLoading?: boolean
  /** Only Transport Specialists may change the catalog; Logistics Managers get a read-only list. */
  canManage: boolean
  onSearchChange: (value: string) => void
  onCountryChange: (value: string) => void
  onCategoryChange: (value: ComplianceCategory | "ALL") => void
  onStatusChange: (value: ComplianceStatus | "ALL") => void
  onSortChange: (value: ComplianceSort) => void
  onReset: () => void
  onPageChange: (value: number) => void
  onPageSizeChange: (value: number) => void
}

export function ComplianceTable({
  requirements,
  filters,
  meta,
  isLoading,
  canManage,
  onSearchChange,
  onCountryChange,
  onCategoryChange,
  onStatusChange,
  onSortChange,
  onReset,
  onPageChange,
  onPageSizeChange,
}: ComplianceTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [checkingId, setCheckingId] = useState<EntityId>()
  const changeStatus = useChangeComplianceStatus()
  const deleteRequirement = useDeleteComplianceRequirement()
  const attempt = useRequestAttemptGuard()

  const closeDialog = () => {
    setDialog(null)
    attempt.reset()
  }

  const activate = async (requirement: ComplianceRequirementSummary) => {
    try {
      await changeStatus.mutateAsync({ id: requirement.complianceRequirementId, status: "ACTIVE" })
      toast.success("ComplianceRequirement activated successfully.")
    } catch (error) {
      toast.error(getComplianceErrorMessage(error, "Unable to activate this requirement"))
    }
  }

  // The list rows carry no reference counts, so Delete reads the detail first (C2) to explain a blocked delete.
  const requestDelete = async (requirement: ComplianceRequirementSummary) => {
    setCheckingId(requirement.complianceRequirementId)
    try {
      const detail = await complianceService.getRequirement(requirement.complianceRequirementId)
      setDialog({
        variant: detail.isReferenced ? "delete-blocked" : "delete",
        requirement,
        referenceCount: detail.referenceCount,
      })
    } catch (error) {
      toast.error(getComplianceErrorMessage(error, "Unable to check this requirement"))
    } finally {
      setCheckingId(undefined)
    }
  }

  const confirmDialog = async () => {
    if (!dialog) return
    const { variant, requirement } = dialog
    try {
      const guarded = await attempt.run(async () => {
        if (variant === "deactivate") {
          await changeStatus.mutateAsync({ id: requirement.complianceRequirementId, status: "INACTIVE" })
        } else if (variant === "delete") {
          await deleteRequirement.mutateAsync(requirement.complianceRequirementId)
        }
      })
      if (!guarded.started) return
      toast.success(variant === "deactivate" ? "ComplianceRequirement deactivated successfully." : "ComplianceRequirement deleted successfully.")
      closeDialog()
    } catch (error) {
      if (variant === "delete" && error instanceof Error && error.message === "REQUIREMENT_IN_USE") {
        // Someone linked it after the list loaded: show the blocked state instead of a bare toast.
        setDialog({ variant: "delete-blocked", requirement })
        attempt.reset()
        return
      }
      toast.error(getComplianceErrorMessage(error, variant === "deactivate" ? "Unable to deactivate this requirement" : "Unable to delete this requirement"))
    }
  }

  const columns = useMemo<ColumnDef<ComplianceRequirementSummary>[]>(
    () => {
      const muted = (requirement: ComplianceRequirementSummary) => requirement.status === "INACTIVE"
      const textTone = (requirement: ComplianceRequirementSummary, active = "text-slate-900") => (muted(requirement) ? "text-slate-400" : active)

      return [
        {
          accessorKey: "requirementCode",
          enableHiding: false,
          header: "REQUIREMENT CODE",
          cell: ({ row }) => <span className={cn("font-semibold", textTone(row.original))}>{row.original.requirementCode}</span>,
        },
        {
          accessorKey: "requirementName",
          header: "REQUIREMENT NAME",
          cell: ({ row }) => <span className={cn("block min-w-56 max-w-72 whitespace-normal font-semibold leading-snug", textTone(row.original))}>{row.original.requirementName}</span>,
        },
        {
          accessorKey: "category",
          header: "CATEGORY",
          enableSorting: false,
          cell: ({ row }) => <span className={textTone(row.original, "text-slate-700")}>{getComplianceCategoryLabel(row.original.category)}</span>,
        },
        {
          accessorKey: "country",
          header: () => <span className="block w-full text-center">COUNTRY</span>,
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex justify-center">
              {row.original.country ? (
                <span className={cn("inline-flex min-w-6 justify-center rounded-[2px] px-1 py-0.5 text-[0.65rem] font-bold leading-none text-white", muted(row.original) ? "bg-slate-400" : "bg-slate-900")}>
                  {row.original.country}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>
          ),
        },
        {
          accessorKey: "bcpCode",
          header: "APPLICABLE BCP",
          enableSorting: false,
          cell: ({ row }) => <span className={textTone(row.original, "text-slate-700")}>{row.original.bcpCode || "—"}</span>,
        },
        {
          id: "validity",
          header: "VALIDITY",
          enableSorting: false,
          cell: ({ row }) => <span className={cn("whitespace-nowrap", textTone(row.original, "text-slate-700"))}>{formatValidity(row.original)}</span>,
        },
        {
          accessorKey: "status",
          header: () => <span className="block w-full text-center">STATUS</span>,
          enableSorting: false,
          cell: ({ row }) => <div className="flex justify-center"><ComplianceStatusBadge status={row.original.status} /></div>,
        },
        {
          accessorKey: "updatedAt",
          header: "LAST UPDATED",
          cell: ({ row }) => (
            <div className="leading-tight">
              <span className={cn("block", textTone(row.original))}>{formatComplianceDate(row.original.updatedAt)}</span>
              <span className="mt-1 block text-[0.68rem] text-slate-400">{formatComplianceTime(row.original.updatedAt)}</span>
            </div>
          ),
        },
        ...(canManage
          ? [
              {
                id: "actions",
                enableHiding: false,
                header: () => <span className="block w-full text-center">ACTIONS</span>,
                enableSorting: false,
                cell: ({ row }) => (
                  <div className="flex justify-center">
                    <ComplianceRowActions
                      requirement={row.original}
                      disabled={checkingId !== undefined}
                      onEdit={() => navigate(`/compliance-requirements/${row.original.complianceRequirementId}/edit`)}
                      onToggleStatus={() =>
                        row.original.status === "ACTIVE"
                          ? setDialog({ variant: "deactivate", requirement: row.original })
                          : void activate(row.original)}
                      onDelete={() => void requestDelete(row.original)}
                    />
                  </div>
                ),
              } satisfies ColumnDef<ComplianceRequirementSummary>,
            ]
          : []),
      ]
    },
    // activate/requestDelete only close over stable mutation objects and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, checkingId, navigate],
  )

  const table = useReactTable({
    data: requirements,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => String(row.complianceRequirementId),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <div className="booking-page-enter [animation-delay:100ms]">
        <DataTable
          table={table}
          isLoading={isLoading}
          className="gap-2.5"
          containerClassName="booking-panel overflow-x-auto"
          headerClassName="bg-[#e9e6de]"
          headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
          cellClassName="h-11 px-2.5 py-1.5 text-xs"
          emptyMessage="No compliance requirements match the current filters."
          footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
        >
          <ComplianceFilters
            filters={filters}
            onSearchChange={onSearchChange}
            onCountryChange={onCountryChange}
            onCategoryChange={onCategoryChange}
            onStatusChange={onStatusChange}
            onSortChange={onSortChange}
            onReset={onReset}
            viewOptions={<DataTableViewOptions table={table} />}
          />
        </DataTable>
      </div>

      <ComplianceActionDialog
        variant={dialog?.variant ?? null}
        requirementCode={dialog?.requirement.requirementCode}
        referenceCount={dialog?.referenceCount}
        isPending={changeStatus.isPending || deleteRequirement.isPending}
        onDeactivateInstead={
          dialog?.requirement.status === "ACTIVE" ? () => setDialog({ variant: "deactivate", requirement: dialog.requirement }) : undefined
        }
        onConfirm={() => void confirmDialog()}
        onOpenChange={(open) => !open && closeDialog()}
      />
    </>
  )
}
