import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { VndText } from "@/shared/components/incident";
import { EMERGENCY_COST_CATEGORY_LABELS } from "@/shared/constants/incident";
import {
  createEmergencyCostDecisionFormSchema,
  createEmergencyCostDecisionSchema,
  emergencyCostCancelSchema,
  type EmergencyCostCancelInput,
  type EmergencyCostDecisionInput,
} from "../action-schemas";
import { emergencyCostFormSchema, type EmergencyCostDetail } from "../schemas";

interface DialogProps {
  open?: boolean;
  snapshot: EmergencyCostDetail;
  busy: boolean;
  blocked: boolean;
  feedback?: string;
  onClose: () => void;
  onReload?: () => void;
  refreshing?: boolean;
  verificationMessage?: string;
  onReview?: () => void;
}
const controlClass =
  "min-h-11 rounded-[2px] border-input bg-background text-sm shadow-none sm:min-h-9";

function ActionDialog({
  title,
  snapshot,
  busy,
  feedback,
  onClose,
  onReload,
  refreshing,
  open = true,
  verificationMessage,
  onReview,
  children,
}: DialogProps & { title: string; children: ReactNode }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-[2px] p-4 sm:p-5"
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl uppercase">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm [overflow-wrap:anywhere]">
            {snapshot.requestCode} ·{" "}
            {EMERGENCY_COST_CATEGORY_LABELS[snapshot.category]} · Requested{" "}
            <VndText amount={snapshot.requestedAmount} />
          </DialogDescription>
        </DialogHeader>
        {feedback ? (
          <p
            role="alert"
            className="m-0 rounded-[2px] border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {feedback}
          </p>
        ) : null}
        {onReload ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy || refreshing}
            onClick={onReload}
            className="min-h-11 justify-self-start rounded-[2px] sm:min-h-9"
          >
            Reload request details
          </Button>
        ) : null}
        {verificationMessage && (
          <p role="status" className="m-0 text-xs text-muted-foreground">
            {verificationMessage}
          </p>
        )}
        {onReview && (
          <Button
            type="button"
            variant="outline"
            disabled={busy || refreshing}
            onClick={onReview}
            className="min-h-11 whitespace-normal rounded-[2px]"
          >
            I reviewed the request — allow a new attempt
          </Button>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function CancelCostDialog(
  props: DialogProps & {
    onSubmit: (input: EmergencyCostCancelInput) => Promise<void>;
  },
) {
  const form = useForm<z.input<typeof emergencyCostCancelSchema>>({
    resolver: zodResolver(emergencyCostCancelSchema),
    mode: "onChange",
    defaultValues: {
      lastUpdatedAt: props.snapshot.updatedAt,
      cancellationReason: "",
    },
  });
  const busy = props.busy || form.formState.isSubmitting;
  return (
    <Form {...form}>
      <ActionDialog
        {...props}
        busy={busy}
        title="Cancel emergency cost request"
      >
        <form
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((values) =>
              props.onSubmit({
                ...values,
                lastUpdatedAt: props.snapshot.updatedAt,
              }),
            )(event)
          }
          className="min-w-0 space-y-3"
        >
          <fieldset
            disabled={busy || props.blocked}
            className="m-0 min-w-0 border-0 p-0"
          >
            <FormField
              control={form.control}
              name="cancellationReason"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel>Cancellation reason *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className={controlClass}
                      placeholder="Explain why this cost is no longer needed"
                    />
                  </FormControl>
                  <div className="min-h-5">
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
          </fieldset>
          <p className="m-0 text-xs text-muted-foreground">
            This action cannot be undone. No payment or invoice is created.
          </p>
          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={props.onClose}
              className="min-h-11 rounded-[2px] sm:min-h-9"
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={busy || props.blocked || !form.formState.isValid}
              className="min-h-11 rounded-[2px] sm:min-h-9"
            >
              {busy ? "Cancelling..." : "Cancel request"}
            </Button>
          </DialogFooter>
        </form>
      </ActionDialog>
    </Form>
  );
}

export function DecisionCostDialog(
  props: DialogProps & {
    onSubmit: (input: EmergencyCostDecisionInput) => Promise<void>;
  },
) {
  const schema = createEmergencyCostDecisionFormSchema(props.snapshot);
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      decision: "APPROVE",
      approvedAmount: props.snapshot.requestedAmount.toLocaleString("en-US"),
      decisionReason: "",
    },
  });
  const decision = useWatch({ control: form.control, name: "decision" });
  const busy = props.busy || form.formState.isSubmitting;
  const submit = form.handleSubmit(async (values) => {
    const body = createEmergencyCostDecisionSchema(
      props.snapshot.requestedAmount,
    ).parse({
      lastUpdatedAt: props.snapshot.updatedAt,
      decision: values.decision,
      decisionReason: values.decisionReason.trim() || undefined,
      ...(values.decision === "APPROVE"
        ? {
            approvedAmount: emergencyCostFormSchema.shape.requestedAmount.parse(
              values.approvedAmount,
            ),
          }
        : {}),
    });
    await props.onSubmit(body);
  });
  return (
    <Form {...form}>
      <ActionDialog
        {...props}
        busy={busy}
        title="Review emergency cost request"
      >
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="min-w-0 space-y-3"
        >
          <fieldset
            disabled={busy || props.blocked}
            className="m-0 min-w-0 space-y-3 border-0 p-0"
          >
            <FormField
              control={form.control}
              name="decision"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel>Decision *</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      void form.trigger();
                    }}
                    disabled={busy || props.blocked}
                  >
                    <FormControl>
                      <SelectTrigger className={`${controlClass} w-full`}>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="APPROVE">Approve</SelectItem>
                      <SelectItem value="REJECT">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="min-h-5">
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
            {decision === "APPROVE" ? (
              <FormField
                control={form.control}
                name="approvedAmount"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel>Approved amount (VND) *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        className={`${controlClass} tabular-nums`}
                        onBlur={() => {
                          field.onBlur();
                          const parsed =
                            emergencyCostFormSchema.shape.requestedAmount.safeParse(
                              field.value,
                            );
                          if (parsed.success)
                            form.setValue(
                              "approvedAmount",
                              parsed.data.toLocaleString("en-US"),
                              { shouldValidate: true },
                            );
                        }}
                      />
                    </FormControl>
                    <div className="min-h-5">
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="decisionReason"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel>
                    Decision reason{" "}
                    {decision === "REJECT"
                      ? "*"
                      : "(required for a reduced approval)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className={controlClass} />
                  </FormControl>
                  <div className="min-h-5">
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
          </fieldset>
          <p className="m-0 text-xs text-muted-foreground">
            The server checks the request version before saving. A decision does
            not perform payment or settlement.
          </p>
          <DialogFooter className="gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={props.onClose}
              className="min-h-11 rounded-[2px] sm:min-h-9"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={busy || props.blocked || !form.formState.isValid}
              className="min-h-11 rounded-[2px] sm:min-h-9"
            >
              {busy ? "Saving..." : "Submit decision"}
            </Button>
          </DialogFooter>
        </form>
      </ActionDialog>
    </Form>
  );
}
