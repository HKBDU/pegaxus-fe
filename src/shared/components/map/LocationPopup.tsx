import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { LocationAction, MapLocation } from "./types";

type LocationPopupProps = {
  location: MapLocation;
  open: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onAction?: (action: LocationAction, location: MapLocation) => void;
  onHoverChange?: (hovered: boolean) => void;
};

export function LocationPopup({
  location,
  open,
  canEdit,
  canDelete,
  onClose,
  onAction,
  onHoverChange,
}: LocationPopupProps) {
  return (
    <div
      role="dialog"
      aria-label={`Details for ${location.name}`}
      aria-hidden={!open}
      className={cn(
        "absolute top-16 left-3 z-20 w-[min(260px,calc(100%-1.5rem))] origin-top-left border border-slate-400 bg-white p-2.5 text-[11px] text-slate-800 shadow-md transition-[opacity,transform] duration-150 ease-out",
        open
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-1 opacity-0",
      )}
      onMouseEnter={() => open && onHoverChange?.(true)}
      onMouseLeave={() => open && onHoverChange?.(false)}
    >
      <div className="border-b border-slate-200 pb-2">
        <p className="mb-1 text-[13px] font-bold leading-none text-amber-600">
          {location.country ? `${location.country}:` : "Location:"}
        </p>
        <h3 className="text-[13px] font-extrabold uppercase leading-tight text-slate-800">
          {location.name}
        </h3>
        {location.type && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-sm leading-none text-slate-500">—</span>
            <span className="border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-slate-700">
              {location.type}
            </span>
          </div>
        )}
      </div>

      <p className="py-2 leading-snug">
        {location.address || location.city || "No address provided"}
      </p>

      <p className="mb-2 inline-flex items-center gap-1 border border-slate-200 bg-slate-50 px-1.5 py-1 font-mono text-[10px] leading-none">
        <span aria-hidden="true" className="text-slate-500">
          ⌖
        </span>
        {location.latitude.toFixed(4)}; {location.longitude.toFixed(4)}
      </p>

      {location.note && (
        <p className="border-b border-slate-200 pb-2 leading-snug">
          {location.note}
        </p>
      )}

      {(canEdit || canDelete) && (
        <div className="flex justify-end gap-1.5 pt-2">
          {canEdit && (
            <Button
              size="sm"
              className="h-7 rounded-none bg-amber-500 px-3 text-[10px] font-bold uppercase text-white hover:bg-amber-600"
              onClick={() => onAction?.("EDIT", location)}
            >
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 rounded-none px-3 text-[10px] font-bold uppercase"
              onClick={() => onAction?.("DELETE", location)}
            >
              Delete
            </Button>
          )}
        </div>
      )}

      <button type="button" className="sr-only" onClick={onClose}>
        Close location details
      </button>
    </div>
  );
}
