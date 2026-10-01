import { useCallback, useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { BookingListSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { BookingTable } from "@/features/booking/components/BookingTable"
import { useBookings } from "@/features/booking/hooks"
import type { BookingAudience, BookingListParams, BookingSort, BookingStatus } from "@/features/booking/types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"

const initialParams: BookingListParams = {
  pageIndex: 1,
  pageSize: 5,
  search: "",
  status: "ALL",
  sortBy: "createdAt:desc",
}

export default function BookingListPage({ audience = "customer" }: { audience?: BookingAudience }) {
  const navigate = useNavigate()
  const [params, setParams] = useState(initialParams)
  const bookingsQuery = useBookings(params)

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => current.search === search ? current : { ...current, search, pageIndex: 1 })
  }, [])

  const handleStatusChange = useCallback((status: BookingStatus | "ALL") => {
    setParams((current) => ({ ...current, status, pageIndex: 1 }))
  }, [])

  const handleSortChange = useCallback((sortBy: BookingSort) => {
    setParams((current) => ({ ...current, sortBy, pageIndex: 1 }))
  }, [])

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader
            title={audience === "manager" ? "TRANSPORT REQUESTS" : "MY BOOKING LIST"}
            backHref={audience === "manager" ? "/admin/transport-requests" : "/"}
            action={audience === "customer" ? (
              <Button
                type="button"
                size="sm"
                aria-label="New request"
                className="h-8 shrink-0 rounded-[2px] bg-[#ef8f00] px-3 font-heading text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300] lg:hidden"
                onClick={() => navigate("/bookings/new")}
              >
                <Plus className="size-3.5" />
                New
              </Button>
            ) : undefined}
          />
        </div>

        {bookingsQuery.isLoading && !bookingsQuery.data ? <BookingListSkeleton /> : null}
        {bookingsQuery.isError ? (
          <ErrorState message="Unable to load bookings." onRetry={() => void bookingsQuery.refetch()} />
        ) : null}
        {bookingsQuery.data ? (
          <BookingTable
            bookings={bookingsQuery.data.data}
            audience={audience}
            filters={params}
            meta={bookingsQuery.data.meta}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onSortChange={handleSortChange}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
            onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
            onCreate={audience === "customer" ? () => navigate("/bookings/new") : undefined}
          />
        ) : null}
      </div>
    </div>
  )
}
