import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { dossierDetail } from "@/app/route-config";
import apiClient from "@/lib/axios";

import { dossierKeys } from "../hooks/useDossier";
import type { DossierOverview } from "../types";

/**
 * Dossier of a return booking (a horse left behind mid-trip, brought back). The horse's papers were checked on the original trip,
 * so the Transport Specialist may waive every open requirement at once and point to the original dossier instead.
 */
export function ReturnTripPanel({ dossier, role }: { dossier: DossierOverview; role: string | undefined }) {
  const queryClient = useQueryClient();
  const source = dossier.returnOf;
  const canWaive = role === "TRANSPORT_SPECIALIST" && !dossier.writeLocked;
  const open = dossier.requirementSummary.total - dossier.requirementSummary.satisfied - dossier.requirementSummary.waived;
  const waive = useMutation({
    mutationFn: () => apiClient.post(`/compliance-dossiers/${encodeURIComponent(String(dossier.complianceDossierId))}/waive-for-return`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dossierKeys.all });
      toast.success("Every open requirement was waived with the documents of the original trip.");
    },
    onError: () => toast.error("Unable to waive the dossier. Reload the page and try again."),
  });
  if (!source) return null;

  return (
    <section role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="min-w-0">
        <p className="m-0 font-semibold">Return trip of {source.horseName ?? "a horse"} from transport {source.transportCode}</p>
        <p className="m-0 mt-1 text-xs leading-5">
          The horse was left behind on booking {source.bookingCode}. Its documents were checked on that trip
          {source.dossierId ? (
            <>
              {" "}(dossier{" "}
              <Link to={dossierDetail(source.dossierId, role)} className="font-semibold underline">{source.dossierCode}</Link>)
            </>
          ) : null}
          , so this checklist can be waived as a whole.
        </p>
      </div>
      {canWaive && open > 0 ? (
        <button
          type="button"
          disabled={waive.isPending}
          onClick={() => {
            if (window.confirm(`Waive ${open} open requirement(s) and reuse the documents of ${source.transportCode}?`)) waive.mutate();
          }}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-[2px] bg-[#f39200] px-4 text-xs font-semibold text-[#181818] hover:bg-[#e08600] disabled:pointer-events-none disabled:opacity-50"
        >
          {waive.isPending ? "Waiving..." : "Waive all (return trip)"}
        </button>
      ) : null}
    </section>
  );
}
