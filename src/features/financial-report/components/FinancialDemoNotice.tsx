import { Link } from "react-router-dom";
import { REPORT_MOCK_MODE } from "@/lib/report-mode";
import { financialDemoIds } from "../mocks/ids";

export function FinancialDemoNotice() {
  if (!import.meta.env.DEV || !REPORT_MOCK_MODE) return null;
  return (
    <div
      role="note"
      className="space-y-1.5 border-l-2 border-primary bg-primary/5 px-3 py-2 text-xs text-slate-700"
    >
      <p className="m-0">
        <strong>Demo Data — Mock Mode</strong> · Refresh and Save are
        unavailable. Draft notes are not persisted.
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(financialDemoIds).map(([label, id]) => (
          <Link
            key={id}
            to={`/admin/transports/${id}/financial-summary`}
            className="capitalize text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {label} sample
          </Link>
        ))}
      </div>
    </div>
  );
}
