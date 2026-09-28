import { Button } from "@/shared/components/ui/button"
import { cn } from "@/lib/utils"

import { PROFILE_DEFAULT_LABELS } from "../constants/profile.constants"
import type { ProfileActionButtonsProps } from "../types"

export function ProfileActionButtons({
  onCancel,
  onEdit,
  submitFormId,
  disabled,
  cancelLabel = PROFILE_DEFAULT_LABELS.cancel,
  editLabel = PROFILE_DEFAULT_LABELS.editProfile,
  className,
}: ProfileActionButtonsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 border-[#d1d5db] pb-8 pt-3", className)}>
      {onCancel ? <Button disabled={disabled} type="button" variant="outline" onClick={onCancel} className="h-9 rounded-none border-[#181818] bg-white px-6 py-2 text-xs font-bold tracking-[0.6px] text-[#181818] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        {cancelLabel}
      </Button> : null}
      <Button
        type={submitFormId ? "submit" : "button"}
        form={submitFormId}
        disabled={disabled}
        onClick={submitFormId ? undefined : (event) => {
          event.preventDefault()
          onEdit?.()
        }}
        className="h-9 rounded-none py-2 text-xs font-bold tracking-[0.6px] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f39200]"
      >
        {editLabel}
      </Button>
    </div>
  )
}
