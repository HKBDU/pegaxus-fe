import { cn } from "@/lib/utils"

import type { ProfileInfoCardProps } from "../types"

export function ProfileInfoCard({ icon: Icon, label, value, className }: ProfileInfoCardProps) {
  return (
    <div className={cn("flex min-w-0 items-start gap-3 bg-[#f4f4f4] px-4 py-3", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-[#6c6963]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-[#6c6963]">{label}</p>
        <p className="truncate text-[13px] font-medium leading-[21px] text-[#181818]">{value ?? "—"}</p>
      </div>
    </div>
  )
}
