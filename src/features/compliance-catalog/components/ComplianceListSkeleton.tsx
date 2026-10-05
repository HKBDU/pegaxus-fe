import { Skeleton } from "@/shared/components/ui/skeleton"

export function ComplianceListSkeleton() {
  return (
    <div className="booking-panel booking-page-enter overflow-hidden border bg-white">
      <Skeleton className="h-10 w-full rounded-none bg-slate-200" />
      <div className="space-y-px bg-slate-100">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 bg-white p-4">
            {Array.from({ length: 6 }, (__, cellIndex) => (
              <Skeleton key={cellIndex} className="h-4 rounded-none bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
