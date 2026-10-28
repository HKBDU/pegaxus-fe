import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { transportPlanDetail } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { useFormRequestAttemptGuard } from "@/shared/hooks/useFormRequestAttemptGuard";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { TimePicker } from "@/shared/components/ui/time-picker";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  useCreateTransportPlan,
  useUpdateTransportPlan,
} from "../hooks/useTransportPlans";
import { getApiErrorInfo } from "../services";
import {
  getTransportPlanError,
  isTransportPlanConcurrencyCode,
  isTransportPlanLockedCode,
  isTransportPlanDuplicateCode,
} from "../services";
import {
  buildCreatePlanInput,
  buildUpdatePlanInput,
  canEditTransportPlan,
  planToForm,
} from "../transport-plan.form";
import {
  transportPlanFormSchema,
  editTransportPlanFormSchema,
} from "../schemas";
import { emptyPlanForm } from "../constants";
import type { TransportPlanDetail, TransportPlanFormValues } from "../types";
import { validateTransportPlanSchedule } from "../schedule-validation";
import { Section } from "./ApprovedBookingDetails";
import { Flow3MockIndicator } from "./Flow3MockIndicator";
import { TransportPlanLocationSelect } from "./TransportPlanLocationSelect";

const controlClass =
  "h-9 rounded-[2px] border-slate-300 bg-white text-sm shadow-none focus-visible:border-primary focus-visible:ring-primary/20 motion-reduce:transition-none";
const fields = [
  { name: "plannedStartAt", label: "Planned Start", type: "date-time" },
  { name: "plannedEndAt", label: "Planned End", type: "date-time" },
  {
    name: "estimatedDistanceKm",
    label: "Estimated Distance (km)",
    type: "number",
  },
  {
    name: "estimatedDurationMinutes",
    label: "Estimated Duration (minutes)",
    type: "number",
  },
] as const;

export function TransportPlanMetadataForm({
  bookingId,
  requestedArrivalDate,
  plan,
  cancelHref,
  reloadLatest,
  onDuplicate,
  onCancel,
  onCreated,
}: {
  bookingId: string;
  requestedArrivalDate?: string | null;
  plan?: TransportPlanDetail;
  cancelHref: string;
  reloadLatest?: () => Promise<TransportPlanDetail | undefined>;
  onDuplicate?: () => Promise<unknown>;
  onCancel?: () => void;
  onCreated?: (plan: TransportPlanDetail) => void;
}) {
  const navigate = useNavigate();
  const scheduleId = useId();
  const principal = useAuthStore((state) => state.principal);
  // Background TP3 refreshes must never silently replace the version the manager edited.
  const [baseline, setBaseline] = useState(plan);
  const [problem, setProblem] = useState<{
    code?: string | null;
    message: string;
  } | null>(null);
  const [reloading, setReloading] = useState(false);
  const form = useForm<TransportPlanFormValues>({
    resolver: zodResolver(
      plan ? editTransportPlanFormSchema : transportPlanFormSchema,
    ),
    mode: "onTouched",
    defaultValues: plan ? planToForm(plan) : emptyPlanForm,
  });
  const attempt = useFormRequestAttemptGuard(form);
  const create = useCreateTransportPlan(bookingId);
  const update = useUpdateTransportPlan(plan?.transportPlanId ?? "");
  const isPending =
    create.isPending ||
    update.isPending ||
    attempt.isRunning ||
    form.formState.isSubmitting ||
    reloading;
  const canWrite = baseline
    ? canEditTransportPlan(principal, baseline) &&
      canEditTransportPlan(principal, plan ?? baseline)
    : canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] });
  const blocked =
    !canWrite ||
    isTransportPlanConcurrencyCode(problem?.code) ||
    isTransportPlanLockedCode(problem?.code);
  const submit = form.handleSubmit(async (values) => {
    if (blocked) return;
    setProblem(null);
    if (!baseline) {
      const scheduleError = validateTransportPlanSchedule({
        plannedStartAt: values.plannedStartAt,
        plannedEndAt: values.plannedEndAt,
        estimatedDurationMinutes: values.estimatedDurationMinutes.trim()
          ? Number(values.estimatedDurationMinutes)
          : null,
        requestedArrivalDate,
      });
      if (scheduleError) {
        form.setError(scheduleError.field, {
          type: "validate",
          message: scheduleError.message,
        });
        setProblem({ message: "Check the highlighted schedule fields and try again." });
        return;
      }
    }
    try {
      let result;
      if (baseline) {
        const input = buildUpdatePlanInput(values, baseline);
        if (Object.keys(input).length === 1) {
          toast.info("No metadata changes to save.");
          return;
        }
        result = await attempt.run(() => update.mutateAsync(input));
      } else {
        const input = buildCreatePlanInput(values);
        result = await attempt.run(() => create.mutateAsync(input));
      }
      if (!result.started) return;
      toast.success(
        baseline
          ? "Transport plan updated successfully."
          : "Transport plan created successfully.",
      );
      if (!baseline) onCreated?.(result.value);
      navigate(transportPlanDetail(result.value.transportPlanId), {
        replace: true,
      });
    } catch (error) {
      const info = getApiErrorInfo(error);
      const errors =
        error instanceof z.ZodError
          ? error.issues.map((issue) => ({
              field: String(issue.path[0]),
              message: issue.message,
            }))
          : info.errors;
      for (const item of errors) {
        const name = item.field.replace(/^./, (letter) => letter.toLowerCase());
        if (Object.hasOwn(emptyPlanForm, name))
          form.setError(name as keyof TransportPlanFormValues, {
            type: "server",
            message: item.message,
          });
      }
      setProblem({
        code: info.code,
        message:
          error instanceof z.ZodError
            ? "Check the highlighted fields and try again."
            : getTransportPlanError(error).message,
      });
      if (isTransportPlanDuplicateCode(info.code)) {
        try {
          await onDuplicate?.();
        } catch {
          /* Keep the original mutation error visible if the refresh fails. */
        }
      }
    }
  });
  const reload = async () => {
    if (!reloadLatest || isPending) return;
    setReloading(true);
    try {
      const latest = await reloadLatest();
      if (!latest) throw new Error("No transport plan returned");
      setBaseline(latest);
      form.reset(planToForm(latest));
      setProblem(null);
      attempt.reset();
    } catch (error) {
      setProblem({
        code: "TRANSPORT_PLAN_MODIFIED",
        message: getTransportPlanError(error).message,
      });
    } finally {
      setReloading(false);
    }
  };
  return (
    <Form {...form}>
      <form noValidate onSubmit={submit} className="space-y-3">
        <Flow3MockIndicator />
        <Section title="Transport Plan Metadata">
          <p className="text-xs text-slate-500">
            Dates use your local time zone and are submitted in UTC. Leave
            optional numeric fields blank to omit them
            {baseline ? " and retain existing values" : ""}.
          </p>
          <fieldset
            disabled={isPending || !canWrite}
            className="grid items-start gap-3 sm:grid-cols-2"
          >
            {(["origin", "destination"] as const).map((side) => (
              <FormField
                key={side}
                control={form.control}
                name={`${side}LocationId`}
                render={({ field, fieldState }) => (
                  <FormItem className="min-w-0 content-start gap-1.5">
                    <FormLabel
                      htmlFor={`${scheduleId}-${side}-location`}
                      className="text-xs"
                    >
                      {side === "origin"
                        ? "Origin Location"
                        : "Destination Location"}{" "}
                      (optional)
                    </FormLabel>
                    <TransportPlanLocationSelect
                      value={field.value}
                      current={baseline?.[`${side}Location`]}
                      disabled={isPending || blocked}
                      editing={Boolean(baseline)}
                      label={`${side === "origin" ? "Origin" : "Destination"} Location`}
                      id={`${scheduleId}-${side}-location`}
                      invalid={fieldState.invalid}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                    <p
                      id={`${scheduleId}-${side}-location-hint`}
                      className="text-xs text-slate-500"
                    >
                      {baseline
                        ? "An empty selection retains the saved location; it does not remove it."
                        : "Leave empty for the backend to resolve the booking coordinates. Older bookings may have no location."}
                    </p>
                    <div className="min-h-5">
                      {fieldState.error && (
                        <p
                          id={`${scheduleId}-${side}-location-error`}
                          role="alert"
                          className="text-xs text-destructive"
                        >
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            ))}
            {[
              { title: "Schedule", items: fields.slice(0, 2) },
              { title: "Operational estimates", items: fields.slice(2) },
            ].map(({ title, items }) => (
              <div key={title} className="space-y-2 sm:col-span-2">
                {title === "Operational estimates" && (
                  <h3 className="font-heading text-sm uppercase tracking-wide text-slate-800">
                    {title}
                  </h3>
                )}
                <div className="grid items-start gap-x-4 gap-y-2 sm:grid-cols-2">
                  {items.map(({ name, label, type }) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => {
                        const [date = "", time = ""] = field.value.split("T");
                        const seconds = time.split(":")[2];
                        const changeDate = (value: string) => {
                          if (isPending || !canWrite) return;
                          field.onChange(
                            value ? `${value}T${time || "00:00"}` : "",
                          );
                          field.onBlur();
                        };
                        const changeTime = (value: string) => {
                          if (isPending || !canWrite) return;
                          // Keep the local date and existing seconds/milliseconds; UTC conversion stays in the submit mapping.
                          field.onChange(
                            value
                              ? `${date}T${value}${seconds === undefined ? "" : `:${seconds}`}`
                              : date
                                ? `${date}T`
                                : "",
                          );
                          field.onBlur();
                        };
                        return (
                          <FormItem className="@container min-w-0 content-start gap-1.5">
                            <FormLabel className="text-xs leading-4 font-medium text-slate-700">
                              {label}
                              {type === "date-time" && !baseline ? " *" : ""}
                            </FormLabel>
                            {type === "date-time" ? (
                              <div className="grid min-w-0 gap-2 @min-[20rem]:grid-cols-[minmax(0,1fr)_9rem]">
                                <FormControl>
                                  <DatePicker
                                    ref={field.ref}
                                    value={date}
                                    onChange={changeDate}
                                    onBlur={field.onBlur}
                                    disabled={isPending || !canWrite}
                                    placeholder="DD / MM / YYYY"
                                    className={controlClass}
                                  />
                                </FormControl>
                                <FormControl id={`${scheduleId}-${name}-time`}>
                                  <TimePicker
                                    value={time.slice(0, 5)}
                                    onChange={changeTime}
                                    onBlur={field.onBlur}
                                    disabled={isPending || !canWrite}
                                    label={`${label} time`}
                                    labelClassName="sr-only"
                                    className={controlClass}
                                  />
                                </FormControl>
                              </div>
                            ) : (
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step={
                                    name === "estimatedDurationMinutes"
                                      ? "1"
                                      : "any"
                                  }
                                  min="0"
                                  placeholder={
                                    name === "estimatedDurationMinutes"
                                      ? undefined
                                      : "1,000.01"
                                  }
                                  className={controlClass}
                                />
                              </FormControl>
                            )}
                            <div className="min-h-5">
                              <FormMessage
                                role="alert"
                                className="text-xs leading-5"
                              />
                            </div>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <FormField
              control={form.control}
              name="planningNote"
              render={({ field }) => (
                <FormItem className="min-w-0 content-start gap-1.5 sm:col-span-2">
                  <FormLabel className="text-xs leading-4 font-medium text-slate-700">
                    Planning Note
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-20 rounded-[2px] border-slate-300 text-sm shadow-none motion-reduce:transition-none"
                    />
                  </FormControl>
                  <div className="min-h-5">
                    <FormMessage role="alert" className="text-xs leading-5" />
                  </div>
                </FormItem>
              )}
            />
            {baseline ? (
              <FormField
                control={form.control}
                name="updateReason"
                render={({ field }) => (
                  <FormItem className="min-w-0 content-start gap-1.5 sm:col-span-2">
                    <FormLabel className="text-xs leading-4 font-medium text-slate-700">
                      Update Reason
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className={controlClass} />
                    </FormControl>
                    <div className="min-h-5">
                      <FormMessage role="alert" className="text-xs leading-5" />
                    </div>
                  </FormItem>
                )}
              />
            ) : null}
          </fieldset>
        </Section>
        {problem ? (
          <div
            role="alert"
            className="space-y-3 rounded-[2px] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{problem.message}</p>
            {isTransportPlanConcurrencyCode(problem.code) && reloadLatest ? (
              <>
                <p className="text-xs">
                  Reloading replaces your unsaved changes with the latest server
                  data.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[2px]"
                  disabled={isPending}
                  onClick={() => void reload()}
                >
                  Reload Latest Data
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            className="rounded-[2px] bg-white transition-colors duration-200 motion-reduce:transition-none"
            onClick={() => (onCancel ? onCancel() : navigate(cancelHref))}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isPending ||
              blocked ||
              attempt.isBlocked ||
              (Boolean(baseline) && !form.formState.isDirty)
            }
            className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none"
          >
            {isPending
              ? "Saving..."
              : baseline
                ? "Save Changes"
                : "Save Transport Plan"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
