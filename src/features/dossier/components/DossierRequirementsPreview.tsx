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
import { useDossierRole } from "../hooks/useDossierRole";
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
  canUploadInitialDocument,
  canSendMissingDocumentReminder,
  isMissingDossierRequirement,
  getCustomerDocumentActions,
  getDossierRequirementActionLabels,
  getDossierHorseFilterOptions,
  initialDossierRequirementsParams,
  reconcileDossierHorseFilter,
  updateDossierRequirementFilters,
} from "../constants";
import { useDossierRequirements } from "../hooks/useDossier";
import {
  dossierRequirementStatusSchema,
  dossierRequirementsParamsSchema,
} from "../schemas";
import { getDossierLoadErrorKind } from "../source";
import type {
  DossierHorseOption,
  DossierOverview,
  DossierRequirement,
  DossierRequirementsParams,
} from "../types";
import { DossierStatusBadge } from "./DossierStatusBadge";
import { DocumentSubmissionDialog } from "./DocumentSubmissionDialog";
import { DocumentDetailsDialog } from "./DocumentVersionHistory";
import { UploadComplianceDocumentDialog } from "./UploadComplianceDocumentDialog";
import { DocumentReviewDialog } from "./DocumentReviewDialog";
import { canOpenDocumentReview } from "../lib/document-review";
import { useMissingDossierRequirements } from "../hooks/useMissingDocumentReminder";
import { RequestMissingDocumentsDialog } from "./RequestMissingDocumentsDialog";
import { DossierRequirementDetailsDialog } from "./DossierRequirementDetailsDialog";

type SubmissionMode = "initial" | "edit" | "update";

function RequirementRowActions({
  item,
  role,
  dossier,
  onAction,
}: {
  item: DossierRequirement;
  role: string | undefined;
  dossier: DossierOverview;
  onAction: (item: DossierRequirement, label: string) => void;
}) {
  const labels =
    role === "CUSTOMER"
      ? getCustomerDocumentActions(dossier, item)
      : getDossierRequirementActionLabels(
          role,
          item.status,
          Boolean(item.document),
        ).filter(
          (label) =>
            label !== "Review Document" ||
            canOpenDocumentReview(role, dossier, item),
        );
  if (item.openRequest?.status === "OPEN" && !labels.includes("View Request"))
    labels.push("View Request");

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
          const actionEnabled =
            label === "View Requirement" ||
            (label === "View Request" && item.openRequest?.status === "OPEN") ||
            ((label === "Request Missing Document" ||
              label === "Send Reminder Again") &&
              canSendMissingDocumentReminder(role, dossier) &&
              isMissingDossierRequirement(item)) ||
            (label === "Upload Document" &&
              canUploadInitialDocument(role, dossier, item)) ||
            (label === "Review Document" &&
              canOpenDocumentReview(role, dossier, item)) ||
            (Boolean(item.document) &&
              (label === "View Document" ||
                label === "View Version History" ||
                label === "View Review Result" ||
                label === "View Review History" ||
                label === "View Request" ||
                (role === "CUSTOMER" &&
                  (label === "Edit Document" || label === "Update Document"))));
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
              disabled={!actionEnabled}
              onSelect={actionEnabled ? () => onAction(item, label) : undefined}
              title={
                actionEnabled
                  ? undefined
                  : `${label} is unavailable in the current dossier state`
              }
              className="gap-1.5 rounded-[2px] px-1.5 py-1 text-[0.7rem] data-[disabled]:opacity-100"
            >
              <Icon className="size-3.5" />
              <span className="min-w-0 flex-1">{label}</span>
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
  dossier,
  onAction,
}: {
  items: DossierRequirement[];
  role: string | undefined;
  dossier: DossierOverview;
  onAction: (item: DossierRequirement, label: string) => void;
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
            <div className="space-y-1.5">
              <span className="block text-xs text-slate-500">
                No document submitted
              </span>
              {canUploadInitialDocument(role, dossier, row.original) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-[2px] px-2 text-xs"
                  onClick={() => onAction(row.original, "Upload Document")}
                >
                  <Upload className="size-3.5" /> Upload Document
                </Button>
              ) : null}
            </div>
          ),
      },
      {
        id: "actions",
        header: "ACTIONS",
        cell: ({ row }) => (
          <RequirementRowActions
            item={row.original}
            role={role}
            dossier={dossier}
            onAction={onAction}
          />
        ),
      },
    ],
    [role, dossier, onAction],
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
  dossier,
  onAction,
  horse = false,
}: {
  title: string;
  items: DossierRequirement[];
  role: string | undefined;
  dossier: DossierOverview;
  onAction: (item: DossierRequirement, label: string) => void;
  horse?: boolean;
}) {
  const Icon = horse ? ChessKnight : FileText;
  return (
    <div>
      <div className="flex items-center gap-2 rounded-t-[2px]x bg-white px-4 py-3">
        <Icon aria-hidden="true" className="size-4 text-primary" />
        <h3 className="m-0! font-heading text-sm! font-semibold! uppercase text-gray-900!">
          {title}
        </h3>
        <span className="text-xs text-gray-500">
          {items.length} on this page
        </span>
      </div>
      <RequirementTable
        items={items}
        role={role}
        dossier={dossier}
        onAction={onAction}
      />
    </div>
  );
}

export function DossierRequirementFilters({
  params,
  horses,
  onChange,
}: {
  params: DossierRequirementsParams;
  horses: readonly DossierHorseOption[];
  onChange: (
    filters: Pick<DossierRequirementsParams, "status" | "horseId" | "sortBy">,
  ) => void;
}) {
  return (
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
            onChange({
              status:
                status === "ALL"
                  ? undefined
                  : dossierRequirementStatusSchema.parse(status),
            })
          }
        />
      </div>
      <div className="w-full sm:w-44 [&>button]:w-full">
        <DataTableRadioFilter
          title="All Horses"
          ariaLabel="Horse"
          value={params.horseId === undefined ? "ALL" : String(params.horseId)}
          options={getDossierHorseFilterOptions(horses)}
          hideTitleWhenFiltered
          onValueChange={(horseId) =>
            onChange({
              horseId:
                horseId === "ALL"
                  ? undefined
                  : dossierRequirementsParamsSchema.shape.horseId.parse(
                      horseId,
                    ),
            })
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
            onChange({
              sortBy:
                dossierRequirementsParamsSchema.shape.sortBy.parse(sortBy),
            })
          }
        />
      </div>
    </div>
  );
}

export function DossierRequirementsPreview({
  dossierId,
  horses,
  dossier,
  plannedDepartureDate,
  documentsOnly = false,
}: {
  dossierId: string;
  horses: readonly DossierHorseOption[];
  dossier: DossierOverview;
  plannedDepartureDate?: string;
  documentsOnly?: boolean;
}) {
  const [submission, setSubmission] = useState<{
    requirement: DossierRequirement;
    mode: SubmissionMode;
  } | null>(null);
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null);
  const [viewRequirement, setViewRequirement] =
    useState<DossierRequirement | null>(null);
  const [reviewRequirement, setReviewRequirement] =
    useState<DossierRequirement | null>(null);
  const [detailsRequirement, setDetailsRequirement] =
    useState<DossierRequirement | null>(null);
  const [reminder, setReminder] = useState<{
    requirementId?: string | number;
  } | null>(null);
  const [documentView, setDocumentView] = useState<
    "details" | "request" | "history"
  >("details");
  const onAction = (item: DossierRequirement, label: string) => {
    if (label === "View Requirement") {
      setDetailsRequirement(item);
      return;
    }
    if (
      label === "Request Missing Document" ||
      label === "Send Reminder Again"
    ) {
      if (
        canSendMissingDocumentReminder(role, dossier) &&
        isMissingDossierRequirement(item)
      )
        setReminder({ requirementId: item.dossierRequirementId });
      return;
    }
    if (label === "Review Document") {
      setReviewRequirement(item);
      return;
    }
    if (
      label === "View Document" ||
      label === "View Version History" ||
      label === "View Review Result" ||
      label === "View Review History" ||
      label === "View Request"
    ) {
      if (label === "View Request" && !item.document) {
        setDetailsRequirement(item);
        return;
      }
      if (item.document) {
        setViewRequirement(item);
        setViewDocumentId(String(item.document.complianceDocumentId));
        setDocumentView(
          label === "View Request"
            ? "request"
            : label === "View Document"
              ? "details"
              : "history",
        );
      }
      return;
    }
    if (
      label === "Upload Document" &&
      !canUploadInitialDocument(role, dossier, item)
    )
      return;
    const mode: SubmissionMode | null =
      label === "Upload Document"
        ? "initial"
        : label === "Edit Document"
          ? "edit"
          : label === "Update Document"
            ? "update"
            : null;
    if (mode) setSubmission({ requirement: item, mode });
  };
  const [storedParams, setParams] = useState<DossierRequirementsParams>(
    initialDossierRequirementsParams,
  );
  const params = reconcileDossierHorseFilter(storedParams, horses);
  // Clear removed D7 horses before requesting D8 with a stale selection.
  if (params !== storedParams) setParams(params);
  const role = useDossierRole();
  const remindersAllowed = canSendMissingDocumentReminder(role, dossier);
  const missingQuery = useMissingDossierRequirements(
    dossierId,
    remindersAllowed,
  );
  const query = useDossierRequirements(dossierId, params);
  const result = query.data;
  const viewedRequirement =
    result?.items.find(
      (item) =>
        item.dossierRequirementId === viewRequirement?.dossierRequirementId,
    ) ?? viewRequirement;
  const canUpdateViewedDocument =
    role === "CUSTOMER" &&
    viewedRequirement &&
    getCustomerDocumentActions(dossier, viewedRequirement).includes(
      "Update Document",
    );
  const visibleItems = result?.items ?? [];
  const tripItems = visibleItems.filter((item) => item.horseId === null);
  const horseGroups = new Map<
    string | number,
    { name: string; items: DossierRequirement[] }
  >();
  for (const item of visibleItems) {
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
            {documentsOnly ? "Documents / Reviews" : "Dossier requirements"}
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {documentsOnly
              ? "Document submissions, missing documents, reviews and version history from the current requirements page."
              : "Trip-level and horse-specific requirements from the current page."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DossierRequirementFilters
            params={params}
            horses={horses}
            onChange={(filters) =>
              setParams((current) =>
                updateDossierRequirementFilters(current, filters),
              )
            }
          />
          {remindersAllowed &&
          (missingQuery.isPending ||
            missingQuery.isError ||
            Boolean(missingQuery.data?.length)) ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-[2px] text-xs"
              disabled={missingQuery.isPending}
              onClick={() => setReminder({})}
            >
              <ClipboardList className="size-3.5" />
              {missingQuery.isPending
                ? "Loading missing requirements…"
                : "Request Missing Documents"}
            </Button>
          ) : null}
        </div>
      </div>
      {remindersAllowed && missingQuery.data?.length === 0 ? (
        <p className="text-xs text-slate-500">
          No missing requirements need a reminder.
        </p>
      ) : null}
      {query.isPending ? (
        <LoadingState />
      ) : errorKind ? (
        <ErrorState
          message={errorMessages[errorKind]}
          onRetry={
            errorKind === "load" ? () => void query.refetch() : undefined
          }
        />
      ) : visibleItems.length ? (
        <div className="space-y-4">
          {tripItems.length ? (
            <RequirementGroup
              title="Trip-level requirements"
              items={tripItems}
              role={role}
              dossier={dossier}
              onAction={onAction}
            />
          ) : null}
          {horseGroups.size ? (
            <section
              className="space-y-3"
              aria-label="Horse-specific requirements"
            >
              <h3 className="m-0! flex items-center gap-2 font-heading text-base! font-bold! uppercase text-gray-900! pb-2">
                <ChessKnight
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Horse-specific requirements
              </h3>
              {[...horseGroups.entries()].map(([horseId, group]) => (
                <RequirementGroup
                  key={horseId}
                  title={group.name}
                  items={group.items}
                  role={role}
                  dossier={dossier}
                  onAction={onAction}
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
              onPageChange={(pageIndex) =>
                setParams((current) => ({ ...current, pageIndex }))
              }
            />
          </div>
        </div>
      ) : null}
      {submission?.mode === "initial" ? (
        <UploadComplianceDocumentDialog
          key={submission.requirement.dossierRequirementId}
          dossier={dossier}
          requirement={submission.requirement}
          plannedDepartureDate={
            dossier.bookingSummary.requestedDepartureDate ?? undefined
          }
          role={role}
          onClose={() => setSubmission(null)}
        />
      ) : (
        <DocumentSubmissionDialog
          key={
            submission
              ? `${submission.mode}-${submission.requirement.dossierRequirementId}`
              : "closed"
          }
          dossier={dossier}
          requirement={submission?.requirement ?? null}
          mode={submission?.mode ?? "edit"}
          plannedDepartureDate={
            plannedDepartureDate ??
            dossier.bookingSummary.requestedDepartureDate ??
            undefined
          }
          role={role}
          onClose={() => setSubmission(null)}
        />
      )}
      <DocumentDetailsDialog
        documentId={viewDocumentId}
        onClose={() => setViewDocumentId(null)}
        dossierId={dossierId}
        requirementId={String(viewedRequirement?.dossierRequirementId ?? "")}
        dossier={dossier}
        role={role}
        view={documentView}
        onUpdate={
          canUpdateViewedDocument && viewedRequirement
            ? () => {
                setViewDocumentId(null);
                setSubmission({
                  requirement: viewedRequirement,
                  mode: "update",
                });
              }
            : undefined
        }
      />
      {reviewRequirement ? (
        <DocumentReviewDialog
          dossier={dossier}
          requirement={
            result?.items.find(
              (item) =>
                item.dossierRequirementId ===
                reviewRequirement.dossierRequirementId,
            ) ?? reviewRequirement
          }
          role={role}
          onClose={() => setReviewRequirement(null)}
        />
      ) : null}
      {detailsRequirement ? (
        <DossierRequirementDetailsDialog
          dossierId={dossierId}
          role={role}
          requirement={
            result?.items.find(
              (item) =>
                item.dossierRequirementId ===
                detailsRequirement.dossierRequirementId,
            ) ?? detailsRequirement
          }
          onClose={() => setDetailsRequirement(null)}
        />
      ) : null}
      {reminder ? (
        <RequestMissingDocumentsDialog
          dossier={dossier}
          role={role}
          initialRequirementId={reminder.requirementId}
          onClose={() => setReminder(null)}
        />
      ) : null}
    </section>
  );
}
