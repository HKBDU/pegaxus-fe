import { useCallback, useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { ComplianceListSkeleton } from "@/features/compliance-catalog/components/ComplianceListSkeleton"
import { ComplianceTable } from "@/features/compliance-catalog/components/ComplianceTable"
import { useComplianceRequirements } from "@/features/compliance-catalog/hooks"
import type { ComplianceRequirementListParams } from "@/features/compliance-catalog/types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"

const initialParams: ComplianceRequirementListParams = {
  pageIndex: 1,
  pageSize: 8,
  search: "",
  country: "ALL",
  category: "ALL",
  status: "ALL",
  sortBy: "updatedAt:desc",
}

/** SCR-F2-001 */
export default function ComplianceListPage() {
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  const canManage = canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  const [params, setParams] = useState(initialParams)
  const requirementsQuery = useComplianceRequirements(params)

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])

  const patchFilters = useCallback((patch: Partial<ComplianceRequirementListParams>) => {
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }))
  }, [])

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader
            title="COMPLIANCE REQUIREMENTS"
            backHref="/"
            backLabel="RETURN TO COMPLIANCE DASHBOARD"
            action={canManage ? (
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
                onClick={() => navigate("/compliance-requirements/new")}
              >
                <Plus className="size-4" />
                New requirement
              </Button>
            ) : undefined}
          />
        </div>

        {requirementsQuery.isLoading && !requirementsQuery.data ? <ComplianceListSkeleton /> : null}
        {requirementsQuery.isError ? (
          <ErrorState message="Unable to load compliance requirements." onRetry={() => void requirementsQuery.refetch()} />
        ) : null}
        {requirementsQuery.data ? (
          <ComplianceTable
            requirements={requirementsQuery.data.data}
            filters={params}
            meta={requirementsQuery.data.meta}
            canManage={canManage}
            onSearchChange={handleSearchChange}
            onCountryChange={(country) => patchFilters({ country })}
            onCategoryChange={(category) => patchFilters({ category })}
            onStatusChange={(status) => patchFilters({ status })}
            onSortChange={(sortBy) => patchFilters({ sortBy })}
            onReset={() => setParams(initialParams)}
            onPageChange={(pageIndex) => setParams((current) => ({ ...current, pageIndex }))}
            onPageSizeChange={(pageSize) => setParams((current) => ({ ...current, pageSize, pageIndex: 1 }))}
          />
        ) : null}
      </div>
    </div>
  )
}
