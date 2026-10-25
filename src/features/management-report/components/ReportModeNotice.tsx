import { REPORT_MOCK_MODE } from "@/lib/report-mode";

export function ReportModeNotice() {
  if (!import.meta.env.DEV || !REPORT_MOCK_MODE) return null;
  return (
    <p
      role="note"
      className="m-0 border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs text-slate-700"
    >
      <strong>Demo Data — Mock Mode</strong> · Exports and links to live
      incident/transport details are unavailable.
    </p>
  );
}
