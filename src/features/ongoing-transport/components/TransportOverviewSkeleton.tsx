import { Skeleton } from "@/shared/components/ui/skeleton";

export function TransportOverviewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading transport overview"
      className="space-y-4"
    >
      <span className="sr-only">Loading transport overview…</span>
      <div
        aria-hidden="true"
        className="overview-panel grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="overview-panel grid divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-4 p-4">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }, (_, row) => (
              <Skeleton key={row} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="overview-panel space-y-4 p-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
