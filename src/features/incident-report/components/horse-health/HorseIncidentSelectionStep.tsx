import type { HorseHealthOverviewItem } from "@/features/horse-health/types";
import { Checkbox } from "@/shared/components/ui/checkbox";

interface HorseIncidentSelectionStepProps {
  horses: HorseHealthOverviewItem[];
  selectedHorseIds: string[];
  onToggle: (horseId: string) => void;
  onNext: () => void;
  disabled?: boolean;
  error?: string | null;
}

export function HorseIncidentSelectionStep({
  horses,
  selectedHorseIds,
  onToggle,
  onNext,
  disabled = false,
  error,
}: HorseIncidentSelectionStepProps) {
  const selected = new Set(selectedHorseIds);

  return (
    <section
      className="min-w-0 space-y-5 pb-24 sm:pb-0"
      aria-labelledby="horse-selection-title"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#f39200]">
          Report horse incident
        </p>
        <h1
          id="horse-selection-title"
          className="mt-1 font-heading text-xl font-bold text-[#181818]"
        >
          Select horses
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Select one or more horses from this transport.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="border border-red-600 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {horses.map((item) => {
          const isSelected = selected.has(item.horse.horseId);
          return (
            <label
              key={item.horse.horseId}
              className={`block min-w-0 cursor-pointer border border-l-4 bg-white p-4 transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#f39200] ${
                isSelected
                  ? "border-[#f39200] ring-1 ring-[#f39200]"
                  : "border-slate-200"
              }`}
            >
              <Checkbox
                checked={isSelected}
                disabled={disabled}
                onCheckedChange={() => onToggle(item.horse.horseId)}
                aria-label={`Select ${item.horse.horseName}`}
                className="sr-only"
              />
              <span className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center border text-xs font-bold ${
                    isSelected
                      ? "border-[#f39200] bg-[#f39200] text-[#181818]"
                      : "border-slate-400 bg-white"
                  }`}
                >
                  {isSelected ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-heading text-base font-bold uppercase text-[#181818] [overflow-wrap:anywhere]">
                    {item.horse.horseName}
                  </span>
                  <span className="mt-2 grid gap-1 break-words text-xs uppercase tracking-wide text-slate-600 [overflow-wrap:anywhere]">
                    <span>
                      <strong className="mr-2 text-[10px] text-[#181818]">
                        Passport ID:
                      </strong>
                      {item.horse.passportNumber ?? "—"}
                    </span>
                    <span>
                      <strong className="mr-2 text-[10px] text-[#181818]">
                        Microchip:
                      </strong>
                      {item.horse.microchipNumber ?? "—"}
                    </span>
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:static sm:border sm:p-4 sm:shadow-none">
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
            {selectedHorseIds.length} selected
          </span>
          <button
            type="button"
            disabled={disabled || selectedHorseIds.length === 0}
            onClick={onNext}
            className="min-h-12 min-w-28 bg-[#f39200] px-5 text-sm font-bold text-[#181818] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
