import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, ShieldCheck, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/shared/components/ui/alert-dialog";
import { Section } from "@/features/transport-plan/components/ApprovedBookingDetails";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";
import {
  useEmergencyMutation,
  type EmergencyContext,
} from "../../hooks/useEmergencyRoute";
import { useRoutePlanDetail } from "../../hooks/useRoutePlanDetail";
import { getRouteViewError } from "../../services";
import type { RoutePlanDetail } from "../../types";
import { isRelatedPrimary } from "../../route-comparison";
import { RouteChangeComparison } from "./RouteChangeComparison";
import { EmergencyFeedback } from "./EmergencyFeedback";
import { REJECTED_BY_MANAGER } from "@/shared/constants/route-plan-status";

const rejectionSchema = z.object({
  note: z
    .string()
    .max(4000)
    .trim()
    .min(10, "Explain the rejection in at least 10 characters."),
});

export function RouteChangeDecisionPanel({
  plan,
  context,
  onBack,
}: {
  plan: RoutePlanDetail;
  context: EmergencyContext;
  onBack: () => void;
}) {
  const [baseline, setBaseline] = useState(plan.updatedAt);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(rejectionSchema),
    mode: "onTouched",
    defaultValues: { note: "" },
  });
  const attempt = useFormRequestAttemptGuard(form);
  const mutation = useEmergencyMutation("decision", plan, context);
  const primary = useRoutePlanDetail(
    context.primaryRoute?.routePlanId ?? "",
    Boolean(context.primaryRoute),
  );
  const comparisonError = primary.isError
    ? getRouteViewError(primary.error).message
    : primary.data && !isRelatedPrimary(primary.data, plan)
      ? "The PRIMARY route response does not belong to this transport plan and booking."
      : undefined;
  const primaryPlan = !comparisonError ? primary.data : undefined;
  const isReturn = plan.routeType === "RETURN";
  const rejectLabel = isReturn
    ? "Không Duyệt RETURN & Chỉ Đạo Chờ Đợi"
    : "Reject Change";
  const busy = attempt.isRunning || mutation.isPending;
  const versionChanged = baseline !== plan.updatedAt && !mutation.data;
  const locked =
    busy ||
    attempt.isBlocked ||
    versionChanged ||
    Boolean(mutation.data) ||
    !primaryPlan;
  const canApprove =
    !isReturn || context.workspace.dossierStatus === "APPROVED";
  const reviewLatest = () => {
    setBaseline(plan.updatedAt);
    mutation.reset();
    attempt.reset();
  };
  async function submit(decision: "APPROVE" | "REJECT", note?: string) {
    if (locked || (decision === "APPROVE" && !canApprove)) return;
    try {
      const result = await attempt.run(() =>
        mutation.mutateAsync({ lastUpdatedAt: baseline, decision, note }),
      );
      if (!result.started) return;
      setApproveOpen(false);
      setRejectOpen(false);
      const outcome = result.value;
      toast.success(
        `Route change ${outcome.decision.toLowerCase()}d. Route status: ${outcome.status === REJECTED_BY_MANAGER ? "LM đã từ chối" : outcome.status}.${outcome.complianceDossier ? ` Dossier: ${outcome.complianceDossier.status}.` : ""}`,
      );
      if (isReturn && outcome.decision === "REJECT")
        toast.info(
          outcome.status === "CANCELLED"
            ? "Backend trả CANCELLED (legacy). Chưa xác nhận đã gửi LM Note cho Driver và Escort."
            : "Quyết định đã được lưu. Việc gửi LM Note cho tổ lái do Backend xử lý; FE không có xác nhận giao thông báo.",
        );
      onBack();
    } catch {
      setApproveOpen(false);
      setRejectOpen(false);
    }
  }
  return (
    <section aria-label="Emergency route change decision" className="space-y-3">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onBack}
          className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none -ml-3 text-slate-600"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to Route Plan
        </Button>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Emergency Operations · Logistics Manager
          </p>
          <h1
            tabIndex={-1}
            className="m-0! font-heading text-2xl! leading-7! uppercase text-slate-900 outline-none"
          >
            Review Route Change
          </h1>
          <p className="text-sm text-slate-500">
            Compare the current journey with {plan.routePlanCode} before making
            a decision.
          </p>
        </div>
      </div>
      <RouteChangeComparison
        primary={primaryPlan}
        proposed={plan}
        loading={Boolean(context.primaryRoute) && primary.isPending}
        error={comparisonError}
      />
      <Section title="Change Details" icon={FileText}>
        <p className="text-sm leading-6 text-slate-600">
          {isReturn
            ? plan.routeNote || "Return reason is not available."
            : "Check the request notification for the reason, revised arrival time and estimated extra cost. These details are not included in the route summary."}
        </p>
        <p className="text-xs text-slate-500">
          Transport: {context.transportCode} · Booking: {plan.bookingCode}
        </p>
        {isReturn && (
          <p className="text-xs text-slate-500">
            Compliance dossier:{" "}
            {context.workspace.dossierStatus?.replaceAll("_", " ") ??
              "Not available"}
            .
          </p>
        )}
        <p className="text-xs leading-5 text-slate-500">
          {isReturn
            ? "Approval creates an EXTRA dossier in DRAFT for the Transport Specialist. MAIN remains APPROVED. RETURN is not activated; legal confirmation and EXTRA approval are still required."
            : "Approval activates this backup for its replacement segments. The primary route remains active for the rest of the journey."}
        </p>
      </Section>
      <Section
        title="Decision"
        icon={ShieldCheck}
        className="border-primary/20"
      >
        <p className="text-sm leading-6 text-slate-600">
          {isReturn
            ? "Approve return for legal preparation, or reject with an operational instruction to hold and wait. The backend determines the recorded status."
            : "Approve activation, or reject without cancelling the prepared backup."}
        </p>
        {!canApprove && (
          <p className="text-xs text-destructive">
            RETURN approval requires an APPROVED dossier.
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={locked}
            onClick={() => setRejectOpen(true)}
            className="min-h-9 h-auto whitespace-normal rounded-[2px] py-2 transition-colors duration-200 motion-reduce:transition-none border-red-200 text-destructive hover:bg-red-50 hover:text-destructive"
          >
            <X aria-hidden="true" className="size-4" />
            {rejectLabel}
          </Button>
          <Button
            disabled={locked || !canApprove}
            onClick={() => setApproveOpen(true)}
            className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none h-9"
          >
            <Check aria-hidden="true" className="size-4" />
            {isReturn ? "Approve Return" : "Approve Change"}
          </Button>
        </div>
      </Section>
      {mutation.data && (
        <div
          role="status"
          className="rounded-[2px] border border-emerald-200 bg-emerald-50 p-4 text-sm"
        >
          Decision: {mutation.data.decision} · Route status:{" "}
          {mutation.data.status === REJECTED_BY_MANAGER
            ? "LM đã từ chối"
            : mutation.data.status}
          {mutation.data.complianceDossier
            ? ` · Dossier: ${mutation.data.complianceDossier.status}`
            : ""}
          .
          {isReturn && mutation.data.decision === "APPROVE"
            ? " Await TS document preparation and RP7 legal confirmation. The route is not activated."
            : ""}
        </div>
      )}
      {versionChanged && !mutation.error && (
        <div
          role="alert"
          className="space-y-2 rounded-[2px] border bg-muted p-3 text-sm"
        >
          <p>
            A newer route version is available. Review the comparison before
            confirming another decision. Your rejection note is retained.
          </p>
          <Button
            className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
            variant="outline"
            onClick={reviewLatest}
          >
            Use Reviewed Version
          </Button>
        </div>
      )}
      <EmergencyFeedback
        key={mutation.submittedAt}
        error={mutation.error}
        latestUpdatedAt={plan.updatedAt}
        onReviewLatest={reviewLatest}
      />
      <AlertDialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (!busy) setApproveOpen(open);
        }}
      >
        <AlertDialogContent className="flow3-ui motion-reduce:animate-none motion-reduce:transition-none rounded-[2px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isReturn
                ? "Approve Emergency Return?"
                : "Activate Prepared Backup?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isReturn
                ? "Create a new EXTRA dossier in DRAFT; MAIN stays APPROVED. RETURN remains DRAFT until RP7 legal review, then awaits approved EXTRA documents and a separate EC3 activation."
                : "BACKUP becomes ACTIVE. Only the indicated PRIMARY segments are replaced; the backend sends the required notifications."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
              disabled={busy}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
              disabled={locked || !canApprove}
              onClick={() => void submit("APPROVE")}
            >
              {busy
                ? "Approving…"
                : isReturn
                  ? "Approve Return"
                  : "Approve Change"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!busy) setRejectOpen(open);
        }}
      >
        <DialogContent
          showCloseButton={!busy}
          className="flow3-ui motion-reduce:animate-none motion-reduce:transition-none max-h-[90svh] overflow-y-auto rounded-[2px]"
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="m-0! font-heading text-xl! leading-6!">
              {isReturn ? rejectLabel : "Reject Route Change"}
            </DialogTitle>
            <DialogDescription>
              {isReturn
                ? "LM Note là chỉ đạo trực tiếp cho Driver và Escort theo D6. Backend legacy có thể vẫn trả CANCELLED và chưa gửi chỉ đạo; không xác nhận thông báo đã được giao."
                : "BACKUP remains CONFIRMED."}{" "}
              Explain why this proposal cannot be accepted.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit((values) =>
                submit("REJECT", values.note),
              )}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="min-w-0 content-start gap-1.5">
                    <FormLabel className="leading-4">
                      {isReturn
                        ? "LM Note (gửi thẳng cho Driver và Escort) *"
                        : "Rejection Reason *"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={busy}
                        className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none min-h-28"
                      />
                    </FormControl>
                    <div className="min-h-5">
                      <FormMessage role="alert" className="text-xs leading-5" />
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRejectOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-auto min-h-9 whitespace-normal rounded-[2px] py-2 transition-colors duration-200 motion-reduce:transition-none"
                  type="submit"
                  variant="destructive"
                  disabled={locked}
                >
                  {busy ? "Rejecting…" : rejectLabel}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
