import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table"
import { ArrowLeftRight, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { TemplateActionDialog, type TemplateActionVariant } from "@/features/compliance-catalog/components/TemplateActionDialog"
import { TemplateFilters } from "@/features/compliance-catalog/components/TemplateFilters"
import { TemplateStatusBadge } from "@/features/compliance-catalog/components/TemplateStatusBadge"
import { useChangeTemplateStatus, useDeleteDossierTemplate } from "@/features/compliance-catalog/hooks"
import { templateService } from "@/features/compliance-catalog/template-services"
import type { DossierTemplateListParams, DossierTemplateSummary, TemplateSort, TemplateStatus } from "@/features/compliance-catalog/template-types"
import { formatTemplateDate, getTemplateErrorMessage } from "@/features/compliance-catalog/template-utils"
import { formatComplianceDate, formatComplianceTime } from "@/features/compliance-catalog/utils"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Button } from "@/shared/components/ui/button"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { useRequestAttemptGuard } from "@/shared/hooks/useRequestAttemptGuard"
import type { EntityId, PaginationMeta } from "@/shared/types"

const menuItemClass = "gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem]"

interface RowActionsProps {
  template: DossierTemplateSummary
  disabled: boolean
  onEdit: () => void
  onChangeStatus: () => void
  onDelete: () => void
}

function TemplateRowActions({ template, disabled, onEdit, onChangeStatus, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95" variant="ghost" aria-label={`Actions for ${template.templateCode}`}>
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={2} className="w-40 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md">
        <DropdownMenuItem className={menuItemClass} disabled={disabled} onSelect={onEdit}>
          <Pencil className="size-3.5 text-amber-600" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className={menuItemClass} disabled={disabled} onSelect={onChangeStatus}>
          <ArrowLeftRight className="size-3.5 text-slate-600" />
          Change status
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
  variant: TemplateActionVariant
  template: DossierTemplateSummary
  complianceDossierCount?: number
}

interface TemplateTableProps {
  templates: DossierTemplateSummary[]
  filters: DossierTemplateListParams
  meta: PaginationMeta
  isLoading?: boolean
  /** Only Transport Specialists may change templates; Logistics Managers get a read-only list. */
  canManage: boolean
  onSearchChange: (value: string) => void
  onCountryChange: (value: string) => void
  onStatusChange: (value: TemplateStatus | "ALL") => void
  onSortChange: (value: TemplateSort) => void
  onReset: () => void
  onPageChange: (value: number) => void
  onPageSizeChange: (value: number) => void
}

export function TemplateTable({
  templates,
  filters,
  meta,
  isLoading,
  canManage,
  onSearchChange,
  onCountryChange,
  onStatusChange,
  onSortChange,
  onReset,
  onPageChange,
  onPageSizeChange,
}: TemplateTableProps) {
  const navigate = useNavigate()
  const [sorting, setSorting] = useState<SortingState>([])
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [checkingId, setCheckingId] = useState<EntityId>()
  const changeStatus = useChangeTemplateStatus()
  const deleteTemplate = useDeleteDossierTemplate()
  const attempt = useRequestAttemptGuard()

  const closeDialog = () => {
    setDialog(null)
    attempt.reset()
  }

  // The list rows carry no reference count, so Delete reads the detail first (T2) to explain a blocked delete.
  const requestDelete = async (template: DossierTemplateSummary) => {
    setCheckingId(template.dossierTemplateId)
    try {
      const detail = await templateService.getTemplate(template.dossierTemplateId)
      setDialog({
        variant: detail.isReferenced ? "delete-blocked" : "delete",
        template,
        complianceDossierCount: detail.referenceCount.complianceDossierCount,
      })
    } catch (error) {
      toast.error(getTemplateErrorMessage(error, "Unable to check this template"))
    } finally {
      setCheckingId(undefined)
    }
  }

  const confirmDialog = async (status?: TemplateStatus) => {
    if (!dialog) return
    const { variant, template } = dialog
    try {
      const guarded = await attempt.run(async () => {
        if (variant === "change-status" && status) {
          await changeStatus.mutateAsync({ id: template.dossierTemplateId, status })
        } else if (variant === "delete") {
          await deleteTemplate.mutateAsync(template.dossierTemplateId)
        }
      })
      if (!guarded.started) return
      toast.success(variant === "delete" ? "DossierTemplate deleted successfully." : "DossierTemplate status updated successfully.")
      closeDialog()
    } catch (error) {
      if (variant === "delete" && error instanceof Error && error.message === "TEMPLATE_IN_USE") {
        // A dossier was created from it after the list loaded: show the blocked state instead of a bare toast.
        setDialog({ variant: "delete-blocked", template })
        attempt.reset()
        return
      }
      toast.error(getTemplateErrorMessage(error, variant === "delete" ? "Unable to delete this template" : "Unable to update the status"))
    }
  }

  const columns = useMemo<ColumnDef<DossierTemplateSummary>[]>(
    () => [
      {
        accessorKey: "templateName",
        header: "TEMPLATE NAME",
        cell: ({ row }) => <span className="block min-w-56 max-w-80 whitespace-normal font-semibold leading-snug text-slate-900">{row.original.templateName}</span>,
      },
      {
        accessorKey: "templateCode",
        enableHiding: false,
        header: "TEMPLATE CODE",
        cell: ({ row }) => <span className="whitespace-nowrap font-medium text-slate-700">{row.original.templateCode}</span>,
      },
      {
        accessorKey: "itemCount",
        header: () => <span className="block w-full text-center">ITEMS</span>,
        enableSorting: false,
        cell: ({ row }) => <span className="block text-center font-semibold text-slate-900">{row.original.itemCount}</span>,
      },
      {
        accessorKey: "versionNo",
        header: "VERSION",
        cell: ({ row }) => <span className="text-slate-700">v{row.original.versionNo}</span>,
      },
      {
        accessorKey: "status",
        header: () => <span className="block w-full text-center">STATUS</span>,
        enableSorting: false,
        cell: ({ row }) => <div className="flex justify-center"><TemplateStatusBadge status={row.original.status} /></div>,
      },
      {
        accessorKey: "effectiveFrom",
        header: "EFFECTIVE",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-slate-900">{formatTemplateDate(row.original.effectiveFrom)}</span>
            <span className="mt-1 block text-[0.68rem] text-slate-400">
              {row.original.effectiveTo ? `to ${formatTemplateDate(row.original.effectiveTo)}` : "No end date"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "LAST UPDATED",
        cell: ({ row }) => (
          <div className="leading-tight">
            <span className="block text-slate-900">{formatComplianceDate(row.original.updatedAt)}</span>
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
                  <TemplateRowActions
                    template={row.original}
                    disabled={checkingId !== undefined}
                    onEdit={() => navigate(`/dossier-templates/${row.original.dossierTemplateId}/edit`)}
                    onChangeStatus={() => setDialog({ variant: "change-status", template: row.original })}
                    onDelete={() => void requestDelete(row.original)}
                  />
                </div>
              ),
            } satisfies ColumnDef<DossierTemplateSummary>,
          ]
        : []),
    ],
    // requestDelete only closes over stable setters and the mutation-free service.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, checkingId, navigate],
  )

  const table = useReactTable({
    data: templates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getRowId: (row) => String(row.dossierTemplateId),
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
          emptyMessage="No dossier templates match the current filters."
          footer={<TablePagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
        >
          <TemplateFilters
            filters={filters}
            onSearchChange={onSearchChange}
            onCountryChange={onCountryChange}
            onStatusChange={onStatusChange}
            onSortChange={onSortChange}
            onReset={onReset}
            viewOptions={<DataTableViewOptions table={table} />}
          />
        </DataTable>
      </div>

      <TemplateActionDialog
        key={dialog?.template.dossierTemplateId}
        variant={dialog?.variant ?? null}
        templateCode={dialog?.template.templateCode}
        currentStatus={dialog?.template.status}
        complianceDossierCount={dialog?.complianceDossierCount}
        isPending={changeStatus.isPending || deleteTemplate.isPending}
        onChangeStatusInstead={
          dialog?.template.status !== "INACTIVE"
            ? () => setDialog({ variant: "change-status", template: dialog!.template })
            : undefined
        }
        onConfirm={(status) => void confirmDialog(status)}
        onOpenChange={(open) => !open && closeDialog()}
      />
    </>
  )
}
