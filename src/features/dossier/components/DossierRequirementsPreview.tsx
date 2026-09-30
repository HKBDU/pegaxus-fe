import { useMemo, useState } from "react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ChessKnight,
  ClipboardList,
  Eye,
  FileText,
  History,
  MoreVertical,
  Pencil,
  Upload,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store";
import { formatBookingDate } from "@/features/booking/utils";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageSizeSelect,
  Pagination,
} from "@/shared/components/common";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTableRadioFilter } from "@/shared/components/ui/data-table-radio-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  dossierRequirementSortOptions,
  dossierRequirementStatusOptions,
  getDossierRequirementActionLabels,
  initialDossierRequirementsParams,
} from "../constants";
import { useDossierRequirements } from "../hooks/useDossier";
import { dossierRequirementStatusSchema } from "../schemas";
import { getDossierLoadErrorKind } from "../source";
import type { DossierRequirement, DossierRequirementsParams } from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";

function RequirementRowActions({
  item,
  role,
}: {
  item: DossierRequirement;
  role: string | undefined;
}) {
  const labels = getDossierRequirementActionLabels(
    role,
    item.status,
    Boolean(item.document),
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7 rounded-[2px] p-0 transition-transform hover:scale-105 active:scale-95"
          aria-label={`Actions for ${item.requirementName}`}
        >
          <MoreVertical className="size-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={2}
        className="w-52 min-w-0 rounded-[2px] border-slate-200 p-0.5 shadow-md"
      >
        {!labels.length ? (
          <DropdownMenuItem disabled className="text-xs">
            No actions for your role
          </DropdownMenuItem>
        ) : null}
        {labels.map((label) => {
          const Icon = label.startsWith("Upload")
            ? Upload
            : label.startsWith("Edit")
              ? Pencil
              : label.includes("History")
                ? History
                : label.startsWith("Request")
                  ? ClipboardList
                  : Eye;
          return (
            <DropdownMenuItem
              key={label}
              disabled
              title={`${label} is not available in this phase`}
              className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[disabled]:opacity-100"
            >
              <Icon className="size-3.5" />
              <span className="min-w-0 flex-1">{label}</span>
              <span className="text-[10px] text-slate-500">Soon</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RequirementTable({
  items,
  role,
}: {
  items: DossierRequirement[];
  role: string | undefined;
}) {
  const columns = useMemo<ColumnDef<DossierRequirement>[]>(
    () => [
      {
        accessorKey: "requirementName",
        header: "REQUIREMENT",
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900">
            {row.original.requirementName}
          </span>
        ),
      },
      {
        accessorKey: "isMandatory",
        header: "MANDATORY",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            aria-label={
              row.original.isMandatory
                ? "Mandatory requirement"
                : "Optional requirement"
            }
            className={`inline-flex h-5 rounded-full px-1.5 py-0 text-[0.65rem] leading-none ${row.original.isMandatory ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-600"}`}
          >
            {row.original.isMandatory ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "DUE DATE",
        cell: ({ row }) =>
          row.original.dueDate ? formatBookingDate(row.original.dueDate) : "—",
      },
      {
        accessorKey: "validUntil",
        header: "VALID UNTIL",
        cell: ({ row }) =>
          row.original.validUntil
            ? formatBookingDate(row.original.validUntil)
            : "—",
      },
      {
        accessorKey: "status",
        header: "STATUS",
        cell: ({ row }) => <DossierStatusBadge status={row.original.status} />,
      },
      {
        id: "document",
        header: "DOCUMENT",
        cell: ({ row }) =>
          row.original.document ? (
            <div className="leading-tight">
              <span className="block font-medium text-slate-900">
                {row.original.document.documentCode}
              </span>
              <span className="mt-1 block text-[0.68rem] text-slate-400">
                Version {row.original.document.latestVersionNo}
              </span>
            </div>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "ACTIONS",
        cell: ({ row }) => (
          <RequirementRowActions item={row.original} role={role} />
        ),
      },
    ],
    [role],
  );
  const table = useReactTable({
    data: items,
    columns,
    getRowId: (row) => String(row.dossierRequirementId),
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataTable
      table={table}
      tableClassName="min-w-[760px]"
      containerClassName="booking-panel overflow-x-auto rounded-t-none"
      headerClassName="bg-[#e9e6de]"
      headerCellClassName="h-11 whitespace-nowrap px-2.5 font-heading text-[11px] font-medium uppercase tracking-[0.06em] text-gray-600"
      rowClassName="booking-table-row border-slate-200 hover:bg-amber-50/60"
      cellClassName="h-11 px-2.5 py-1.5 text-xs"
    />
  );
}

function RequirementGroup({
  title,
  items,
  role,
  horse = false,
}: {
  title: string;
  items: DossierRequirement[];
  role: string | undefined;
  horse?: boolean;
}) {
  const Icon = horse ? ChessKnight : FileText;
  return (
    <div>
      <div className="flex items-center gap-2 rounded-t-[2px]x bg-white px-4 py-3">
        <Icon aria-hidden="true" className="size-4 text-primary" />
        <h3 className="m-0! font-heading text-sm! font-semibold! uppercase text-gray-900!">{title}</h3>
        <span className="text-xs text-gray-500">{items.length} on this page</span>
      </div>
      <RequirementTable items={items} role={role} />
    </div>
  );
}

export function DossierRequirementsPreview({
  dossierId,
}: {
  dossierId: string;
}) {
  const [params, setParams] = useState<DossierRequirementsParams>(
    initialDossierRequirementsParams,
  );
  const roles = useAuthStore((state) => state.principal?.roles);
  const role = roles?.find(
    (value) =>
      value === "CUSTOMER" ||
      value === "TRANSPORT_SPECIALIST" ||
      value === "LOGISTICS_MANAGER",
  );
  const query = useDossierRequirements(dossierId, params);
  const result = query.data;
  const tripItems = result?.items.filter((item) => item.horseId === null) ?? [];
  const horseGroups = new Map<
    number,
    { name: string; items: DossierRequirement[] }
  >();
  for (const item of result?.items ?? []) {
    if (item.horseId === null) continue;
    const group = horseGroups.get(item.horseId) ?? {
      name: item.horseName ?? `Horse #${item.horseId}`,
      items: [],
    };
    group.items.push(item);
    horseGroups.set(item.horseId, group);
  }
  const meta = result
    ? {
        currentPage: result.pageIndex,
        itemsPerPage: result.pageSize,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        hasPreviousPage: result.pageIndex > 1,
        hasNextPage: result.pageIndex < result.totalPages,
      }
    : null;
  const errorKind = query.isError ? getDossierLoadErrorKind(query.error) : null;
  const errorMessages = {
    unauthorized: "Your session has expired. Please sign in again.",
    forbidden: "You do not have permission to view these requirements.",
    "not-found": "This compliance dossier was not found.",
    contract:
      "The requirements response does not match the expected data contract.",
    load: "Unable to load dossier requirements. Please try again.",
  };

  return (
    <section aria-label="Dossier requirements" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="m-0! font-heading text-lg! font-bold! uppercase text-gray-900!">
            Dossier requirements
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Trip-level and horse-specific requirements from the current page.
          </p>
        </div>
        <div
          role="toolbar"
          aria-label="Requirement filters"
          className="flex w-full flex-wrap items-center gap-2 sm:w-auto"
        >
          <div className="w-full sm:w-44 [&>button]:w-full">
            <DataTableRadioFilter
              title="Status"
              value={params.status ?? "ALL"}
              options={dossierRequirementStatusOptions}
              hideTitleWhenFiltered
              onValueChange={(status) =>
                setParams((current) => ({
                  ...current,
                  status:
                    status === "ALL"
                      ? undefined
                      : dossierRequirementStatusSchema.parse(status),
                  pageIndex: 1,
                }))
              }
            />
          </div>
          <div className="w-full sm:w-44 [&>button]:w-full">
            <DataTableRadioFilter
              title="Sort"
              value={params.sortBy ?? "createdAt:asc"}
              defaultValue="createdAt:asc"
              options={dossierRequirementSortOptions}
              hideTitleWhenFiltered
              onValueChange={(sortBy) =>
                setParams((current) => ({
                  ...current,
                  sortBy: sortBy as DossierRequirementsParams["sortBy"],
                  pageIndex: 1,
                }))
              }
            />
          </div>
        </div>
      </div>
      {query.isPending ? (
        <LoadingState />
      ) : errorKind ? (
        <ErrorState
          message={errorMessages[errorKind]}
          onRetry={
            errorKind === "load" ? () => void query.refetch() : undefined
          }
        />
      ) : result?.items.length ? (
        <div className="space-y-4">
          {tripItems.length ? (
            <RequirementGroup
              title="Trip-level requirements"
              items={tripItems}
              role={role}
            />
          ) : null}
          {horseGroups.size ? (
            <section
              className="space-y-3"
              aria-label="Horse-specific requirements"
            >
              <h3 className="m-0! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900! pb-2">
                <ChessKnight aria-hidden="true" className="size-4 text-primary" />
                Horse-specific requirements
              </h3>
              {[...horseGroups.entries()].map(([horseId, group]) => (
                <RequirementGroup
                  key={horseId}
                  title={group.name}
                  items={group.items}
                  role={role}
                  horse
                />
              ))}
            </section>
          ) : null}
        </div>
      ) : (
        <EmptyState message="No dossier requirements match the current filter." />
      )}
      {meta ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            Showing {result?.items.length ?? 0} of {meta.totalItems}{" "}
            requirements
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <PageSizeSelect
              value={params.pageSize ?? 20}
              options={[5, 10, 20, 50]}
              onValueChange={(pageSize) =>
                setParams((current) => ({ ...current, pageIndex: 1, pageSize }))
              }
            />
            <Pagination
              meta={meta}
              showSinglePage
              onPageChange={(pageIndex) =>
                setParams((current) => ({ ...current, pageIndex }))
              }
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
