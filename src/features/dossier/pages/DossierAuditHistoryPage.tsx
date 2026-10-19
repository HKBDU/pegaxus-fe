import { useCallback, useState } from "react"
import { useParams } from "react-router-dom"

import { AuditFilters } from "@/features/dossier/components/AuditFilters"
import { AuditTimeline } from "@/features/dossier/components/AuditTimeline"
import { useAuditHistory } from "@/features/dossier/hooks"
import type { AuditParams } from "@/features/dossier/types"
import { getDossierErrorMessage } from "@/features/dossier/utils"
import { ErrorState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"

const initialParams: AuditParams = { pageIndex: 1, pageSize: 10, search: "", actionType: "ALL", from: "", to: "" }

/** SCR-F2-024: "Audit History" tab of the dossier page (TS and LM only; the BE answers 403 to customers). */
export function AuditHistoryPanel() {
  const { dossierId } = useParams()
  const [params, setParams] = useState(initialParams)
  const auditQuery = useAuditHistory(dossierId, params)

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])

  const audit = auditQuery.data

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <AuditFilters
        filters={params}
        onSearchChange={handleSearchChange}
        onActionChange={(actionType) => setParams((current) => ({ ...current, actionType, pageIndex: 1 }))}
        onRangeChange={({ from, to }) => setParams((current) => ({ ...current, from, to, pageIndex: 1 }))}
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
  )
}
