import { Info } from "lucide-react"
import { useCallback, useState } from "react"
import { useParams } from "react-router-dom"

import { AuditFilters } from "@/features/dossier/components/AuditFilters"
import { AuditTimeline } from "@/features/dossier/components/AuditTimeline"
import { DossierHeaderCard } from "@/features/dossier/components/DossierHeaderCard"
import { DossierTabs } from "@/features/dossier/components/DossierTabs"
import { useAuditHistory, useDossierOverview } from "@/features/dossier/hooks"
import type { AuditParams } from "@/features/dossier/types"
import { getDossierErrorMessage } from "@/features/dossier/utils"
import { ErrorState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { PageHeader } from "@/shared/components/PageHeader"
import { Skeleton } from "@/shared/components/ui/skeleton"

const initialParams: AuditParams = { pageIndex: 1, pageSize: 10, search: "", actionType: "ALL", from: "", to: "" }

/** SCR-F2-024: "Audit History" tab of a dossier (TS and LM only; the BE answers 403 to customers). */
export function AuditHistoryPanel({ embedded = false }: { embedded?: boolean }) {
  const { dossierId } = useParams()
  const [params, setParams] = useState(initialParams)
  const overviewQuery = useDossierOverview(dossierId)
  const auditQuery = useAuditHistory(dossierId, params)

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])

  const overview = overviewQuery.data
  const audit = auditQuery.data

  return (
    <div className={embedded ? "grid gap-5" : "booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10"}>
      <div className="booking-page-enter mx-auto w-full max-w-[1280px]">
        {!embedded ? <div className="mb-6">
          <PageHeader title="AUDIT HISTORY" backHref="/compliance-dossiers" backLabel="Back to dossier tracking" />
          <p className="m-0 text-sm text-slate-500">
            View the immutable audit trail for ComplianceDossier{overview ? <span className="font-semibold text-slate-700"> {overview.bookingCode}</span> : null}.
          </p>
        </div> : null}

        {overviewQuery.isError ? (
          <ErrorState message={getDossierErrorMessage(overviewQuery.error, "Unable to load this dossier.")} onRetry={() => void overviewQuery.refetch()} />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
            {!embedded ? (overview ? <DossierHeaderCard overview={overview} /> : <Skeleton className="h-20 rounded-none bg-[#e9e6de]" />) : null}
            {!embedded && dossierId ? <DossierTabs dossierId={dossierId} active="audit" /> : null}

            <div role="note" className="flex items-start gap-2 rounded-[2px] border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs leading-5 text-sky-900">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="m-0 font-semibold">Audit records are immutable and cannot be edited or deleted.</p>
                <p className="m-0">This log captures all changes made to the ComplianceDossier, its documents and requirements, for accountability and compliance.</p>
              </div>
            </div>

            <AuditFilters
              filters={params}
              onSearchChange={handleSearchChange}
              onActionChange={(actionType) => setParams((current) => ({ ...current, actionType, pageIndex: 1 }))}
              onRangeChange={({ from, to }) => setParams((current) => ({ ...current, from, to, pageIndex: 1 }))}
              onReset={() => setParams(initialParams)}
            />

            {auditQuery.isError ? (
              <ErrorState message={getDossierErrorMessage(auditQuery.error, "Unable to load the audit history.")} onRetry={() => void auditQuery.refetch()} />
            ) : (
              <>
                <AuditTimeline events={audit?.data ?? []} isLoading={auditQuery.isLoading && !audit} />
                {audit ? (
                  <TablePagination
                    meta={audit.meta}
                    onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
                    onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
                  />
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DossierAuditHistoryPage() {
  return <AuditHistoryPanel />
}
