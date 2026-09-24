import { cn } from "@/lib/utils"

import type { ProfileFieldProps } from "../types"

export function ProfileField({ label, value, className }: ProfileFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-[6px]", className)}>
      <span className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase">{label}</span>
      <div className="flex min-h-[42px] min-w-0 items-center border border-[#f39200] bg-[#f4f4f4] px-[15px] py-[10.5px]">
        <span className="truncate text-[14px] font-medium leading-[21px] text-[#181818]">{value || "—"}</span>
      </div>
    </div>
  )
}
