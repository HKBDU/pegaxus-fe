import { useEffect, useMemo, useRef } from "react";
import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import { toUtcIso } from "@/shared/utils/datetime";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { LoaderCircle, Send } from "lucide-react";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { MoneyInput } from "@/shared/components/ui/money-input";
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
  backupRequestDefaults,
  backupRequestFormSchema,
  buildBackupRequest,
  type BackupRequestValues,
} from "../../emergency-form";
import {
  useEmergencyMutation,
  type EmergencyContext,
} from "../../hooks/useEmergencyRoute";
import { useBackupRequestDraft } from "../../hooks/useBackupRequestDraft";
import { useRoutePlanDetail } from "../../hooks/useRoutePlanDetail";
import {
  BACKUP_DELAY_THRESHOLD_MINUTES,
  delayMinutes,
  formatDelay,
  suggestBackupArrival,
  toLocalInputValue,
  type BackupEtaSuggestion,
} from "../../backup-eta";
import { isRelatedPrimary } from "../../route-comparison";
import { getEmergencyError } from "../../services";
import type { RoutePlanDetail } from "../../types";
import { EmergencyChangeSummary } from "./EmergencyChangeSummary";
import { EmergencyFeedback } from "./EmergencyFeedback";

const controls = [
  {
    name: "reason",
    label: "Reason for Change",
    required: true,
    type: "textarea",
  },
  {
    name: "newEstimatedArrivalAt",
    label: "New Estimated Arrival",
    required: true,
    type: "datetime-local",
  },
  {
    name: "estimatedExtraCost",
    label: "Estimated Extra Cost (VND)",
    type: "money",
  },
  { name: "note", label: "Additional Note", type: "textarea" },
] as const;

export function BackupActivationRequestDialog({
  plan,
  context,
  onClose,
}: {
  plan: RoutePlanDetail;
  context: EmergencyContext;
  onClose: () => void;
}) {
  const draft = useBackupRequestDraft(plan.routePlanId);
  const form = useForm<BackupRequestValues>({
    resolver: zodResolver(backupRequestFormSchema),
    mode: "onTouched",
    defaultValues: draft.initial ?? backupRequestDefaults,
  });
  const { save: saveDraft } = draft;
  useEffect(() => {
    const subscription = form.watch(() => saveDraft(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, saveDraft]);

  const primary = useRoutePlanDetail(
    context.primaryRoute?.routePlanId ?? "",
    Boolean(context.primaryRoute),
  );
  const primaryPlan =
    primary.data && isRelatedPrimary(primary.data, plan)
      ? primary.data
      : undefined;
  const suggestion = useMemo(
    () => (primaryPlan ? suggestBackupArrival(primaryPlan, plan) : null),
    [primaryPlan, plan],
  );
  const suggestedValue = suggestion
    ? toLocalInputValue(suggestion.suggestedEta)
    : "";
  // Prefill once, and only when the RC has not typed an arrival yet (a saved draft wins).
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !suggestedValue) return;
    prefilled.current = true;
    if (!form.getValues("newEstimatedArrivalAt"))
      form.setValue("newEstimatedArrivalAt", suggestedValue, {
        shouldDirty: true,
      });
  }, [form, suggestedValue]);
  const arrival = useWatch({ control: form.control, name: "newEstimatedArrivalAt" });
  const delay =
    suggestion && arrival ? delayMinutes(arrival, suggestion.primaryEta) : null;

  const attempt = useFormRequestAttemptGuard(form);
  const mutation = useEmergencyMutation("request", plan, context);
  const busy =
    mutation.isPending || attempt.isRunning || form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    try {
      const result = await attempt.run(() =>
        mutation.mutateAsync(buildBackupRequest(values)),
      );
      if (!result.started) return;
      draft.clear();
      toast.success(
        "Request sent to Logistics Manager. Backup remains CONFIRMED until approved.",
      );
      onClose();
    } catch (error) {
      const fields =
        error instanceof z.ZodError
          ? error.issues.map((issue) => ({
              field: String(issue.path[0]),
              message: issue.message,
            }))
          : getEmergencyError(error).errors;
      for (const field of fields) {
        const name = field.field.replace(/^./, (letter) =>
          letter.toLowerCase(),
        );
        if (name in backupRequestDefaults)
          form.setError(name as keyof BackupRequestValues, {
            message: field.message,
          });
      }
    }
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="flow3-ui motion-reduce:animate-none motion-reduce:transition-none flex max-h-[90svh] flex-col gap-0 overflow-hidden rounded-[2px] border-slate-200 bg-white p-0 shadow-md sm:max-w-xl"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document
            .getElementById(`emergency-request-${plan.routePlanId}`)
            ?.focus();
        }}
      >
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-3 pr-12 text-left">
          <DialogTitle className="m-0! flex items-center gap-2 font-heading text-xl! leading-6! uppercase text-slate-900">
            <Send aria-hidden="true" className="size-4 shrink-0 text-primary" />
            Request Backup Activation
          </DialogTitle>
          <DialogDescription>
            Send this prepared backup to Logistics Manager for approval.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form noValidate onSubmit={submit} className="flex min-h-0 flex-col">
            <div className="min-h-0 space-y-3 overflow-y-auto px-4 py-3">
              <EmergencyChangeSummary
                plan={plan}
                title="Selected Backup"
                compact
              />
              <fieldset
                disabled={busy}
                className="grid items-start gap-x-4 gap-y-2 sm:grid-cols-2"
              >
                {controls.map((control) => (
                  <FormField
                    key={control.name}
                    control={form.control}
                    name={control.name}
                    render={({ field }) => (
                      <FormItem
                        className={`min-w-0 content-start gap-1.5 ${control.type === "textarea" || control.name === "newEstimatedArrivalAt" ? "sm:col-span-2" : ""}`}
                      >
                        <FormLabel className="leading-4">
                          {control.label}
                          {"required" in control && control.required
                            ? " *"
                            : ""}
                        </FormLabel>
                        <FormControl>
                          {control.type === "textarea" ? (
                            <Textarea
                              {...field}
                              className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none min-h-20"
                            />
                          ) : control.type === "money" ? (
                            <MoneyInput
                              {...field}
                              placeholder="Whole amount, e.g. 1,500,000"
                              className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
                            />
                          ) : (
                            <Input
                              {...field}
                              type={control.type}
                              step="any"
                              className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
                            />
                          )}
                        </FormControl>
                        {control.type === "datetime-local" && toUtcIso(field.value) && (
                          <p className="text-xs text-slate-500" aria-live="polite">
                            UTC preview: <DateTimeUtc value={toUtcIso(field.value)} compact />
                          </p>
                        )}
                        {control.name === "newEstimatedArrivalAt" && (
                          <ArrivalHint
                            loading={Boolean(context.primaryRoute) && primary.isPending}
                            suggestion={suggestion}
                            delay={delay}
                            onUseSuggestion={
                              suggestedValue && field.value !== suggestedValue
                                ? () =>
                                    form.setValue(
                                      "newEstimatedArrivalAt",
                                      suggestedValue,
                                      { shouldDirty: true, shouldValidate: true },
                                    )
                                : undefined
                            }
                          />
                        )}
                        <div className="min-h-5">
                          <FormMessage
                            role="alert"
                            className="text-xs leading-5"
                          />
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </fieldset>
              <p className="text-xs leading-5 text-slate-500">
                The route stays confirmed until approval. Extra cost is an
                estimate, not a charge. Enter the new arrival time in your local
                time zone.
              </p>
              <EmergencyFeedback
                error={mutation.error}
                latestUpdatedAt={plan.updatedAt}
              />
            </div>
            <DialogFooter className="shrink-0 border-t bg-slate-50 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
                disabled={busy || attempt.isBlocked}
              >
                {busy ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Send aria-hidden="true" className="size-4" />
                )}
                {busy ? "Sending…" : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ArrivalHint({
  loading,
  suggestion,
  delay,
  onUseSuggestion,
}: {
  loading: boolean;
  suggestion: BackupEtaSuggestion | null;
  delay: number | null;
  onUseSuggestion?: () => void;
}) {
  if (loading)
    return (
      <p className="text-xs text-slate-500" aria-live="polite">
        Checking the PRIMARY arrival…
      </p>
    );
  if (!suggestion) return null;
  const overThreshold =
    delay !== null && delay >= BACKUP_DELAY_THRESHOLD_MINUTES;
  return (
    <div
      className="space-y-1 rounded-[2px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"
      aria-live="polite"
    >
      <p>
        PRIMARY arrival:{" "}
        <DateTimeUtc
          value={suggestion.primaryEta.toISOString()}
          compact
          className="font-semibold text-slate-800"
        />
      </p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          Suggested:{" "}
          <DateTimeUtc
            value={suggestion.suggestedEta.toISOString()}
            compact
            className="font-semibold text-slate-800"
          />{" "}
          ({suggestion.mode === "AHEAD" ? "drive on to" : "turn back to"}{" "}
          {suggestion.branchName}, then follow the backup)
        </span>
        {onUseSuggestion && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={onUseSuggestion}
          >
            Use suggestion
          </Button>
        )}
      </p>
      {delay !== null && (
        <p className={overThreshold ? "text-amber-700" : "text-slate-600"}>
          <span className="font-semibold">{formatDelay(delay)}</span> against
          the PRIMARY arrival.{" "}
          {overThreshold
            ? "Over 1h, so the Logistics Manager must approve it."
            : "Under 1h: the request is accepted only if the backup changes a BCP, adds a 24h rest or detours by 50 km or more."}
        </p>
      )}
    </div>
  );
}
