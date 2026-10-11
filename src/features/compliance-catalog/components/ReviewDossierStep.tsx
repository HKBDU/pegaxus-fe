import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { CircleCheck } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"

import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import type { Booking } from "@/features/booking/types"
import { CategoryBadge, MandatoryBadge, ScopeBadge } from "@/features/compliance-catalog/components/RequirementBadges"
import { TruncatedText } from "@/features/compliance-catalog/components/TruncatedText"
import type { FinalRequirementRow } from "@/features/compliance-catalog/dossier-types"
import type { DossierTemplate } from "@/features/compliance-catalog/template-types"
import { Badge } from "@/shared/components/ui/badge"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { DataTable } from "@/shared/components/ui/data-table"
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options"

const sectionTitleClass = "m-0! font-heading text-lg! leading-6! font-bold! tracking-[0.02em]! text-[#ef8f00]! uppercase"

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="booking-panel border bg-white p-4">
      <h2 className="m-0! mb-3! font-heading text-sm! leading-5! font-bold! tracking-[0.04em]! text-[#ef8f00]! uppercase">{title}</h2>
      <dl className="m-0 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">{children}</dl>
    </section>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="m-0 min-w-0 text-right font-semibold text-slate-900">{children}</dd>
    </>
  )
}

interface ReviewDossierStepProps {
  booking: Booking
  template: DossierTemplate | null
  rows: FinalRequirementRow[]
  counts: { total: number; horse: number; trip: number }
}

/** SCR-F2-007, step 3: what will be created, before the TS confirms. */
export function ReviewDossierStep({ booking, template, rows, counts }: ReviewDossierStepProps) {
  const [pageIndex, setPageIndex] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(pageIndex, totalPages)
  const offset = (currentPage - 1) * pageSize
  const pageRows = useMemo(() => rows.slice(offset, offset + pageSize), [offset, pageSize, rows])

  const columns = useMemo<ColumnDef<FinalRequirementRow>[]>(() => [
    { id: "no", header: "#", enableHiding: false, cell: ({ row }) => <span className="font-semibold text-slate-900">{offset + row.index + 1}</span> },
    {
      id: "name",
      header: "REQUIREMENT NAME",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <TruncatedText text={row.original.requirementName} className="max-w-[15rem] font-semibold text-slate-900" />
          {row.original.isCustom ? <span className="shrink-0 rounded-[2px] bg-amber-100 px-1 py-0.5 text-[0.6rem] font-semibold uppercase leading-none text-amber-800">Custom</span> : null}
        </div>
      ),
    },
    { id: "category", header: "CATEGORY", cell: ({ row }) => <CategoryBadge category={row.original.category} /> },
    { id: "scope", header: "APPLIES TO", cell: ({ row }) => <ScopeBadge scope={row.original.scope} /> },
    { id: "horse", header: "HORSE", cell: ({ row }) => <span className="text-slate-700">{row.original.horseName ?? "—"}</span> },
    { id: "mandatory", header: "MANDATORY", cell: ({ row }) => <MandatoryBadge mandatory={row.original.isMandatory} /> },
    { id: "notes", header: "NOTES", cell: ({ row }) => <TruncatedText text={row.original.instruction || "—"} className="max-w-[11rem] text-slate-600" /> },
  ], [offset])

  const table = useReactTable({ data: pageRows, columns, getRowId: (row) => row.key, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard title="Booking Information">
          <Line label="Request ID">{booking.bookingCode}</Line>
          <Line label="Route">{booking.originCountry} → {booking.destinationCountry}</Line>
          <Line label="No. of horses">{booking.horses.length}</Line>
          <Line label="Status"><span className="inline-flex"><BookingStatusBadge status={booking.status} audience="manager" /></span></Line>
        </InfoCard>

        <InfoCard title="Selected Template">
          {template ? (
            <>
              <Line label="Template code">{template.templateCode}</Line>
              <Line label="Template name">{template.templateName}</Line>
              <Line label="Version">v{template.versionNo}</Line>
              <Line label="Description"><span className="font-normal text-slate-600">{template.description || "—"}</span></Line>
            </>
          ) : (
            <>
              <Line label="Template">None</Line>
              <Line label="Source"><span className="font-normal text-slate-600">Custom dossier built from the requirements you added.</span></Line>
            </>
          )}
        </InfoCard>

        <InfoCard title="Final Output Summary">
          <Line label="ComplianceDossier">1</Line>
          <Line label="Total DossierRequirements">{counts.total}</Line>
          <Line label="Horse-specific">{counts.horse} (for {booking.horses.length} {booking.horses.length === 1 ? "horse" : "horses"})</Line>
          <Line label="Trip-level">{counts.trip}</Line>
          <Line label="Status after creation">
            <Badge variant="outline" className="inline-flex h-5 rounded-full border-amber-300 bg-amber-50 px-2 py-0 text-[0.65rem] font-medium text-amber-700">IN_PREPARATION</Badge>
          </Line>
        </InfoCard>
      </div>

      <div role="note" className="flex items-start gap-2 rounded-[2px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-900">
        <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <div>
          <p className="m-0 font-semibold">{template ? "The original template will not be modified." : "No template is used for this dossier."}</p>
          <p className="m-0">A new ComplianceDossier will be created using the requirements shown below, and the customer will be notified to submit them.</p>
        </div>
      </div>

      <section aria-labelledby="final-title" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="final-title" className={sectionTitleClass}>Final Dossier Requirements ({rows.length} {rows.length === 1 ? "item" : "items"})</h2>
          <DataTableViewOptions table={table} />
        </div>
        <DataTable
          table={table}
          className="gap-2.5"
          containerClassName="booking-panel overflow-x-auto"
          headerClassName="bg-[#e9e6de]"
          headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
          rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
          cellClassName="px-2.5 py-2 text-xs"
          emptyMessage="The dossier has no requirements."
          footer={
            <TablePagination
              meta={{
                totalItems: rows.length,
                totalPages,
                itemsPerPage: pageSize,
                currentPage,
                hasPreviousPage: currentPage > 1,
                hasNextPage: currentPage < totalPages,
              }}
              onPageChange={setPageIndex}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPageIndex(1)
              }}
            />
          }
        />
      </section>
    </div>
  )
}
