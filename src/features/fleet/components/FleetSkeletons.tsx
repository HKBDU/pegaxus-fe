import { Skeleton } from "@/shared/components/ui/skeleton"

export function FleetListSkeleton({ columns = 8 }: { columns?: number }) {
  return (
    <div className="booking-panel booking-page-enter overflow-hidden border bg-white">
      <Skeleton className="h-10 w-full rounded-none bg-slate-200" />
      <div className="space-y-px bg-slate-100">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid gap-4 bg-white p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }, (__, cellIndex) => (
              <Skeleton key={cellIndex} className="h-4 rounded-none bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function VehicleFormSkeleton() {
  return (
    <div className="booking-panel booking-page-enter grid gap-6 border bg-white p-7">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="grid gap-3 border-b border-slate-100 pb-6 sm:grid-cols-[200px_1fr]">
          <Skeleton className="h-6 w-40 rounded-none bg-slate-200" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-9 rounded-none bg-slate-100" />
            <Skeleton className="h-9 rounded-none bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
