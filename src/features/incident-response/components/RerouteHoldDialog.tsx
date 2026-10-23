import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ChevronDown } from "lucide-react";
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
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import {
  rerouteHoldFormSchema,
  parseRerouteHoldForm,
  type RerouteContext,
  type RerouteHoldRequest,
} from "../reroute-schemas";
import { RerouteHoldLocationSelect } from "./RerouteHoldLocationSelect";

const controlClass =
  "min-h-11 rounded-[2px] border-input bg-background text-base shadow-none sm:min-h-9 sm:text-sm";

export function RerouteHoldDialog({
  context,
  scope,
  source,
  initialRequest,
  busy,
  blocked,
  feedback,
  uncertain,
  verifying,
  verificationMessage,
  canReview,
  onVerify,
  onReview,
  onClose,
  onSubmit,
}: {
  context: RerouteContext;
  scope: string;
  source: "real" | "mock";
  initialRequest?: RerouteHoldRequest;
  busy: boolean;
  blocked: boolean;
  feedback?: string;
  uncertain: boolean;
  verifying: boolean;
  verificationMessage?: string;
  canReview: boolean;
  onVerify: () => void;
  onReview: () => void;
  onClose: () => void;
  onSubmit: (request: RerouteHoldRequest) => Promise<void>;
}) {
  const form = useForm<z.input<typeof rerouteHoldFormSchema>>({
    resolver: zodResolver(rerouteHoldFormSchema),
    mode: "onChange",
    defaultValues: {
      holdMinutes: initialRequest ? String(initialRequest.holdMinutes) : "",
      reason: initialRequest?.reason ?? "",
      monitorIntervalMinutes:
        initialRequest?.monitorIntervalMinutes === undefined
          ? ""
          : String(initialRequest.monitorIntervalMinutes),
      safeStopLocationId: initialRequest?.safeStopLocationId ?? "",
    },
  });
  const values = useWatch({ control: form.control });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const duration = /^\d+$/.test((values.holdMinutes ?? "").trim())
    ? Number(values.holdMinutes)
    : NaN;
  const monitoring = values.monitorIntervalMinutes?.trim() ?? "";
  const monitor = /^\d+$/.test(monitoring) ? Number(monitoring) : NaN;
  const sending = busy || verifying || form.formState.isSubmitting;
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
          Hold &amp; Wait Decision
        </DialogTitle>
        <DialogDescription className="break-words text-xs leading-5">
          {context.incident.incidentCode} · {context.transport.transportCode}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          noValidate
          onSubmit={(event) =>
            void form.handleSubmit((raw) =>
              onSubmit(parseRerouteHoldForm(raw)),
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
            {uncertain && (
              <div className="space-y-2 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  disabled={sending}
                  onClick={onVerify}
                  className="min-h-11 rounded-[2px] sm:min-h-9"
                >
                  {verifying ? "Checking…" : "Check latest hold"}
                </Button>
                {verificationMessage && (
                  <p role="status" className="m-0 break-words text-slate-700">
                    {verificationMessage}
                  </p>
                )}
                {canReview && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sending}
                    onClick={onReview}
                    className="min-h-11 max-w-full whitespace-normal rounded-[2px] sm:min-h-9"
                  >
                    I reviewed the context — allow a new attempt
                  </Button>
                )}
              </div>
            )}
            <fieldset
              disabled={sending || blocked}
              className="m-0 min-w-0 space-y-3 border-0 p-0"
            >
              <FormField
                control={form.control}
                name="holdMinutes"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel>
                      Hold duration <span aria-hidden="true">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoFocus
                        required
                        type="number"
                        min={15}
                        max={240}
                        step={1}
                        inputMode="numeric"
                        placeholder="15–240 minutes"
                        className={controlClass}
                      />
                    </FormControl>
                    <div className="min-h-5">
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="gap-1">
                    <FormLabel>
                      Decision reason <span aria-hidden="true">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        required
                        rows={4}
                        maxLength={2000}
                        placeholder="Explain why holding is the safest option."
                        className={`${controlClass} min-h-28 resize-y [field-sizing:fixed]`}
                      />
                    </FormControl>
                    <div className="flex flex-wrap justify-between gap-1 text-[11px] text-muted-foreground">
                      <span>10–2,000 characters</span>
                      <span>
                        {(values.reason ?? "")
                          .trim()
                          .length.toLocaleString("en-GB")}{" "}
                        / 2,000
                      </span>
                    </div>
                    <div className="min-h-5">
                      <FormMessage className="text-xs" />
                    </div>
                  </FormItem>
                )}
              />
              <details
                className="group border-t border-border pt-3"
                onToggle={(event) => setOptionsOpen(event.currentTarget.open)}
              >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-[2px] text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span>
                    Monitoring &amp; stop location{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 group-open:rotate-180"
                  />
                </summary>
                <div className="mt-2 space-y-3">
                  <FormField
                    control={form.control}
                    name="monitorIntervalMinutes"
                    render={({ field }) => (
                      <FormItem className="gap-1">
                        <FormLabel>
                          Horse monitoring interval{" "}
                          <span className="font-normal text-muted-foreground">
                            (minutes)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min={10}
                            max={120}
                            step={1}
                            inputMode="numeric"
                            placeholder="Backend default: 30 minutes"
                            className={controlClass}
                          />
                        </FormControl>
                        <p className="m-0 text-[11px] text-muted-foreground">
                          Leave empty for the backend default, or enter 10–120
                          minutes.
                        </p>
                        <div className="min-h-5">
                          <FormMessage className="text-xs" />
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safeStopLocationId"
                    render={({ field }) => (
                      <FormItem className="gap-1">
                        <FormLabel>Stop location</FormLabel>
                        <FormControl>
                          <RerouteHoldLocationSelect
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            scope={scope}
                            source={source}
                            active={optionsOpen}
                            disabled={sending || blocked}
                          />
                        </FormControl>
                        <p className="m-0 text-[11px] text-muted-foreground">
                          Choose a master location you have assessed as
                          suitable. Location type alone does not confirm safety.
                        </p>
                        <div className="min-h-5">
                          <FormMessage className="text-xs" />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </details>
            </fieldset>
            <div className="space-y-1 rounded-[2px] border border-border bg-muted/30 px-3 py-2 text-xs text-slate-700">
              <p className="m-0">
                Hold:{" "}
                {duration >= 15 && duration <= 240 ? `${duration} min` : "—"} ·
                Monitoring:{" "}
                {monitoring
                  ? monitor >= 10 && monitor <= 120
                    ? `${monitor} min`
                    : "—"
                  : "Backend default (30 min)"}
              </p>
              <p className="m-0 break-all">
                Stop: {values.safeStopLocationId || "Not specified"}
              </p>
              <p className="m-0 text-muted-foreground">
                Records waiting instructions only; no route activation or
                Transport status change.
              </p>
            </div>
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
              {busy ? "Recording…" : "Confirm Hold & Wait"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
