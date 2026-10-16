import { Link, useNavigate, useParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import { actionButtonClass, outlineButtonClass, PAGE_SHELL_CLASS, PAGE_WIDTH_CLASS, primaryButtonClass } from "@/features/fleet/components/DetailParts"
import { FleetListSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { ProviderFormSections } from "@/features/fleet/components/ProviderForm"
import { useProviderForm } from "@/features/fleet/hooks/useProviderForm"
import { providerDetailPath } from "@/features/fleet/constants/fleet.constants"
import { useProvider } from "@/features/fleet/hooks"
import type { Provider } from "@/features/fleet/types"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"
import { Form } from "@/shared/components/ui/form"

function EditProviderForm({ provider }: { provider: Provider }) {
  const navigate = useNavigate()
  const detailPath = providerDetailPath(provider.transportProviderId)
  const { form, submit, isSaving } = useProviderForm(provider, {
    onSaved: () => navigate(detailPath),
    // The row changed under us: leave the stale form for the refreshed details page.
    onStale: () => navigate(detailPath),
  })

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={isSaving} className="m-0 min-w-0 border-0 p-0">
          <ProviderFormSections form={form} isEdit />
        </fieldset>
        <div className="mt-3 flex justify-end gap-2">
          <Link to={detailPath} className={cn(actionButtonClass, outlineButtonClass)}>
            Cancel
          </Link>
          <button type="submit" disabled={isSaving} className={cn(actionButtonClass, primaryButtonClass)}>
            {isSaving ? "Saving..." : "Update provider"}
          </button>
        </div>
      </form>
    </Form>
  )
}

/** UC-41 edit transport provider (SCR-F3-021): a page like the booking edit page, not a popup. */
export default function ProviderEditPage() {
  const { providerId } = useParams()
  const providerQuery = useProvider(providerId)

  return (
    <div className={PAGE_SHELL_CLASS}>
      <div className={PAGE_WIDTH_CLASS}>
        <div className="mb-3">
          <PageHeader
            title="EDIT PROVIDER"
            backHref={providerId ? providerDetailPath(providerId) : "/transport-providers"}
            backLabel="BACK TO PROVIDER DETAILS"
          />
        </div>
        {providerQuery.isLoading ? <FleetListSkeleton columns={4} /> : null}
        {providerQuery.isError ? <ErrorState message="Unable to load this provider." onRetry={() => void providerQuery.refetch()} /> : null}
        {providerQuery.data ? <EditProviderForm key={providerQuery.data.updatedAt} provider={providerQuery.data} /> : null}
      </div>
    </div>
  )
}
