import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { cn } from "@/lib/utils"

import { PROFILE_DEFAULT_LABELS } from "../constants/profile.constants"
import type { ProfileAvatarPreviewProps } from "../types"

export function ProfileAvatarPreview({
  initials,
  label = PROFILE_DEFAULT_LABELS.avatarPreview,
  avatarUrl,
  alt = "Profile avatar",
  className,
}: ProfileAvatarPreviewProps) {
  return (
    <div className={cn("flex h-[150px] min-h-[104px] flex-col items-center justify-center  bg-[#f4f4f4] px-3 py-4", className)}>
      <Avatar className="size-30 shrink-0 border border-[#f39200] bg-[#f4f4f4] text-[#f39200] shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={alt} />}
        <AvatarFallback className="bg-[#f4f4f4] text-[18px] font-bold tracking-[0.9px] text-[#f39200]">{initials}</AvatarFallback>
      </Avatar>
      <span className="mt-[6px] text-center text-[11px] font-semibold leading-[16.5px] tracking-[0.55px] text-[#6c6963]">{label}</span>
    </div>
  )
}
