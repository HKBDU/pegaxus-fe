import { ArrowRight, Loader2, MapPin, ShieldAlert, Split } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import type { MapLocation, MapRoute } from "@/shared/components/map";

export type BcpRouteSplitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeToSplit: MapRoute | null;
  detectedBcp: MapLocation | null;
  distanceKmToRoute?: number;
  isMandatory: boolean;
  isFinalDestination?: boolean;
  dwellMinutes?: number;
  isSplitting: boolean;
  onConfirmSplit: () => Promise<void> | void;
  onDismiss: () => void;
};

export function BcpRouteSplitDialog({
  open,
  onOpenChange,
  routeToSplit,
  detectedBcp,
  distanceKmToRoute = 0,
  isMandatory: _isMandatory,
  isFinalDestination = false,
  dwellMinutes = 30,
  isSplitting,
  onConfirmSplit,
  onDismiss,
}: BcpRouteSplitDialogProps) {
  if (!routeToSplit || !detectedBcp) return null;

  const originName = routeToSplit.fromLocation?.name || "Origin";
  const originCountry = routeToSplit.fromLocation?.country || "";
  const destName = routeToSplit.toLocation?.name || "Destination";
  const destCountry = routeToSplit.toLocation?.country || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-0 max-w-md rounded-[2px] p-4 sm:max-w-lg sm:p-5">
        <DialogHeader className="text-left">
          <div className="flex min-w-0 items-start gap-2">
            <div className="grid size-8 shrink-0 place-items-center rounded-[2px] bg-amber-100 text-amber-800">
              <Split className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-slate-900">
                Cross-Border Route Detected
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This route crosses an international border. Would you like to insert a Border Control Point (BCP) and split into 2 continuous segments?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-3 space-y-3 text-xs">
          {/* Original Route Header */}
          <div className="rounded-[2px] border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Original Route</span>
              <span className="font-semibold text-slate-700">
                {routeToSplit.distanceKm != null
                  ? `${Math.round(routeToSplit.distanceKm * 10) / 10} km`
                  : "—"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 font-medium text-slate-900">
              <span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">
                {originName} {originCountry ? `(${originCountry})` : ""}
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">
                {destName} {destCountry ? `(${destCountry})` : ""}
              </span>
            </div>
          </div>

          {/* Detected BCP Card */}
          <div className="rounded-[2px] border border-amber-300 bg-amber-50/70 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-900">
                      {detectedBcp.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-100/70 text-amber-900 px-1.5 py-0 text-[10px] font-semibold"
                    >
                      BCP Required
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-slate-600">
                    <MapPin className="mr-0.5 inline size-3 text-slate-400" />
                    {detectedBcp.city ? `${detectedBcp.city}, ` : ""}
                    {detectedBcp.country}
                    {detectedBcp.address ? ` • ${detectedBcp.address}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-900 font-medium">
                    {distanceKmToRoute <= 2
                      ? "📍 BCP post is located on this transit corridor."
                      : `📍 Located approx. ~${distanceKmToRoute} km from transit path.`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Split Plan Simulation */}
          <div className="space-y-1.5 rounded-[2px] border border-slate-200 bg-white p-3">
            <p className="font-semibold text-slate-800">
              Proposed 2 Continuous Segments:
            </p>
            <div className="space-y-2 border-l-2 border-amber-400 pl-3">
              <div>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="font-bold text-amber-800">Segment 1:</span>
                  <span className="font-medium text-slate-900">
                    {originName} → {detectedBcp.name}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    Stop Type: BCP
                  </Badge>
                  <span>Dwell: {dwellMinutes} mins</span>
                </div>
              </div>

              <div>
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="font-bold text-blue-800">Segment 2:</span>
                  <span className="font-medium text-slate-900">
                    {detectedBcp.name} → {destName}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                    Stop Type: {isFinalDestination ? "DESTINATION" : "REST_STOP"}
                  </Badge>
                  <span>Transit to destination</span>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 italic">
              * System will automatically call Geoapify to recalculate exact distance, duration, and road coordinates for both segments.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSplitting}
            onClick={onDismiss}
            className="rounded-[2px] text-xs"
          >
            Keep Single Route
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSplitting}
            onClick={() => void onConfirmSplit()}
            className="rounded-[2px] bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700"
          >
            {isSplitting ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Routing via BCP...
              </>
            ) : (
              <>
                <Split className="mr-1.5 size-3.5" />
                Confirm & Auto-Split Route
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
