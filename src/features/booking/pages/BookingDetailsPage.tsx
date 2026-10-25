import { ArrowRight } from "lucide-react"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import { ApproveBookingDialog, RejectBookingDialog } from "@/features/booking/components/BookingDecisionDialogs"
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons"
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import { CancelBookingDialog } from "@/features/booking/components/CancelBookingDialog"
import { useBooking } from "@/features/booking/hooks"
import type { BookingAudience } from "@/features/booking/types"
import { formatBookingDate, formatSex } from "@/features/booking/utils"
import { BookingClaimsSection, SubmitClaimAction } from "@/features/claim"
import { BookingDossierLink } from "@/features/dossier"
import { CustomerInvoicesTab } from "@/features/invoice"
import { BookingTransportPlanAction } from "@/features/transport-plan/components/BookingTransportPlanAction"
import { cn } from "@/lib/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"

const EMPTY_VALUE = "—"

// maplibre-gl stays out of the main bundle: the map loads only when a booking has coordinates.
const BookingRouteMap = lazy(() => import("@/features/booking/components/BookingRouteMap"))

const panelClass = "border border-[#e5e2d9] bg-white"
const actionButtonClass =
  "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-[2px] border px-4 font-heading text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
const outlineButtonClass = "border-gray-900 bg-white text-gray-900 hover:bg-gray-100"
const dangerButtonClass = "border-red-300 bg-white text-red-700 hover:bg-red-50"
const columnHeadClass = "h-11 whitespace-normal px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"

function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dt className={cn("font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500", className)}>
      {children}
    </dt>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="m-0! font-heading text-base! leading-5! font-bold! tracking-normal! text-gray-900! uppercase">{children}</h2>
  )
}

function SummaryCell({ label, first = false, children }: { label: string; first?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative min-w-0 py-2.5",
        !first && "lg:pl-4 lg:before:absolute lg:before:inset-y-2.5 lg:before:left-0 lg:before:w-px lg:before:bg-gray-200",
      )}
    >
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-0.5 flex min-h-5 items-center text-xs leading-5 text-gray-800">{children}</dd>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-baseline">
      <FieldLabel className="pr-2">{label}</FieldLabel>
      <dd className="min-w-0 break-words text-xs leading-5 text-gray-800">{value || EMPTY_VALUE}</dd>
    </div>
  )
}

function AddressBlock({ label, address, country, latitude, longitude }: { label: string; address: string; country: string; latitude?: number | null; longitude?: number | null }) {
  return (
    <div className="min-w-0">
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-xs leading-4 text-gray-700">
        {[address, country].filter(Boolean).join(", ")}
      </dd>
      {typeof latitude === "number" && typeof longitude === "number" ? (
        <dd className="mt-0.5 text-[11px] leading-4 text-gray-500">{latitude.toFixed(4)}, {longitude.toFixed(4)}</dd>
      ) : null}
    </div>
  )
}

function ScheduleBlock({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="font-heading text-[11px] font-medium uppercase leading-4 tracking-[0.06em] text-gray-500">{label}</dt>
      <dd className="text-xs leading-5 font-medium text-gray-900">{value}</dd>
    </div>
  )
}


export default function BookingDetailsPage({ audience = "customer" }: { audience?: BookingAudience }) {
  const { bookingId = "" } = useParams()
  // Invoice notifications deep-link here as /bookings/:id?invoiceId=...; the Invoices block scrolls into view and marks that row.
  const [searchParams] = useSearchParams()
  const invoiceId = searchParams.get("invoiceId") ?? undefined
  // Claim notifications and "back" links from a claim arrive as ?claimId=...; the Handover & Claims block scrolls into view.
  const claimId = searchParams.get("claimId") ?? undefined
  const invoicesSection = useRef<HTMLElement>(null)
  const claimsSection = useRef<HTMLElement>(null)
  const bookingQuery = useBooking(bookingId)
  const booking = bookingQuery.data
  const [cancelOpen, setCancelOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const isPending = booking?.status === "PENDING"
  const canEdit = booking?.status === "PENDING" || booking?.status === "DRAFT"
  const bookingLoaded = Boolean(booking)
  useEffect(() => {
    if (invoiceId && bookingLoaded) invoicesSection.current?.scrollIntoView({ block: "start" })
    else if (claimId && bookingLoaded) claimsSection.current?.scrollIntoView({ block: "start" })
  }, [invoiceId, claimId, bookingLoaded])
  const listPath = audience === "manager" ? "/admin/transport-requests" : "/bookings"
  const hasOutcome = Boolean(
    booking && (booking.assignedEmployee || booking.transport || booking.rejectionReason || booking.cancellationReason),
  )

  return (
    <div className="min-h-[70dvh] bg-[#f4f2ed] px-5 pt-5 pb-8 sm:px-6 lg:px-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="BOOKING DETAILS" backHref={listPath} backLabel="BACK TO REQUESTS LIST" />
          {booking ? (
            <div className="flex w-full flex-row flex-nowrap items-center gap-2 sm:w-auto sm:shrink-0 sm:pb-0.5 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:px-2 sm:[&>*]:flex-none sm:[&>*]:px-4">
              {audience === "customer" && canEdit ? (
                <Link to={`/bookings/${booking.bookingId}/edit`} className={cn(actionButtonClass, outlineButtonClass)}>
                  Edit booking
                </Link>
              ) : null}
              {audience === "manager" && isPending ? (
                <>
                  <button type="button" className={cn(actionButtonClass, dangerButtonClass)} onClick={() => setRejectOpen(true)}>
                    Reject
                  </button>
                  <button
                    type="button"
                    className={cn(actionButtonClass, "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700")}
                    onClick={() => setApproveOpen(true)}
                  >
                    Approve
                  </button>
                </>
              ) : null}
              {audience === "manager" && booking.status === "APPROVED" && typeof booking.bookingId === "string" ? (
                <BookingTransportPlanAction
                  key={booking.bookingId}
                  bookingId={booking.bookingId}
                  status={booking.status}
                />
              ) : null}
              {audience === "customer" && booking.transport?.status === "IN_TRANSIT" ? (
                <Link
                  to={`/bookings/${encodeURIComponent(String(booking.bookingId))}/transports/${encodeURIComponent(String(booking.transport.transportId))}`}
                  className={cn(actionButtonClass, outlineButtonClass)}
                >
                  Tracking
                </Link>
              ) : null}
              {audience === "customer" && booking.transport ? (
                <SubmitClaimAction onlyFirst bookingId={String(booking.bookingId)} className={cn(actionButtonClass, outlineButtonClass)} />
              ) : null}
              {audience === "customer" && (booking.status === "APPROVED" || booking.status === "CANCELLED") ? (
                <BookingDossierLink bookingId={String(booking.bookingId)} className={cn(actionButtonClass, outlineButtonClass)} />
              ) : null}
              <Link
                to={`/bookings/${encodeURIComponent(String(booking.bookingId))}/history`}
                className={cn(actionButtonClass, "border-primary bg-primary text-gray-900 hover:border-primary-hover hover:bg-primary-hover")}
              >
                View status history
              </Link>
            </div>
          ) : null}
        </div>

        {bookingQuery.isLoading ? <BookingDetailsSkeleton /> : null}
        {bookingQuery.isError ? <ErrorState message="Unable to load this booking." onRetry={() => void bookingQuery.refetch()} /> : null}

        {booking ? (
          <div className="booking-stagger space-y-2.5">
            <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-4 lg:grid-cols-4 lg:gap-x-0 lg:pr-0")}>
              <SummaryCell first label="Booking code">
                <span className="text-lg leading-5 font-semibold text-gray-900">{booking.bookingCode}</span>
              </SummaryCell>
              <SummaryCell label="Status">
                <BookingStatusBadge status={booking.status} audience={audience} />
              </SummaryCell>
              <SummaryCell label="Created date">{formatBookingDate(booking.createdAt, true)}</SummaryCell>
              <SummaryCell label="Last updated">{formatBookingDate(booking.updatedAt, true)}</SummaryCell>
            </dl>

            <div className="grid gap-2.5 lg:grid-cols-[minmax(0,560fr)_minmax(0,792fr)]">
              <section className={cn(panelClass, "p-4")}>
                <CardTitle>Customer information</CardTitle>
                <dl className="mt-3 space-y-1.5">
                  <InfoRow label="Full name" value={booking.customer.fullName} />
                  <InfoRow label="Phone" value={booking.customer.phone} />
                </dl>
              </section>

              <section className={cn(panelClass, "p-4")}>
                <CardTitle>Route &amp; schedule</CardTitle>
                <dl className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_1px_minmax(0,1.1fr)] lg:gap-x-4 xl:grid-cols-[190fr_13px_20px_30px_148fr_24px_1px_36px_235fr] xl:gap-x-0">
                  <div className="xl:col-start-1">
                    <AddressBlock label="Pickup address" address={booking.originAddress} country={booking.originCountry} latitude={booking.originLatitude} longitude={booking.originLongitude} />
                  </div>
                  <ArrowRight className="hidden size-5 text-gray-700 xl:col-start-3 lg:mt-1 lg:block" strokeWidth={1.5} aria-hidden="true" />
                  <div className="xl:col-start-5">
                    <AddressBlock label="Destination address" address={booking.destinationAddress} country={booking.destinationCountry} latitude={booking.destinationLatitude} longitude={booking.destinationLongitude} />
                  </div>
                  <div className="hidden bg-gray-200 xl:col-start-7 lg:block lg:self-stretch" aria-hidden="true" />
                  <div className="space-y-1.5 xl:col-start-9">
                    <ScheduleBlock label="Expected departure date" value={formatBookingDate(booking.requestedDepartureDate)} />
                    {booking.requestedArrivalDate ? (
                      <ScheduleBlock label="Expected arrival date" value={formatBookingDate(booking.requestedArrivalDate)} />
                    ) : null}
                  </div>
                </dl>
              </section>
            </div>

            {/* Bookings made before the map existed have no coordinates, so there is nothing to draw. */}
            {typeof booking.originLatitude === "number" || typeof booking.destinationLatitude === "number" ? (
              <section className={cn(panelClass, "p-4")}>
                <CardTitle>Route map</CardTitle>
                <div className="mt-2.5">
                  <Suspense fallback={<div className="h-[420px] animate-pulse bg-[#e9e6de]" />}>
                    <BookingRouteMap {...booking} />
                  </Suspense>
                </div>
              </section>
            ) : null}

            <section className={cn(panelClass, "p-4")}>
              <CardTitle>Selected racehorses</CardTitle>
              <div className="mt-2.5 overflow-x-auto border border-[#e5e2d9]">
                <Table className="min-w-[860px] table-fixed">
                  <colgroup>
                    <col className="w-12" />
                    <col className="w-[22%]" />
                    <col className="w-[20%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                    <col />
                  </colgroup>
                  <TableHeader className="bg-[#f2efe8] [&_tr]:border-b-0">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className={cn(columnHeadClass, "text-center")}>#</TableHead>
                      <TableHead className={columnHeadClass}>Horse name</TableHead>
                      <TableHead className={columnHeadClass}>Passport ID</TableHead>
                      <TableHead className={columnHeadClass}>Breed</TableHead>
                      <TableHead className={columnHeadClass}>Gender</TableHead>
                      <TableHead className={columnHeadClass}>Special note (per horse)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.horses.length ? (
                      booking.horses.map((horse, index) => (
                        <TableRow key={horse.horseId} className={cn("booking-table-row h-11 border-slate-200 hover:bg-amber-50/60", index % 2 === 0 ? "bg-white" : "bg-[#f7f6f3]")}>
                          <TableCell className="px-2.5 py-1.5 text-center text-xs text-gray-400">{index + 1}</TableCell>
                          <TableCell className="truncate px-2.5 py-1.5 text-xs font-semibold text-gray-900">{horse.horseName}</TableCell>
                          <TableCell className="truncate px-2.5 py-1.5 font-mono text-xs text-gray-600">{horse.passportNumber}</TableCell>
                          <TableCell className="truncate px-2.5 py-1.5 text-xs text-gray-600">{horse.breed}</TableCell>
                          <TableCell className="px-2.5 py-1.5 text-xs text-gray-600">{formatSex(horse.sex)}</TableCell>
                          <TableCell className="truncate px-2.5 py-1.5 text-xs text-gray-600">{horse.specialHandlingNotes || EMPTY_VALUE}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="h-10 hover:bg-transparent">
                        <TableCell colSpan={6} className="px-4 py-0 text-center text-[13px] text-gray-500">
                          No racehorses have been added to this booking.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className={cn(panelClass, "grid items-center gap-3 p-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-4")}>
              <div>
                <CardTitle>Trip requirements</CardTitle>
              </div>
              <dl className="space-y-2 border-gray-200 lg:border-l lg:pl-4">
                <div>
                  <FieldLabel>General notes</FieldLabel>
                  <dd className="mt-1 text-xs leading-[18px] text-gray-700">{booking.specialRequirements || "No special trip requirements."}</dd>
                </div>
                {booking.customerNote ? (
                  <div>
                    <FieldLabel>Customer note</FieldLabel>
                    <dd className="mt-1 text-xs leading-[18px] text-gray-700">{booking.customerNote}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            {hasOutcome ? (
              <dl className={cn(panelClass, "grid gap-x-4 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-4")}>
                {booking.assignedEmployee ? <InfoBlock label="Handled by" value={booking.assignedEmployee.fullName} /> : null}
                {booking.approvedAt ? <InfoBlock label="Approved at" value={formatBookingDate(booking.approvedAt, true)} /> : null}
                {booking.rejectedAt ? <InfoBlock label="Rejected at" value={formatBookingDate(booking.rejectedAt, true)} /> : null}
                {booking.cancelledAt ? <InfoBlock label="Cancelled at" value={formatBookingDate(booking.cancelledAt, true)} /> : null}
                {booking.transport ? <InfoBlock label="Transport" value={booking.transport.transportCode} /> : null}
                {booking.rejectionReason ? <InfoBlock label="Rejection reason" value={booking.rejectionReason} className="sm:col-span-2" /> : null}
                {booking.cancellationReason ? <InfoBlock label="Cancellation reason" value={booking.cancellationReason} className="sm:col-span-2" /> : null}
              </dl>
            ) : null}

            {audience === "customer" ? (
              <section ref={invoicesSection} id="booking-invoices" aria-label="Invoices" className={cn(panelClass, "scroll-mt-4 p-4")}>
                <CardTitle>Invoices</CardTitle>
                <div className="mt-2.5">
                  <CustomerInvoicesTab bookingId={String(booking.bookingId)} highlightInvoiceId={invoiceId} />
                </div>
              </section>
            ) : null}

            {audience === "customer" && booking.transport ? (
              <section ref={claimsSection} id="booking-claims" aria-label="Handover and claims" className={cn(panelClass, "scroll-mt-4 p-4")}>
                <CardTitle>Handover &amp; Claims</CardTitle>
                <div className="mt-2.5">
                  <BookingClaimsSection bookingId={String(booking.bookingId)} highlightClaimId={claimId} />
                </div>
              </section>
            ) : null}

            {audience === "customer" && isPending ? (
              <div className="flex justify-end pt-1">
                <button type="button" className={cn(actionButtonClass, dangerButtonClass)} onClick={() => setCancelOpen(true)}>
                  Cancel booking
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {booking ? <CancelBookingDialog bookingId={booking.bookingId} open={cancelOpen} onOpenChange={setCancelOpen} /> : null}
      {booking ? <ApproveBookingDialog bookingId={booking.bookingId} bookingCode={booking.bookingCode} open={approveOpen} onOpenChange={setApproveOpen} /> : null}
      {booking ? <RejectBookingDialog bookingId={booking.bookingId} bookingCode={booking.bookingCode} open={rejectOpen} onOpenChange={setRejectOpen} /> : null}
    </div>
  )
}

function InfoBlock({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <dd className="mt-1 text-sm leading-5 text-gray-800">{value}</dd>
    </div>
  )
}
