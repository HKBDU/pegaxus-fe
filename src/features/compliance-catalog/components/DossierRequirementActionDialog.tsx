import { useEffect, useState } from "react"
import { toast } from "sonner"

import { getRequirementErrorMessage } from "@/features/compliance-catalog/template-utils"
import { useUpdateDossierRequirement, useWaiveDossierRequirement } from "@/features/compliance-catalog/hooks"
import type { DossierRequirementItem } from "@/features/compliance-catalog/dossier-types"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Textarea } from "@/shared/components/ui/textarea"
import { Input } from "@/shared/components/ui/input"

export type DossierRequirementAction = { type: "edit" | "waive"; requirement: DossierRequirementItem } | null

export function DossierRequirementActionDialog({ dossierId, action, onClose }: { dossierId: string; action: DossierRequirementAction; onClose: () => void }) {
  const updateRequirement = useUpdateDossierRequirement(dossierId)
  const waiveRequirement = useWaiveDossierRequirement(dossierId)
  const [isMandatory, setIsMandatory] = useState(false)
  const [instruction, setInstruction] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    setIsMandatory(action?.requirement.isMandatory ?? false)
    setInstruction(action?.requirement.note ?? "")
    setReason("")
  }, [action])

  const pending = updateRequirement.isPending || waiveRequirement.isPending
  const submit = async () => {
    if (!action) return
    try {
      if (action.type === "edit") {
        await updateRequirement.mutateAsync({ dossierRequirementId: action.requirement.dossierRequirementId, input: { isMandatory, instruction: instruction.trim() || undefined, reason: "Updated from dossier detail" } })
        toast.success("DossierRequirement updated successfully.")
      } else {
        if (!reason.trim()) return
        await waiveRequirement.mutateAsync({ dossierRequirementId: action.requirement.dossierRequirementId, input: { reason: reason.trim() } })
        toast.success("DossierRequirement waived successfully.")
      }
      onClose()
    } catch (error) {
      toast.error(getRequirementErrorMessage(error, action.type === "edit" ? "Unable to update this requirement" : "Unable to waive this requirement"))
    }
  }

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="rounded-[2px] border-slate-200 bg-white">
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-xl uppercase text-slate-900">{action?.type === "edit" ? "Edit dossier requirement" : "Waive dossier requirement"}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">{action?.requirement.requirementName}</DialogDescription>
        </DialogHeader>
        {action?.type === "edit" ? (
          <div className="grid gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Input type="checkbox" checked={isMandatory} onChange={(event) => setIsMandatory(event.target.checked)} className="size-4" />
              Mandatory requirement
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Instruction
              <Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} maxLength={1000} />
            </label>
          </div>
        ) : (
          <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Waive reason
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this requirement is waived" />
          </label>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={pending || (action?.type === "waive" && !reason.trim())} onClick={() => void submit()}>
            {pending ? "Saving..." : action?.type === "edit" ? "Save changes" : "Waive requirement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

