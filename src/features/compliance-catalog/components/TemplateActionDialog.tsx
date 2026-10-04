import { useState } from "react"
import { ArrowLeftRight, Trash2, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import { TemplateStatusBadge } from "@/features/compliance-catalog/components/TemplateStatusBadge"
import type { TemplateStatus } from "@/features/compliance-catalog/template-types"
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

export type TemplateActionVariant = "change-status" | "delete" | "delete-blocked"

interface TemplateActionDialogProps {
  variant: TemplateActionVariant | null
  templateCode?: string
  currentStatus?: TemplateStatus
  complianceDossierCount?: number
  isPending?: boolean
  /** Active template in the blocked-delete dialog: offers the contract's "set INACTIVE instead" way out. */
  onChangeStatusInstead?: () => void
  onConfirm: (status?: TemplateStatus) => void
  onOpenChange: (open: boolean) => void
}

const cancelButtonClass = "h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none"
const confirmButtonClass = "h-8 rounded-[2px] px-3 text-xs font-normal shadow-none"
const primaryButtonClass = `${confirmButtonClass} bg-[#ef8f00] text-slate-950 hover:bg-[#db8300]`

function StatusPicker({ current, value, onChange }: { current: TemplateStatus; value: TemplateStatus; onChange: (status: TemplateStatus) => void }) {
  const validNextStatuses: Record<TemplateStatus, TemplateStatus[]> = {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["INACTIVE"],
    INACTIVE: ["ACTIVE"],
  }

  return (
    <div role="radiogroup" aria-label="New status" className="grid gap-1">
      {validNextStatuses[current].map((status) => (
        <button
          key={status}
          type="button"
          role="radio"
          aria-checked={status === value}
          onClick={() => onChange(status)}
          className={cn(
            "flex items-center gap-2 rounded-[2px] border px-2.5 py-1.5 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-primary",
            status === value ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:bg-slate-50",
          )}
        >
          <span aria-hidden="true" className={cn("size-3 rounded-full border", status === value ? "border-amber-500 bg-amber-500 shadow-[inset_0_0_0_2px_white]" : "border-slate-300")} />
          <TemplateStatusBadge status={status} />
        </button>
      ))}
    </div>
  )
}

/** SCR-F2-006: change a template's status, or delete it (including the blocked delete). */
export function TemplateActionDialog({
  variant,
  templateCode,
  currentStatus = "DRAFT",
  complianceDossierCount = 0,
  isPending = false,
  onChangeStatusInstead,
  onConfirm,
  onOpenChange,
}: TemplateActionDialogProps) {
  const [target, setTarget] = useState<TemplateStatus | null>(null)
  const validNextStatuses: Record<TemplateStatus, TemplateStatus[]> = {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["INACTIVE"],
    INACTIVE: ["ACTIVE"],
  }
  const nextStatus = target ?? validNextStatuses[currentStatus][0]

  const handleOpenChange = (open: boolean) => {
    if (!open) setTarget(null)
    onOpenChange(open)
  }

  const Icon = variant === "change-status" ? ArrowLeftRight : variant === "delete" ? Trash2 : TriangleAlert
  const iconTone = variant === "change-status" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
  const content = {
    "change-status": {
      title: "Change template status?",
      description: "Choose the next valid status.",
    },
    delete: {
      title: "Delete template?",
      description: "Are you sure you want to delete this DossierTemplate?",
    },
    "delete-blocked": {
      title: "Cannot delete template",
      description: `Linked to ${complianceDossierCount} existing dossier${complianceDossierCount === 1 ? "" : "s"}. Set it INACTIVE instead.`,
    },
  }[variant ?? "delete"]

  return (
    <AlertDialog open={variant !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="gap-2.5 rounded-[2px] border-slate-200 bg-white p-3.5 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[390px]">
        <AlertDialogHeader className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2 text-left">
          <AlertDialogMedia className={`m-0 grid size-6 shrink-0 place-items-center rounded-[2px] ${iconTone}`}>
            <Icon className="size-3.5" />
          </AlertDialogMedia>
          <div className="grid gap-0.5">
            <AlertDialogTitle className="m-0! w-full! justify-self-start! text-left! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">{content.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              {templateCode ? <span className="font-semibold text-slate-900">{templateCode}: </span> : null}
              {content.description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {variant === "change-status" ? (
          <div className="grid gap-1.5">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              Current status <TemplateStatusBadge status={currentStatus} />
            </p>
            <StatusPicker current={currentStatus} value={nextStatus} onChange={setTarget} />
          </div>
        ) : null}

        <AlertDialogFooter className="gap-1.5">
          <AlertDialogCancel size="sm" className={cancelButtonClass} disabled={isPending}>
            {variant === "delete-blocked" ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {variant === "delete-blocked" && onChangeStatusInstead ? (
            <AlertDialogAction
              type="button"
              size="sm"
              className={primaryButtonClass}
              onClick={(event) => {
                event.preventDefault()
                onChangeStatusInstead()
              }}
            >
              Set INACTIVE instead
            </AlertDialogAction>
          ) : null}
          {variant !== "delete-blocked" ? (
            <AlertDialogAction
              type="button"
              variant={variant === "delete" ? "destructive" : "default"}
              size="sm"
              className={variant === "delete" ? `${confirmButtonClass} bg-red-600 text-white hover:bg-red-700` : primaryButtonClass}
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                onConfirm(variant === "change-status" ? nextStatus : undefined)
              }}
            >
              {isPending ? (variant === "delete" ? "Deleting..." : "Updating...") : variant === "delete" ? "Confirm Delete" : "Update status"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
