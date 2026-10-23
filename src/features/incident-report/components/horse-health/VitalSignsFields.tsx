import { Input } from "@/shared/components/ui/input";

export interface VitalSignsValue {
  bodyTemperatureCelsius: string;
  heartRateBpm: string;
  respiratoryRateBpm: string;
}
export interface VitalSignsFieldsProps {
  value: VitalSignsValue;
  onChange: (value: VitalSignsValue) => void;
  warnings?: string[];
  disabled?: boolean;
}

export function VitalSignsFields({
  value,
  onChange,
  warnings = [],
  disabled = false,
}: VitalSignsFieldsProps) {
  const update = <K extends keyof VitalSignsValue>(
    field: K,
    next: VitalSignsValue[K],
  ) => onChange({ ...value, [field]: next });
  return (
    <fieldset
      className="space-y-3 border border-slate-200 p-4"
      disabled={disabled}
      aria-label="Vital signs"
    >
      <legend className="px-1 text-sm font-bold uppercase tracking-wide text-slate-900">
        Vital signs
      </legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold">
          Temperature °C
          <Input
            type="number"
            step="0.1"
            value={value.bodyTemperatureCelsius}
            onChange={(event) =>
              update("bodyTemperatureCelsius", event.target.value)
            }
            className="min-h-12 rounded-[2px] text-base"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Heart rate bpm
          <Input
            type="number"
            min="0"
            value={value.heartRateBpm}
            onChange={(event) => update("heartRateBpm", event.target.value)}
            className="min-h-12 rounded-[2px] text-base"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Respiratory rate bpm
          <Input
            type="number"
            min="0"
            value={value.respiratoryRateBpm}
            onChange={(event) =>
              update("respiratoryRateBpm", event.target.value)
            }
            className="min-h-12 rounded-[2px] text-base"
          />
        </label>
      </div>
      {warnings.length > 0 && (
        <ul
          className="space-y-1 text-sm font-medium text-amber-800"
          role="status"
        >
          {warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
