import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { TransportArchiveTable } from "../components/TransportArchiveTable";
import { useTransportArchivePage } from "../hooks/useTransportArchivePage";

export default function TransportArchivePage() {
  const page = useTransportArchivePage();

  return (
    <div className="booking-page-shell min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px]">
        <div className="mb-6">
          <PageHeader title="TRANSPORT ARCHIVE" backHref="/admin" showBack={false} />
        </div>

        {page.isError ? (
          <ErrorState message="Unable to load transport archive." onRetry={page.retry} />
        ) : (
          <TransportArchiveTable
            items={page.items}
            meta={page.meta}
            filters={page.params}
            isLoading={page.isLoading}
            isFiltered={page.isFiltered}
            onFiltersChange={page.setFilters}
            onPageChange={page.setPage}
            onPageSizeChange={page.setPageSize}
          />
        )}
      </div>
    </div>
  );
}
