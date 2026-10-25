import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import type { NoteDraft } from "../note-draft";

export function FinancialNoteEditor({
  draft,
  editable,
  busy,
  saving,
  fetching,
  error,
  onChange,
  onSave,
  onReview,
  demo = false,
}: {
  draft: NoteDraft;
  editable: boolean;
  busy: boolean;
  saving: boolean;
  fetching: boolean;
  error?: string;
  onChange: (text: string) => void;
  onSave: () => void;
  onReview: () => void;
  demo?: boolean;
}) {
  const tooLong = draft.text.length > 2000;
  const dirty = draft.text.trim() !== draft.baseline;
  return (
    <Card className="min-w-0 gap-3 rounded-[2px] py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="font-heading text-lg uppercase">
          Logistics manager evaluation
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (
              !demo &&
              editable &&
              !busy &&
              !fetching &&
              !draft.needsReview &&
              !tooLong &&
              dirty
            )
              onSave();
          }}
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="financial-summary-note">Summary note</Label>
            <span
              id="financial-note-count"
              className="text-xs tabular-nums text-slate-500"
            >
              {draft.text.length.toLocaleString()} / 2,000
            </span>
          </div>
          <Textarea
            id="financial-summary-note"
            value={draft.text}
            onChange={(event) => onChange(event.target.value)}
            disabled={!editable}
            rows={5}
            placeholder="Enter your financial evaluation…"
            aria-invalid={tooLong || Boolean(error)}
            aria-describedby="financial-note-count financial-note-error financial-note-hint"
            className="min-h-32 resize-y rounded-[2px] bg-white text-base focus-visible:ring-primary/25 md:text-sm"
          />
          <div
            id="financial-note-error"
            role="status"
            className="min-h-6 pt-1 text-xs text-destructive"
          >
            {tooLong ? "Use at most 2,000 characters." : error}
          </div>
          {dirty ? (
            <details className="mb-3 text-xs text-slate-500">
              <summary className="w-fit cursor-pointer rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                Compare with saved note
              </summary>
              <p className="mt-2 mb-0 whitespace-pre-wrap break-words">
                {draft.baseline || "No saved note."}
              </p>
            </details>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              id="financial-note-hint"
              className="m-0 max-w-lg text-xs text-slate-500"
            >
              {demo
                ? "Demo notes stay in this page only. Saving requires live reporting."
                : !editable
                  ? "A current, completed, saved report is required to save a note."
                  : draft.needsReview
                    ? "The report changed. Load the latest version and review it; your draft stays here."
                    : dirty
                      ? "You have unsaved changes. Empty text clears the saved note."
                      : "Your note matches the saved report."}
            </p>
            <div className="flex flex-wrap gap-2">
              {draft.needsReview ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || fetching}
                  onClick={onReview}
                  className="rounded-[2px]"
                >
                  Review latest report
                </Button>
              ) : null}
              <Button
                type="submit"
                disabled={
                  demo ||
                  !editable ||
                  busy ||
                  fetching ||
                  draft.needsReview ||
                  tooLong ||
                  !dirty
                }
                className="rounded-[2px]"
              >
                {saving ? "Saving note…" : "Save note"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
