import { Skeleton } from "@/shared/components/ui/skeleton"

export function BookingListSkeleton() {
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

export function BookingDetailsSkeleton() {
  return (
    <div className="booking-stagger space-y-4">
      <Skeleton className="h-[78px] rounded-none bg-[#e9e6de]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,560fr)_minmax(0,792fr)]">
        <Skeleton className="h-[241px] rounded-none bg-[#e9e6de]" />
        <Skeleton className="h-[241px] rounded-none bg-[#e9e6de]" />
      </div>
      <Skeleton className="h-64 rounded-none bg-[#e9e6de]" />
      <Skeleton className="h-[98px] rounded-none bg-[#e9e6de]" />
    </div>
  )
}
