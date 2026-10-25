import { useEffect, useReducer, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { REPORT_MOCK_MODE } from "@/lib/report-mode";
import { ROLE_ROUTES } from "@/app/route-config";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { FinancialNoteEditor } from "../components/FinancialNoteEditor";
import { FinancialDemoNotice } from "../components/FinancialDemoNotice";
import {
  FinancialOverview,
  ReconciliationSection,
  SuggestedItemsTable,
} from "../components/FinancialReportSections";
import {
  useFinancialAccess,
  useFinancialReport,
} from "../hooks/useFinancialReport";
import { createNoteDraft, reduceNoteDraft } from "../note-draft";
import { financialLabel, financialTime } from "../presentation";
import { transportIdSchema, type FinancialReport } from "../schemas";
import {
  financialError,
  isFinancialTerminal,
  type FinancialReportError,
} from "../services";

type ReportQuery = ReturnType<typeof useFinancialReport>;

function LoadedReport({
  report,
  api,
}: {
  report: FinancialReport;
  api: ReportQuery;
}) {
  const [draft, dispatch] = useReducer(
    reduceNoteDraft,
    report,
    createNoteDraft,
  );
  const [operationError, setOperationError] =
    useState<FinancialReportError | null>(null);
  const [feedback, setFeedback] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    dispatch({ type: "receive", report });
  }, [report]);
  const readError = api.query.error ? financialError(api.query.error) : null;
  const terminal = [operationError, readError].find(
    (error) => error && isFinancialTerminal(error),
  );
  const busy = api.refresh.isPending || api.save.isPending;
  const persisted =
    !report.isProvisional &&
    report.financialReportId !== null &&
    report.updatedAt !== null;
  const editable =
    api.allowed &&
    persisted &&
    report.transport.status === "COMPLETED" &&
    !readError &&
    !terminal &&
    operationError?.code !== "TRANSPORT_NOT_COMPLETED";

  function failed(error: unknown) {
    if (!alive.current) return;
    const failure = financialError(error);
    setOperationError(failure);
    setFeedback("");
    if (failure.code === "FINANCIAL_REPORT_MODIFIED") {
      dispatch({ type: "conflict" });
      setConflictOpen(true);
    }
  }

  async function reload() {
    if (busy || api.query.isFetching) return;
    setFeedback("");
    const result = await api.query.refetch();
    if (!alive.current) return;
    if (result.isError) {
      failed(result.error);
      return;
    }
    if (result.data) {
      dispatch({ type: "reload", report: result.data });
      setOperationError(null);
      setConflictOpen(false);
      setFeedback(
        "Latest report loaded. Your unsaved note is kept; review it before saving.",
      );
    }
  }

  async function refresh() {
    if (REPORT_MOCK_MODE) return;
    if (!editable || busy || api.query.isFetching || draft.needsReview) return;
    setOperationError(null);
    setFeedback("");
    try {
      await api.refresh.mutateAsync();
      if (alive.current)
        setFeedback("Financial figures refreshed from the server.");
    } catch (error) {
      failed(error);
    }
  }

  async function save() {
    if (REPORT_MOCK_MODE) return;
    if (
      !editable ||
      busy ||
      api.query.isFetching ||
      draft.needsReview ||
      !draft.version ||
      draft.text.length > 2000 ||
      draft.text.trim() === draft.baseline
    )
      return;
    const revision = draft.revision;
    setOperationError(null);
    setFeedback("");
    try {
      const confirmed = await api.save.mutateAsync({
        lastUpdatedAt: draft.version,
        summaryNote: draft.text.trim() || null,
      });
      if (!alive.current) return;
      dispatch({ type: "saved", report: confirmed, revision });
      setFeedback("Note saved. Any newer typing remains in your draft.");
    } catch (error) {
      failed(error);
    }
  }

  if (terminal) return <ErrorState message={terminal.message} />;
  const noteError = operationError?.fields
    .filter((field) => ["summaryNote", "SummaryNote"].includes(field.field))
    .map((field) => field.message)
    .join(" ");

  return (
    <div className="min-w-0 space-y-4" aria-busy={busy || api.query.isFetching}>
      <section className="min-w-0 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="m-0 break-words text-sm font-medium text-slate-800">
              {report.transport.transportCode} · {report.booking.bookingCode}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Badge variant="outline">
                {report.isProvisional ? "Provisional" : "Saved report"}
              </Badge>
              <span>{financialLabel(report.transport.status)}</span>
              {report.reportCode ? <span>{report.reportCode}</span> : null}
              <span>Currency: {report.currency}</span>
            </div>
          </div>
          <Button
            type="button"
            variant={report.isStale ? "default" : "outline"}
            onClick={() => void refresh()}
            disabled={
              REPORT_MOCK_MODE ||
              !editable ||
              busy ||
              api.query.isFetching ||
              draft.needsReview
            }
            className="h-auto min-h-10 max-w-full whitespace-normal rounded-[2px] text-left"
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 shrink-0 ${api.refresh.isPending ? "animate-spin" : ""}`}
            />
            {api.refresh.isPending
              ? "Refreshing financial data…"
              : "Refresh financial data"}
          </Button>
        </div>
        <dl className="mt-3 mb-0 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
          {(
            [
              ["Generated", report.generatedAt],
              ["Updated", report.updatedAt],
              ["As of", report.serverTime],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="inline font-medium">{label}: </dt>
              <dd className="m-0 inline">{financialTime(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
      {readError || operationError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="m-0 min-w-0 flex-1 break-words">
            {(operationError ?? readError)?.message}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy || api.query.isFetching}
            onClick={() => void reload()}
            className="rounded-[2px]"
          >
            Load latest report
          </Button>
        </div>
      ) : null}
      <div
        role="status"
        aria-live="polite"
        className="min-h-5 text-xs text-emerald-800"
      >
        {feedback ||
          (api.query.isFetching
            ? "Loading the latest report; your current view is kept."
            : "")}
      </div>
      <FinancialOverview report={report} />
      <ReconciliationSection report={report} />
      <SuggestedItemsTable report={report} />
      <FinancialNoteEditor
        demo={REPORT_MOCK_MODE}
        draft={draft}
        editable={Boolean(editable)}
        busy={busy}
        saving={api.save.isPending}
        fetching={api.query.isFetching}
        error={noteError}
        onChange={(text) => dispatch({ type: "edit", text })}
        onSave={() => void save()}
        onReview={() => void reload()}
      />
      <p className="m-0 text-xs text-slate-500">
        Final invoice creation is unavailable from this summary. Suggested fees
        are reference figures only.
      </p>
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent className="rounded-[2px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report changed</DialogTitle>
            <DialogDescription>
              Another update was saved. Reload the latest report before saving
              again. Your unsaved note stays available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflictOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              disabled={busy || api.query.isFetching}
              onClick={() => void reload()}
            >
              {api.query.isFetching ? "Loading…" : "Reload latest report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FinancialWorkspace({ transportId }: { transportId: string }) {
  const [allowProvisional, setAllowProvisional] = useState(false);
  const [manualConsent, setManualConsent] = useState(false);
  const [dismissedError, setDismissedError] = useState<number | null>(null);
  const api = useFinancialReport(transportId, allowProvisional);
  const error = api.query.error ? financialError(api.query.error) : null;
  const unfinished = error?.code === "TRANSPORT_NOT_COMPLETED";
  const provisionalOpen =
    manualConsent ||
    (unfinished && dismissedError !== api.query.errorUpdatedAt);
  function setProvisionalOpen(open: boolean) {
    setManualConsent(open);
    if (!open) setDismissedError(api.query.errorUpdatedAt);
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <PageHeader
        title="Financial summary"
        backHref={
          REPORT_MOCK_MODE
            ? "/admin/reports/on-time-delivery"
            : `${ROLE_ROUTES.ongoingTransports}/${encodeURIComponent(transportId)}`
        }
        backLabel={
          REPORT_MOCK_MODE ? "Management reports" : "Transport details"
        }
      />
      <FinancialDemoNotice />
      {api.query.data ? (
        <LoadedReport report={api.query.data} api={api} />
      ) : api.query.isPending ? (
        <div
          aria-label="Loading financial report"
          role="status"
          className="space-y-4"
        >
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1200px]:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-56 w-full" />
        </div>
      ) : unfinished ? (
        <div className="space-y-3 rounded-[2px] border border-slate-200 bg-white p-4">
          <p className="m-0 text-sm text-slate-600">
            This transport is not completed. No provisional summary is loaded
            without your confirmation.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setProvisionalOpen(true)}
          >
            View provisional summary
          </Button>
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error.message} />
          {!isFinancialTerminal(error) ? (
            <Button
              type="button"
              variant="outline"
              disabled={api.query.isFetching}
              onClick={() => void api.query.refetch()}
            >
              Retry loading report
            </Button>
          ) : null}
        </div>
      ) : null}
      <Dialog open={provisionalOpen} onOpenChange={setProvisionalOpen}>
        <DialogContent className="rounded-[2px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>View provisional summary?</DialogTitle>
            <DialogDescription>
              This transport has not been completed. Financial figures may be
              incomplete. View provisional summary?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProvisionalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={api.query.isFetching}
              onClick={() => {
                setProvisionalOpen(false);
                setAllowProvisional(true);
              }}
            >
              View provisional summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function FinancialSummaryPage() {
  const { transportId } = useParams<{ transportId: string }>();
  const { allowed, scope } = useFinancialAccess();
  if (!allowed)
    return (
      <ErrorState message="You do not have permission to view financial reports." />
    );
  const parsed = transportIdSchema.safeParse(transportId);
  if (!parsed.success)
    return (
      <div className="p-6">
        <PageHeader
          title="Financial summary"
          backHref={ROLE_ROUTES.ongoingTransports}
          backLabel="Ongoing transports"
        />
        <ErrorState message="A valid transport ID is required. Open this page from the correct transport context." />
      </div>
    );
  return (
    <FinancialWorkspace
      key={`${scope}:${parsed.data.toLowerCase()}`}
      transportId={parsed.data}
    />
  );
}
