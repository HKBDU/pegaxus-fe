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
    <div className={cn("flex items-center justify-end gap-3  border-[#d1d5db] pb-12 pt-4", className)}>
      <Button disabled={disabled} type="button" variant="outline" onClick={onCancel} className="h-[42px] rounded-none border-[#181818] bg-white px-[33px] py-[11px] text-[14px] font-bold tracking-[0.7px] text-[#181818] shadow-[0_1px_1px_rgba(0,0,0,0.05)] ">
        {cancelLabel}
      </Button>
      <Button
        type={submitFormId ? "submit" : "button"}
        form={submitFormId}
        disabled={disabled}
        onClick={submitFormId ? undefined : onEdit}
        className="h-10 rounded-none py-[10px] font-bold tracking-[0.7px] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f39200]"
      >
        {editLabel}
      </Button>
    </div>
  )
}
