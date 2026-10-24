type NoteReport = { summaryNote: string | null; updatedAt: string | null };
export type NoteDraft = {
  text: string;
  baseline: string;
  version: string | null;
  revision: number;
  needsReview: boolean;
};
type NoteEvent =
  | { type: "edit"; text: string }
  | { type: "conflict" }
  | { type: "receive" | "reload"; report: NoteReport }
  | { type: "saved"; report: NoteReport; revision: number };

export function createNoteDraft(report: NoteReport): NoteDraft {
  return {
    text: report.summaryNote ?? "",
    baseline: report.summaryNote ?? "",
    version: report.updatedAt,
    revision: 0,
    needsReview: false,
  };
}

export function reduceNoteDraft(state: NoteDraft, event: NoteEvent): NoteDraft {
  if (event.type === "edit")
    return { ...state, text: event.text, revision: state.revision + 1 };
  if (event.type === "conflict") return { ...state, needsReview: true };
  const baseline = event.report.summaryNote ?? "";
  const version = event.report.updatedAt;
  if (event.type === "saved") {
    return {
      ...state,
      text: state.revision === event.revision ? baseline : state.text,
      baseline,
      version,
      needsReview: false,
    };
  }
  if (event.type === "reload") {
    return {
      ...state,
      text: state.text === state.baseline ? baseline : state.text,
      baseline,
      version,
      needsReview: false,
    };
  }
  if (state.version === version) return state;
  if (state.needsReview) return state;
  if (state.text === state.baseline)
    return { ...state, text: baseline, baseline, version };
  // A refresh may advance the snapshot version, but never silently accept a changed server note.
  return baseline === state.baseline
    ? { ...state, version }
    : { ...state, needsReview: true };
}
