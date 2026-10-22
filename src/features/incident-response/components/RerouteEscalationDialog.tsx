import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ChevronDown, Send } from "lucide-react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";
import {
  rerouteEscalationFormSchema,
  parseRerouteEscalationForm,
  type RerouteContext,
  type RerouteEscalationRequest,
} from "../reroute-schemas";
import { getRerouteBlockedPlans } from "../reroute-services";

const controlClass =
  "min-h-11 rounded-[2px] border-input bg-background text-base shadow-none sm:min-h-9 sm:text-sm";

export function RerouteEscalationDialog({
  context,
  busy,
  blocked,
  feedback,
  onClose,
  onSubmit,
}: {
  context: RerouteContext;
  busy: boolean;
  blocked: boolean;
  feedback?: string;
  onClose: () => void;
  onSubmit: (request: RerouteEscalationRequest) => Promise<void>;
}) {
  const prefix = useId();
  const form = useForm<z.input<typeof rerouteEscalationFormSchema>>({
    resolver: zodResolver(rerouteEscalationFormSchema),
    mode: "onChange",
    defaultValues: {
      reason: "",
      suggestedAction: "NONE",
      suggestedHoldMinutes: "",
      blockedRoutePlanIds: [],
    },
  });
  const suggestion = useWatch({
    control: form.control,
    name: "suggestedAction",
  });
  const reason = useWatch({ control: form.control, name: "reason" });
  const selected = useWatch({
    control: form.control,
    name: "blockedRoutePlanIds",
  });
  const plans = getRerouteBlockedPlans(context);
  const sending = busy || form.formState.isSubmitting;
  return (
    <DialogContent
      showCloseButton={!sending}
      className="flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col gap-0 overflow-hidden rounded-[2px] p-0 sm:max-w-xl"
      onEscapeKeyDown={(event) => {
        if (sending) event.preventDefault();
      }}
      onInteractOutside={(event) => event.preventDefault()}
    >
      <DialogHeader className="shrink-0 gap-1 border-b border-border p-4 pr-10 text-left">
        <DialogTitle className="font-heading text-xl uppercase">
          Escalate Emergency Reroute
        </DialogTitle>
        <DialogDescription className="break-words text-xs leading-5">
          {context.incident.incidentCode} · {context.transport.transportCode}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((values) =>
              onSubmit(parseRerouteEscalationForm(values)),
            )(event)
          }
          className="flex min-h-0 flex-col"
          aria-busy={sending}
        >
          <div className="min-h-0 space-y-3 overflow-y-auto p-4">
            {feedback && (
              <p
                role="alert"
                className="m-0 rounded-[2px] border border-destructive/30 bg-destructive/5 p-3 text-sm leading-5 text-destructive"
              >
                {feedback}
              </p>
            )}
            <fieldset
              disabled={sending || blocked}
              className="m-0 min-w-0 space-y-3 border-0 p-0"
            >
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel>
                      Escalation reason <span aria-hidden="true">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        autoFocus
                        required
                        rows={4}
                        maxLength={2000}
                        placeholder="Explain why PRIMARY and BACKUP routes cannot safely proceed."
                        className={`${controlClass} min-h-28 resize-y [field-sizing:fixed]`}
                      />
                    </FormControl>
                    <div className="flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground">
                      <span>10–2,000 characters</span>
                      <span>
                        {reason.trim().length.toLocaleString("en-GB")} / 2,000
                      </span>
                    </div>
                    <div className="min-h-5">
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="suggestedAction"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel>
                      Suggested action{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </FormLabel>
                    <Select
                      disabled={sending || blocked}
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== "HOLD")
                          form.setValue("suggestedHoldMinutes", "", {
                            shouldValidate: true,
                          });
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className={`${controlClass} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">No suggestion</SelectItem>
                        <SelectItem value="HOLD">
                          HOLD — Wait for reassessment
                        </SelectItem>
                        <SelectItem value="RETURN">
                          RETURN — Consider a return route
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="min-h-5">
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />
              {suggestion === "HOLD" && (
                <FormField
                  control={form.control}
                  name="suggestedHoldMinutes"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormLabel>
                        Suggested wait{" "}
                        <span className="font-normal text-muted-foreground">
                          (minutes, optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={15}
                          max={240}
                          step={1}
                          inputMode="numeric"
                          placeholder="15–240"
                          className={controlClass}
                        />
                      </FormControl>
                      <div className="min-h-5">
                        <FormMessage className="text-xs" />
                      </div>
                    </FormItem>
                  )}
                />
              )}
              <details className="group min-w-0 border-t border-border pt-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-[2px] text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span>
                    Blocked route plans{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional
                      {selected.length ? ` · ${selected.length} selected` : ""})
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 group-open:rotate-180"
                  />
                </summary>
                <p className="mt-1 mb-2 text-xs leading-5 text-muted-foreground">
                  Select only plans you have assessed as unable to proceed.
                </p>
                <FormField
                  control={form.control}
                  name="blockedRoutePlanIds"
                  render={({ field }) => (
                    <FormItem className="gap-1">
                      <FormControl>
                        <div
                          role="group"
                          aria-label="Plans assessed as blocked"
                          className="space-y-1"
                        >
                          {plans.map((plan) => (
                            <Label
                              key={plan.id}
                              htmlFor={`${prefix}-${plan.id}`}
                              className="flex min-h-11 min-w-0 cursor-pointer items-start gap-2 rounded-[2px] border border-border px-2.5 py-2.5 text-xs font-normal"
                            >
                              <Checkbox
                                id={`${prefix}-${plan.id}`}
                                disabled={sending || blocked}
                                checked={field.value.includes(plan.id)}
                                onCheckedChange={(checked) =>
                                  field.onChange(
                                    checked === true
                                      ? [...field.value, plan.id]
                                      : field.value.filter(
                                          (id) => id !== plan.id,
                                        ),
                                  )
                                }
                                className="shrink-0 rounded-[2px]"
                              />
                              <span className="min-w-0 break-words">
                                {plan.label}
                                <span className="mt-1 block break-all text-[10px] text-muted-foreground">
                                  {plan.id}
                                </span>
                              </span>
                            </Label>
                          ))}
                          {!plans.length && (
                            <p className="m-0 text-xs text-muted-foreground">
                              No selectable route identities are supplied in
                              this context.
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <div className="min-h-5">
                        <FormMessage className="text-xs" />
                      </div>
                    </FormItem>
                  )}
                />
              </details>
            </fieldset>
            <p className="m-0 text-xs leading-5 text-muted-foreground">
              This reports the situation to Logistics Management. It does not
              place a hold or activate a route.
            </p>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border p-4">
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={onClose}
              className="min-h-11 rounded-[2px] sm:min-h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending || blocked || !form.formState.isValid}
              className="min-h-11 rounded-[2px] sm:min-h-9"
            >
              <Send aria-hidden="true" className="size-3.5" />
              {sending ? "Sending…" : "Send Escalation to LM"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
