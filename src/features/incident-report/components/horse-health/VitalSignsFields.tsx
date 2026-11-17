import { Input } from "@/shared/components/ui/input";
import { IncidentFieldError } from "../IncidentFieldError";
import type { IncidentFieldErrors } from "../../validation";

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
  errors?: IncidentFieldErrors;
}

export function VitalSignsFields({
  value,
  onChange,
  warnings = [],
  disabled = false,
  errors = {},
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
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-semibold">
          <span className="sm:min-h-10">Temperature °C</span>
          <Input
            type="number"
            step="0.1"
            value={value.bodyTemperatureCelsius}
            aria-invalid={Boolean(errors.bodyTemperatureCelsius)}
            onChange={(event) =>
              update("bodyTemperatureCelsius", event.target.value)
            }
            className="min-h-12 rounded-[2px] text-base"
          />
          <IncidentFieldError message={errors.bodyTemperatureCelsius} />
        </label>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-semibold">
          <span className="sm:min-h-10">Heart rate bpm</span>
          <Input
            type="number"
            min="0"
            value={value.heartRateBpm}
            aria-invalid={Boolean(errors.heartRateBpm)}
            onChange={(event) => update("heartRateBpm", event.target.value)}
            className="min-h-12 rounded-[2px] text-base"
          />
          <IncidentFieldError message={errors.heartRateBpm} />
        </label>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-semibold">
          <span className="sm:min-h-10">Respiratory rate bpm</span>
          <Input
            type="number"
            min="0"
            value={value.respiratoryRateBpm}
            aria-invalid={Boolean(errors.respiratoryRateBpm)}
            onChange={(event) =>
              update("respiratoryRateBpm", event.target.value)
            }
            className="min-h-12 rounded-[2px] text-base"
          />
          <IncidentFieldError message={errors.respiratoryRateBpm} />
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
