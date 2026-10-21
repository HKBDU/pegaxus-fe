import { CheckCircle2, PencilLine } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { completeFormSchema } from "../schemas";
import { HandoverApiError } from "../services";
import { hasSignature, INK, strokesToPng } from "../signature";
import type {
  CompleteDraft,
  CompleteInput,
  HandoverRecord,
  SignatureStroke,
} from "../types";
import { useCompleteDraft } from "../hooks/useCompleteDraft";
import { describeError } from "../utils";
import { LocationCheck } from "./LocationCheck";
import { NoteSection } from "./NoteSection";
import { PartiesSection } from "./PartyBlock";
import { RecordSummary } from "./RecordSummary";
import { SignatureCanvas } from "./SignatureCanvas";

interface Props {
  record: HandoverRecord;
  /** Crew pages get a bar fixed to the bottom of the screen and bigger buttons. */
  mobile: boolean;
  pending: boolean;
  target: {
    latitude: number;
    longitude: number;
    name?: string;
    radiusMeters?: number;
  } | null;
  onSubmit: (input: CompleteInput) => Promise<void>;
  onBack: () => void;
  /** The BE refused the last submit; shown above the buttons. */
  submitError: unknown;
  onClearSubmitError: () => void;
}

type FieldErrors = Record<string, string>;

/** Server field names come PascalCase or camelCase; the form keys are camelCase paths like `from.partyName`. */
const toFormKey = (field: string) => {
  const key = field.trim().replace(/^./, (letter) => letter.toLowerCase());
  const party = key.match(/^(from|to)(PartyName|ContactName|ContactPhone)$/);
  return party
    ? `${party[1]}.${party[2].replace(/^./, (letter) => letter.toLowerCase())}`
    : key;
};

/**
 * Completion step (HO5): notes, optional corrections to the parties and place, and the two signatures. The customer signs
 * on the driver's phone, so every control is sized for a finger and the pads keep a 2:1 shape at any screen width.
 */
export function CompleteForm({
  record,
  mobile,
  pending,
  target,
  onSubmit,
  onBack,
  submitError,
  onClearSubmitError,
}: Props) {
  const { draft, sender, receiver, setDraft, setSender, setReceiver, clear } =
    useCompleteDraft(record);
  const [editing, setEditing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [positionValid, setPositionValid] = useState(false);
  const locationValid =
    (record.handoverType === "OTHER" && !record.geofence) || positionValid;
  const submitting = useRef(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [padErrors, setPadErrors] = useState<{
    sender?: string;
    receiver?: string;
  }>({});
  const root = useRef<HTMLFormElement>(null);

  const patch = (next: Partial<CompleteDraft>) => {
    onClearSubmitError();
    setDraft({ ...draft, ...next });
  };
  const clearError = (key: string) =>
    setErrors((current) =>
      current[key] ? { ...current, [key]: "" } : current,
    );

  const scrollTo = (selector: string) => {
    const element = root.current?.querySelector<HTMLElement>(selector);
    element?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    element
      ?.querySelector<HTMLElement>("textarea,input,canvas")
      ?.focus({ preventScroll: true });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      pending ||
      submitting.current ||
      !locationValid ||
      !navigator.onLine ||
      document.hidden
    )
      return;
    const parsed = completeFormSchema.safeParse(draft);
    const next: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ||= issue.message;
    }
    const missing = {
      sender: hasSignature(sender)
        ? undefined
        : "The sender has not signed yet.",
      receiver: hasSignature(receiver)
        ? undefined
        : "The receiver has not signed yet.",
    };
    setErrors(next);
    setPadErrors(missing);

    const firstField = [
      "horseConditionNote",
      "documentHandoverNote",
      "equipmentHandoverNote",
      "discrepancyNote",
    ].find((key) => next[key]);
    if (firstField) return scrollTo(`[data-field="${firstField}"]`);
    if (Object.keys(next).length > 0) {
      setEditing(true);
      return;
    }
    if (missing.sender) return scrollTo('[data-signature-pad="sender"]');
    if (missing.receiver) return scrollTo('[data-signature-pad="receiver"]');
    if (!parsed.success) return;

    submitting.current = true;
    setPreparing(true);
    try {
      const [senderSignature, receiverSignature] = await Promise.all([
        strokesToPng(sender, INK.sender),
        strokesToPng(receiver, INK.receiver),
      ]);
      await onSubmit({
        ...parsed.data,
        lastUpdatedAt: record.updatedAt,
        senderSignature,
        receiverSignature,
      });
      clear();
    } catch (error) {
      if (error instanceof HandoverApiError) {
        const fromServer: FieldErrors = {};
        for (const entry of error.errors)
          if (entry.field) fromServer[toFormKey(entry.field)] ||= entry.message;
        setErrors(fromServer);
        if (error.errorCode === "SIGNATURE_REQUIRED") {
          const senderMissing = !hasSignature(sender);
          setPadErrors({
            sender: senderMissing ? error.message : undefined,
            receiver: senderMissing ? undefined : error.message,
          });
          scrollTo(
            senderMissing
              ? '[data-signature-pad="sender"]'
              : '[data-signature-pad="receiver"]',
          );
        } else if (error.errorCode === "INVALID_IMAGE") {
          setPadErrors({ sender: error.message, receiver: error.message });
        }
        const firstServerField = Object.keys(fromServer).find(
          (key) => key in draft,
        );
        if (firstServerField) scrollTo(`[data-field="${firstServerField}"]`);
        return;
      }
      // Local failure while building the PNG (canvas unsupported, image too large).
      setPadErrors({ sender: describeError(error), receiver: undefined });
      scrollTo('[data-signature-pad="sender"]');
    } finally {
      submitting.current = false;
      setPreparing(false);
    }
  };

  const bar = cn(
    "flex gap-2",
    mobile
      ? "fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] [&>button]:min-h-15 [&>button]:flex-1 [&>button]:text-base"
      : "flex-col-reverse sm:flex-row sm:justify-end [&>button]:min-h-11 sm:[&>button]:min-h-10",
  );

  return (
    <form ref={root} onSubmit={submit} noValidate className="space-y-4">
      <RecordSummary
        record={record}
        editing={editing}
        location={draft.location}
        onLocationChange={(location) => patch({ location })}
      />

      <div className="space-y-2">
        <PartiesSection
          from={{
            party: record.from,
            editing,
            draft: draft.from,
            onDraftChange: (from) => patch({ from }),
            errors: {
              partyName: errors["from.partyName"],
              contactName: errors["from.contactName"],
              contactPhone: errors["from.contactPhone"],
            },
          }}
          to={{
            party: record.to,
            editing,
            draft: draft.to,
            onDraftChange: (to) => patch({ to }),
            errors: {
              partyName: errors["to.partyName"],
              contactName: errors["to.contactName"],
              contactPhone: errors["to.contactPhone"],
            },
          }}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing((value) => !value)}
            className="min-h-11 gap-1.5 rounded-[2px] text-primary hover:text-primary sm:min-h-8"
          >
            <PencilLine aria-hidden="true" className="size-4" />
            {editing ? "Done editing details" : "Correct parties or location"}
          </Button>
        </div>
      </div>

      {record.handoverType !== "OTHER" || record.geofence ? (
        <LocationCheck target={target} onValidityChange={setPositionValid} />
      ) : null}

      <section
        aria-label="Handover notes"
        className="overflow-hidden rounded-[2px] border border-slate-300 bg-white"
      >
        <NoteSection
          name="horseConditionNote"
          title="Horse condition"
          required
          placeholder="Describe how the horses look and behave at handover…"
          value={draft.horseConditionNote}
          error={errors.horseConditionNote}
          onChange={(horseConditionNote) => {
            clearError("horseConditionNote");
            patch({ horseConditionNote });
          }}
        />
        <NoteSection
          name="documentHandoverNote"
          title="Compliance document"
          required
          placeholder="Compliance document notes…"
          value={draft.documentHandoverNote}
          error={errors.documentHandoverNote}
          onChange={(documentHandoverNote) => {
            clearError("documentHandoverNote");
            patch({ documentHandoverNote });
          }}
        />
        <NoteSection
          name="equipmentHandoverNote"
          title="Equipment"
          required
          placeholder="Equipment inventory…"
          value={draft.equipmentHandoverNote}
          error={errors.equipmentHandoverNote}
          onChange={(equipmentHandoverNote) => {
            clearError("equipmentHandoverNote");
            patch({ equipmentHandoverNote });
          }}
        />
        <NoteSection
          name="discrepancyNote"
          title="Discrepancy (optional)"
          placeholder="Discrepancy notes…"
          value={draft.discrepancyNote}
          error={errors.discrepancyNote}
          onChange={(discrepancyNote) => {
            clearError("discrepancyNote");
            patch({ discrepancyNote });
          }}
        />
      </section>

      <section
        aria-label="Signatures"
        className="rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4"
      >
        <div className="grid gap-5 md:grid-cols-2 md:gap-4">
          <SignatureCanvas
            id="sender"
            label="Sender sign"
            signer={draft.from.partyName || record.from.partyName || undefined}
            tone="sender"
            strokes={sender}
            error={padErrors.sender}
            disabled={pending || preparing}
            onChange={(strokes: SignatureStroke[]) => {
              setPadErrors((current) => ({ ...current, sender: undefined }));
              onClearSubmitError();
              setSender(strokes);
            }}
          />
          <SignatureCanvas
            id="receiver"
            label="Receiver sign"
            signer={draft.to.partyName || record.to.partyName || undefined}
            tone="receiver"
            strokes={receiver}
            error={padErrors.receiver}
            disabled={pending || preparing}
            onChange={(strokes: SignatureStroke[]) => {
              setPadErrors((current) => ({ ...current, receiver: undefined }));
              onClearSubmitError();
              setReceiver(strokes);
            }}
          />
        </div>
      </section>

      {submitError &&
      !(
        submitError instanceof HandoverApiError &&
        ["SIGNATURE_REQUIRED", "INVALID_IMAGE", "HANDOVER_MODIFIED"].includes(
          submitError.errorCode ?? "",
        )
      ) ? (
        <p
          role="alert"
          className="rounded-[2px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {describeError(submitError)}
        </p>
      ) : null}

      <div className={bar}>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={pending}
          className="rounded-[2px]"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            preparing ||
            !locationValid ||
            !hasSignature(sender) ||
            !hasSignature(receiver)
          }
          className="gap-2 rounded-[2px] font-heading font-semibold tracking-[0.06em] uppercase shadow-[0.125rem_0.125rem_0_0_rgb(0_0_0/0.85)]"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          {pending ? "Completing…" : "Complete handover record"}
        </Button>
      </div>
    </form>
  );
}
