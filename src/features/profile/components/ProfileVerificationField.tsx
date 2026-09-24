import { cn } from "@/lib/utils"

import { EMAIL_VERIFICATION_LABELS } from "../constants/profile.constants"
import type { ProfileVerificationFieldProps } from "../types"

export function ProfileVerificationField({ status, className }: ProfileVerificationFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-[6px] py-[10px]", className)}>
      <span className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase">EMAIL VERIFICATION STATUS</span>
      <div className="flex min-h-[42px] items-center gap-[6px] border border-[#f39200] bg-[#f4f4f4] px-[15px] py-[7.5px] text-[14px] font-semibold leading-[21px] text-[#f39200]">
        <span aria-hidden="true">✓</span>
        <span>{EMAIL_VERIFICATION_LABELS[status]}</span>
      </div>
    </div>
  )
}
