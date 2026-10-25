import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { useTransportArchive } from "../hooks/useTransportArchive";
import { TransportArchiveFilter } from "../components/TransportArchiveFilter";
import { TransportArchiveTable } from "../components/TransportArchiveTable";
import type { TransportArchiveQuery } from "../types";
const defaults: TransportArchiveQuery = { pageIndex: 1, pageSize: 20 };
export default function TransportArchivePage() {
  const [url, setUrl] = useSearchParams();
  const params: TransportArchiveQuery = {
    ...defaults,
    search: url.get("search") ?? undefined,
    completedFrom: url.get("completedFrom") ?? undefined,
    completedTo: url.get("completedTo") ?? undefined,
    originCountry: url.get("originCountry") ?? undefined,
    destinationCountry: url.get("destinationCountry") ?? undefined,
    pageIndex: Number(url.get("pageIndex") ?? 1),
    pageSize: Number(url.get("pageSize") ?? 20),
  };
  const query = useTransportArchive(params);
  const change = (patch: Partial<TransportArchiveQuery>) =>
    setUrl(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(patch).forEach(([key, value]) =>
          value === undefined || value === ""
            ? next.delete(key)
            : next.set(key, String(value)),
        );
        if (!Object.hasOwn(patch, "pageIndex")) next.set("pageIndex", "1");
        return next;
      },
      { replace: true },
    );
  const meta = query.data?.meta ?? {
    totalItems: 0,
    totalPages: 0,
    itemsPerPage: params.pageSize,
    currentPage: params.pageIndex,
    hasPreviousPage: false,
    hasNextPage: false,
  };
  return (
    <main className="min-h-[calc(100svh-5rem)] bg-[#f4f2ed] px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <PageHeader
          title="TRANSPORT ARCHIVE"
          backHref="/admin"
          showBack={false}
        />
        <TransportArchiveFilter value={params} onChange={change} />
        {query.isError ? (
          <ErrorState
            message="Unable to load transport archive."
            onRetry={() => void query.refetch()}
          />
        ) : (
          <TransportArchiveTable
            items={query.data?.items ?? []}
            meta={meta}
            loading={query.isPending || query.isFetching}
            onPageChange={(pageIndex) => change({ pageIndex })}
            onPageSizeChange={(pageSize) => change({ pageSize })}
            archiveParams={params}
          />
        )}
      </div>
    </main>
  );
}
