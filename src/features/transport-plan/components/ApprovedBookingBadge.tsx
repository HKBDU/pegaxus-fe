import { Badge } from "@/shared/components/ui/badge"

const tones: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  NOT_STARTED: "border-slate-200 bg-slate-100 text-slate-600",
  IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

export function ApprovedBookingBadge({ value }: { value: string }) {
  return <Badge variant="outline" className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${tones[value] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
    {value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}
  </Badge>
}
