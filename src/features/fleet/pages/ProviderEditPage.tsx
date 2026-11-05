import { useState } from "react"
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog"

function EditProviderForm({ provider, onReload }: { provider: Provider; onReload: () => Promise<Provider | undefined> }) {
  const navigate = useNavigate()
  const detailPath = providerDetailPath(provider.transportProviderId)
  const [reloadOpen, setReloadOpen] = useState(false)
  const [reloading, setReloading] = useState(false)
  const [reloadFailed, setReloadFailed] = useState(false)
  const { form, submit, isSaving, reload } = useProviderForm(provider, {
    onSaved: () => navigate(detailPath),
    onStale: () => setReloadOpen(true),
  })

  async function loadLatest() {
    if (isSaving || reloading) return
    setReloading(true)
    setReloadFailed(false)
    try {
      const latest = await onReload()
      if (latest) {
        reload(latest)
        setReloadOpen(false)
      } else setReloadFailed(true)
    } finally {
      setReloading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={submit} noValidate>
        <button type="button" disabled={isSaving || reloading} className="mb-3 text-sm font-semibold underline disabled:opacity-50" onClick={() => setReloadOpen(true)}>Load latest provider</button>
        <fieldset disabled={isSaving || reloading} className="m-0 min-w-0 border-0 p-0">
          <ProviderFormSections form={form} isEdit providerCode={provider.providerCode} />
        </fieldset>
        <div className="mt-3 flex justify-end gap-2">
          <Link to={detailPath} className={cn(actionButtonClass, outlineButtonClass)}>
            Cancel
          </Link>
          <button type="submit" disabled={isSaving || reloading} className={cn(actionButtonClass, primaryButtonClass)}>
            {isSaving ? "Saving..." : "Update provider"}
          </button>
        </div>
      </form>
      <AlertDialog open={reloadOpen} onOpenChange={(open) => { if (!reloading) setReloadOpen(open) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load latest provider?</AlertDialogTitle>
            <AlertDialogDescription>This replaces your unsaved changes with the latest provider information. Your draft is kept if loading fails.</AlertDialogDescription>
            {reloadFailed ? <p className="text-sm text-red-700" role="alert">Unable to load the latest provider. Your draft is kept; try again.</p> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reloading}>Keep editing</AlertDialogCancel>
            <AlertDialogAction disabled={reloading || isSaving} onClick={(event) => { event.preventDefault(); void loadLatest() }}>Reload and replace draft</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        {providerQuery.data ? <EditProviderForm key={providerQuery.data.transportProviderId} provider={providerQuery.data} onReload={async () => { const result = await providerQuery.refetch(); return result.isSuccess ? result.data : undefined }} /> : null}
      </div>
    </div>
  )
}
