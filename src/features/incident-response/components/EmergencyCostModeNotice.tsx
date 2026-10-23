import { isEmergencyCostMockMode } from "../source";

export function EmergencyCostModeNotice() {
  if (!isEmergencyCostMockMode()) return null;
  return (
    <aside
      role="note"
      className="rounded-xs border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      <strong>MOCK DATA · Local demonstration only.</strong> Synthetic
      assignments, costs and images; no cost API or storage upload is sent. Real
      sign-in is still required. Reload or account/session change resets the
      mock repository.
    </aside>
  );
}
