import { useCallback, useState } from "react"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { canAccess } from "@/features/auth/access-control"
import { useAuthStore } from "@/features/auth/store"
import { ComplianceListSkeleton } from "@/features/compliance-catalog/components/ComplianceListSkeleton"
import { TemplateTable } from "@/features/compliance-catalog/components/TemplateTable"
import { useDossierTemplates } from "@/features/compliance-catalog/hooks"
import type { DossierTemplateListParams } from "@/features/compliance-catalog/template-types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Button } from "@/shared/components/ui/button"

const initialParams: DossierTemplateListParams = {
  pageIndex: 1,
  pageSize: 8,
  search: "",
  country: "ALL",
  status: "ALL",
  sortBy: "updatedAt:desc",
}

/** SCR-F2-004 */
export default function TemplateListPage() {
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  const canManage = canAccess(principal, { anyRole: ["TRANSPORT_SPECIALIST"] })
  const [params, setParams] = useState(initialParams)
  const templatesQuery = useDossierTemplates(params)

  const handleSearchChange = useCallback((search: string) => {
    setParams((current) => (current.search === search ? current : { ...current, search, pageIndex: 1 }))
  }, [])

  const patchFilters = useCallback((patch: Partial<DossierTemplateListParams>) => {
    setParams((current) => ({ ...current, ...patch, pageIndex: 1 }))
  }, [])

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader
            title="MANAGE DOSSIER TEMPLATES"
            backHref="/"
            backLabel="RETURN TO COMPLIANCE DASHBOARD"
            action={canManage ? (
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 rounded-[2px] bg-[#ef8f00] px-4 font-heading text-xs font-semibold uppercase tracking-[0.05em] text-slate-950 hover:bg-[#db8300]"
                onClick={() => navigate("/dossier-templates/new")}
              >
                <Plus className="size-4" />
                Create template
              </Button>
            ) : undefined}
          />
          <p className="m-0 text-sm text-slate-500">Manage reusable dossier templates for compliance requirements across transport routes and jurisdictions.</p>
        </div>

        {templatesQuery.isLoading && !templatesQuery.data ? <ComplianceListSkeleton /> : null}
        {templatesQuery.isError ? <ErrorState message="Unable to load dossier templates." onRetry={() => void templatesQuery.refetch()} /> : null}
        {templatesQuery.data ? (
          <TemplateTable
            templates={templatesQuery.data.data}
            filters={params}
            meta={templatesQuery.data.meta}
            canManage={canManage}
            onSearchChange={handleSearchChange}
            onCountryChange={(country) => patchFilters({ country })}
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
