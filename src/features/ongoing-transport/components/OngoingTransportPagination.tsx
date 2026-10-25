import { PageSizeSelect, Pagination } from "@/shared/components/common";
import type { PaginationMeta } from "@/shared/types";
import { ONGOING_PAGE_SIZE_OPTIONS } from "../constants";

export function OngoingTransportPagination({
  meta,
  busy,
  onPageChange,
  onPageSizeChange,
}: {
  meta: PaginationMeta;
  busy: boolean;
  onPageChange: (pageNumber: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const first =
    meta.totalItems === 0 ? 0 : (meta.currentPage - 1) * meta.itemsPerPage + 1;
  const last = Math.min(meta.currentPage * meta.itemsPerPage, meta.totalItems);
  return (
    <fieldset
      disabled={busy}
      aria-label="Transport pagination"
      className="m-0 flex min-w-0 flex-wrap items-center justify-between gap-2 border-0 p-0 text-xs text-slate-500"
    >
      <p role="status" className="m-0">
        Showing {first} to {last} of {meta.totalItems} entries
      </p>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <PageSizeSelect
          value={meta.itemsPerPage}
          options={ONGOING_PAGE_SIZE_OPTIONS}
          ariaLabel="Ongoing transports per page"
          onValueChange={onPageSizeChange}
        />
        <Pagination meta={meta} onPageChange={onPageChange} />
      </div>
    </fieldset>
  );
}
