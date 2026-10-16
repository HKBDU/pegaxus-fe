import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { cn } from "@/lib/utils"
import {
  actionButtonClass,
  dangerButtonClass,
  FieldLabel,
  InfoCard,
  InfoRow,
  outlineButtonClass,
  PAGE_SHELL_CLASS,
  PAGE_WIDTH_CLASS,
  panelClass,
  primaryButtonClass,
  SummaryCell,
  CardTitle,
} from "@/features/fleet/components/DetailParts"
import { FleetListSkeleton } from "@/features/fleet/components/FleetSkeletons"
import { ProviderDeleteDialog, ProviderStatusDialog } from "@/features/fleet/components/ProviderActionDialogs"
import { ProviderModeBadge, ProviderStatusBadge } from "@/features/fleet/components/ProviderBadges"
import { PROVIDER_LIST_PATH, providerEditPath } from "@/features/fleet/constants/fleet.constants"
import { useProvider } from "@/features/fleet/hooks"
import { formatFleetDateTime } from "@/features/fleet/utils"
import { ErrorState } from "@/shared/components/common"
import { PageHeader } from "@/shared/components/PageHeader"

/** UC-41: transport provider details. Laid out like the booking details page. */
export default function ProviderDetailPage() {
  const { providerId } = useParams()
  const navigate = useNavigate()
  const providerQuery = useProvider(providerId)
  const provider = providerQuery.data
  const [statusOpen, setStatusOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className={PAGE_SHELL_CLASS}>
      <div className={PAGE_WIDTH_CLASS}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="PROVIDER DETAILS" backHref={PROVIDER_LIST_PATH} backLabel="RETURN TO PROVIDERS LIST" />
          {provider ? (
            <div className="flex w-full flex-row flex-nowrap items-center gap-2 sm:w-auto sm:shrink-0 sm:pb-0.5 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:px-2 sm:[&>*]:flex-none sm:[&>*]:px-4">
              <button type="button" className={cn(actionButtonClass, dangerButtonClass)} onClick={() => setDeleteOpen(true)}>
                Delete
              </button>
              <button type="button" className={cn(actionButtonClass, outlineButtonClass)} onClick={() => setStatusOpen(true)}>
                Change status
              </button>
              <Link to={providerEditPath(provider.transportProviderId)} className={cn(actionButtonClass, primaryButtonClass)}>
                Edit provider
              </Link>
            </div>
          ) : null}
        </div>

        {providerQuery.isLoading ? <FleetListSkeleton columns={4} /> : null}
        {providerQuery.isError ? <ErrorState message="Unable to load this provider." onRetry={() => void providerQuery.refetch()} /> : null}

        {provider ? (
          <div className="booking-stagger space-y-2.5">
            <dl className={cn(panelClass, "grid grid-cols-2 gap-x-4 px-4 lg:grid-cols-4 lg:gap-x-0 lg:pr-0")}>
              <SummaryCell first label="Provider code">
                <span className="text-lg leading-5 font-semibold text-gray-900">{provider.providerCode}</span>
              </SummaryCell>
              <SummaryCell label="Status">
                <ProviderStatusBadge status={provider.status} />
              </SummaryCell>
              <SummaryCell label="Created date">{formatFleetDateTime(provider.createdAt)}</SummaryCell>
              <SummaryCell label="Last updated">{formatFleetDateTime(provider.updatedAt)}</SummaryCell>
            </dl>

            <div className="grid gap-2.5 lg:grid-cols-2">
              <InfoCard title="Basic information">
                <InfoRow label="Provider name" value={provider.providerName} />
                <InfoRow label="Tax code / VAT" value={provider.taxCode} />
                <InfoRow
                  label="Service type"
                  value={
                    provider.supportedModes.length ? (
                      <span className="flex flex-wrap gap-1">
                        {provider.supportedModes.map((mode) => <ProviderModeBadge key={mode} mode={mode} />)}
                      </span>
                    ) : null
                  }
                />
              </InfoCard>

              <InfoCard title="Contact information">
                <InfoRow label="Business representative" value={provider.contactName} />
                <InfoRow label="Email" value={provider.email} />
                <InfoRow label="Hotline" value={provider.phone} />
                <InfoRow label="Country" value={provider.country} />
                <InfoRow label="Address" value={provider.address} />
              </InfoCard>
            </div>

            <section className={cn(panelClass, "grid items-center gap-3 p-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-4")}>
              <CardTitle>Additional information</CardTitle>
              <dl className="border-gray-200 lg:border-l lg:pl-4">
                <FieldLabel>Notes for coordinators</FieldLabel>
                <dd className="mt-1 whitespace-pre-wrap text-xs leading-[18px] text-gray-700">{provider.note || "No additional notes."}</dd>
              </dl>
            </section>
          </div>
        ) : null}
      </div>

      <ProviderStatusDialog provider={statusOpen ? (provider ?? null) : null} onOpenChange={setStatusOpen} />
      <ProviderDeleteDialog
        provider={deleteOpen ? (provider ?? null) : null}
        onOpenChange={setDeleteOpen}
        onDeleted={() => navigate(PROVIDER_LIST_PATH, { replace: true })}
      />
    </div>
  )
}
