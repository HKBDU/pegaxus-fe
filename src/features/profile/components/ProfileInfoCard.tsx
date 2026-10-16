import { BadgeCheck, CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ProfileInfoCardProps } from "../types"

export function ProfileInfoCard({ icon: Icon, label, value, className, variant = "default" }: ProfileInfoCardProps) {
  const normalizedValue = value?.toLowerCase()
  const isPositiveStatus = normalizedValue === "active" || normalizedValue === "working"
  const StatusIcon = isPositiveStatus ? BadgeCheck : CircleAlert

  return (
    <div className={cn("flex min-w-0 items-start gap-3 border-b border-[#e4e0d9] px-1 py-3 last:border-b-0", className)}>
      <Icon className={cn(
        "mt-0.5 size-4 shrink-0 rounded-md p-0.5 text-[#6c6963]",
        variant === "date" && "bg-slate-100 text-slate-600",
        variant === "code" && "bg-slate-100 text-slate-600",
        variant === "status" && (isPositiveStatus ? "text-emerald-600" : "text-[#9a6b22]"),
        variant === "accent" && "text-[#f39200]",
      )} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.55px] text-[#6c6963]">{label}</p>
        {variant === "status" ? (
          <span className={cn(
              "mt-1 inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-[12px] font-semibold leading-[18px]",
            isPositiveStatus
              ? "border-sky-200 bg-sky-50 text-sky-700"
              : "border-amber-200 bg-amber-50 text-amber-700",
          )}>
            <StatusIcon className={cn("size-3.5", isPositiveStatus ? "text-sky-600" : "text-amber-600")} aria-hidden="true" />
            {value ?? "Unknown"}
          </span>
        ) : variant === "accent" ? (
            <span className="mt-1 inline-flex rounded-[5px] border border-[#f39200]/35 bg-[#fff4df] px-2.5 py-0.5 text-[12px] font-semibold leading-[18px] text-[#9a5b00]">
            {value ?? "—"}
          </span>
        ) : variant === "date" ? (
          <span className="mt-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium leading-[18px] text-slate-700">
            {value ?? "Not available"}
          </span>
        ) : variant === "code" ? (
          <span className="mt-1 inline-flex max-w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[12px] leading-[18px] text-slate-700">
            <span className="truncate">{value ?? "Not available"}</span>
          </span>
        ) : (
          <p className={cn(
            "truncate text-[13px] font-medium leading-[21px] text-[#181818]",
          )}>{value ?? "—"}</p>
        )}
      </div>
    </div>
  )
}
