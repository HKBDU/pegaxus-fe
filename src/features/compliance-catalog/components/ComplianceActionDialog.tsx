import { useState } from "react"
import { Ban, Trash2, TriangleAlert } from "lucide-react"

import type { ReferenceCount } from "@/features/compliance-catalog/types"
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
import { Checkbox } from "@/shared/components/ui/checkbox"

export type ComplianceActionVariant = "deactivate" | "delete" | "delete-blocked" | "edit-impact"

interface ComplianceActionDialogProps {
  variant: ComplianceActionVariant | null
  requirementCode?: string
  referenceCount?: ReferenceCount
  isPending?: boolean
  /** Active CR in the blocked-delete dialog: offers the contract's "deactivate instead" way out. */
  onDeactivateInstead?: () => void
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

function ReferenceSummary({ count }: { count: ReferenceCount }) {
  const rows = [
    ["Template items", count.dossierTemplateItemCount],
    ["Dossier requirements", count.dossierRequirementCount],
    ["Linked dossiers", count.linkedDossierCount],
  ] as const

  return (
    <dl className="mt-1 grid grid-cols-3 divide-x divide-slate-200 rounded-[2px] border border-slate-200 bg-slate-50 text-center">
      {rows.map(([label, value]) => (
        <div key={label} className="px-2 py-1.5">
          <dt className="font-heading text-[10px] font-medium uppercase tracking-[0.06em] text-slate-500">{label}</dt>
          <dd className="text-sm font-semibold text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

const cancelButtonClass = "h-8 rounded-[2px] border-slate-300 bg-white px-3 text-xs font-normal text-slate-700 shadow-none"
const confirmButtonClass = "h-8 rounded-[2px] px-3 text-xs font-normal shadow-none"

/** SCR-F2-003: one confirmation dialog for edit-impact, deactivate and delete (including the blocked delete). */
export function ComplianceActionDialog({
  variant,
  requirementCode,
  referenceCount,
  isPending = false,
  onDeactivateInstead,
  onConfirm,
  onOpenChange,
}: ComplianceActionDialogProps) {
  const [accepted, setAccepted] = useState(false)
  const handleOpenChange = (open: boolean) => {
    if (!open) setAccepted(false)
    onOpenChange(open)
  }

  const isDestructive = variant === "delete"
  const Icon = variant === "deactivate" ? Ban : variant === "delete" ? Trash2 : TriangleAlert
  const iconTone = isDestructive || variant === "delete-blocked" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"

  const content = {
    deactivate: {
      title: "Deactivate requirement?",
      description: "Hidden from new template setups. Existing templates and active dossiers are unchanged.",
      confirm: "Confirm Deactivation",
      pending: "Deactivating...",
    },
    delete: {
      title: "Delete requirement?",
      description: "This permanently removes the requirement from the catalog.",
      confirm: "Confirm Delete",
      pending: "Deleting...",
    },
    "delete-blocked": {
      title: "Cannot delete requirement",
      description: "Linked to existing templates or active dossiers. Deactivate it instead.",
      confirm: "",
      pending: "",
    },
    "edit-impact": {
      title: "Save changes to a requirement in use?",
      description: "This change may affect active records.",
      confirm: "Save changes",
      pending: "Saving...",
    },
  }[variant ?? "deactivate"]

  return (
    <AlertDialog open={variant !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="gap-2.5 rounded-[2px] border-slate-200 bg-white p-3.5 text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.16)] data-[size=default]:sm:max-w-[390px]">
        <AlertDialogHeader className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-2 text-left">
          <AlertDialogMedia className={`m-0 grid size-6 shrink-0 place-items-center rounded-[2px] ${iconTone}`}>
            <Icon className="size-3.5" />
          </AlertDialogMedia>
          <div className="grid gap-0.5">
            <AlertDialogTitle className="m-0! w-full! justify-self-start! text-left! font-heading text-base! leading-5! font-semibold! tracking-normal! text-slate-900">
              {content.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-4 text-slate-600">
              {requirementCode ? <span className="font-semibold text-slate-900">{requirementCode}</span> : null}
              {requirementCode ? ": " : null}
              {content.description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {referenceCount && (variant === "edit-impact" || variant === "delete-blocked") ? <ReferenceSummary count={referenceCount} /> : null}

        {variant === "edit-impact" ? (
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-4 text-slate-700">
            <Checkbox
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(Boolean(checked))}
              className="mt-px size-3.5 rounded-[2px] border-slate-300 shadow-none data-[state=checked]:text-white"
            />
            I understand this change can affect existing templates and dossiers, and I accept responsibility for it.
          </label>
        ) : null}

        <AlertDialogFooter className="gap-1.5">
          <AlertDialogCancel size="sm" className={cancelButtonClass} disabled={isPending}>
            {variant === "delete-blocked" ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {variant === "delete-blocked" && onDeactivateInstead ? (
            <AlertDialogAction
              type="button"
              size="sm"
              className={`${confirmButtonClass} bg-[#ef8f00] text-slate-950 hover:bg-[#db8300]`}
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                onDeactivateInstead()
              }}
            >
              Deactivate instead
            </AlertDialogAction>
          ) : null}
          {variant !== "delete-blocked" ? (
            <AlertDialogAction
              type="button"
              variant={isDestructive ? "destructive" : "default"}
              size="sm"
              className={isDestructive ? `${confirmButtonClass} bg-red-600 text-white hover:bg-red-700` : `${confirmButtonClass} bg-[#ef8f00] text-slate-950 hover:bg-[#db8300]`}
              disabled={isPending || (variant === "edit-impact" && !accepted)}
              onClick={(event) => {
                event.preventDefault()
                onConfirm()
              }}
            >
              {isPending ? content.pending : content.confirm}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
