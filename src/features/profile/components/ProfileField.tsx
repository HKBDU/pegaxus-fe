import { cn } from "@/lib/utils"

import type { ProfileFieldProps } from "../types"

export function ProfileField({ label, value, className, readOnly = false }: ProfileFieldProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[11px] font-bold leading-[16.5px] tracking-[0.55px] uppercase">{label}</span>
      <div className={cn("flex min-h-[30px] min-w-0 items-center border border-[#f39200] bg-[#f4f4f4] px-3 py-2 lg:py-1", readOnly && "border-[#c8c8c8] bg-[#dedede]")}>
        <span className={cn("truncate text-[13px] font-medium leading-[21px] text-[#181818]", readOnly && "text-[#6c6963]")}>{value || "—"}</span>
      </div>
    </div>
  )
}
