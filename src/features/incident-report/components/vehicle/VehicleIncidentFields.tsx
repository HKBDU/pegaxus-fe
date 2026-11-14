import {
  INCIDENT_CATEGORY,
  INCIDENT_SEVERITY,
  VEHICLE_INCIDENT_TYPE,
  VEHICLE_INCIDENT_TYPE_LABELS,
} from "@/shared/constants/incident";
import type {
  IncidentCategory,
  IncidentSeverity,
  VehicleIncidentType,
} from "@/shared/types/incident";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { IncidentFieldError } from "../IncidentFieldError";
import type { IncidentFieldErrors } from "../../validation";

export interface VehicleIncidentFieldsValue {
  category: Extract<IncidentCategory, "VEHICLE" | "BOTH">;
  incidentType: VehicleIncidentType;
  severity: IncidentSeverity;
  vehicleOperable: boolean;
  vehicleCondition: string;
  damageDescription: string;
  repairRequired: boolean;
  towingRequired: boolean;
  replacementVehicleRequired: boolean;
  estimatedRepairCost: string;
  estimatedRepairHours: string;
  repairNote: string;
}

export interface VehicleIncidentFieldsProps {
  value: VehicleIncidentFieldsValue;
  onChange: (value: VehicleIncidentFieldsValue) => void;
  disabled?: boolean;
  errors?: IncidentFieldErrors;
}

export function VehicleIncidentFields({
  value,
  onChange,
  disabled = false,
  errors = {},
}: VehicleIncidentFieldsProps) {
  const update = <K extends keyof VehicleIncidentFieldsValue>(
    field: K,
    next: VehicleIncidentFieldsValue[K],
  ) => onChange({ ...value, [field]: next });
  const setCategory = (category: VehicleIncidentFieldsValue["category"]) =>
    onChange({
      ...value,
      category,
      severity:
        category === INCIDENT_CATEGORY.BOTH
          ? INCIDENT_SEVERITY.CRITICAL
          : value.severity,
    });
  return (
    <section
      className="min-w-0 space-y-4 border border-slate-200 bg-white p-4 sm:p-5"
      aria-label="Vehicle incident details"
    >
      <h2 className="font-heading text-lg font-bold text-[#181818]">
        Vehicle details
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {([INCIDENT_CATEGORY.VEHICLE, INCIDENT_CATEGORY.BOTH] as const).map(
          (category) => (
            <button
              key={category}
              type="button"
              disabled={disabled}
              onClick={() => setCategory(category)}
              className={`min-h-12 rounded-[2px] border px-3 text-sm font-bold ${value.category === category ? "border-[#181818] bg-[#181818] text-white" : "border-slate-300 bg-white text-slate-800"}`}
            >
              {category === INCIDENT_CATEGORY.BOTH
                ? "Vehicle + Horse"
                : "Vehicle only"}
            </button>
          ),
        )}
      </div>
      <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold text-slate-900">
        Incident type
        <Select
          value={value.incidentType}
          disabled={disabled}
          onValueChange={(type) =>
            update("incidentType", type as VehicleIncidentType)
          }
        >
          <SelectTrigger
            aria-label="Incident type"
            aria-invalid={Boolean(errors.incidentType)}
            className="min-h-12 w-full text-base"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(VEHICLE_INCIDENT_TYPE).map((type) => (
              <SelectItem key={type} value={type}>
                {VEHICLE_INCIDENT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IncidentFieldError message={errors.incidentType} />
      </label>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold text-slate-900">
          Vehicle condition
          <textarea
            value={value.vehicleCondition}
            aria-invalid={Boolean(errors.vehicleCondition)}
            maxLength={2000}
            disabled={disabled}
            onChange={(event) => update("vehicleCondition", event.target.value)}
            className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
          />
          <IncidentFieldError message={errors.vehicleCondition} />
        </label>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold text-slate-900">
          Damage description
          <textarea
            value={value.damageDescription}
            aria-invalid={Boolean(errors.damageDescription)}
            maxLength={2000}
            disabled={disabled}
            onChange={(event) =>
              update("damageDescription", event.target.value)
            }
            className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
          />
          <IncidentFieldError message={errors.damageDescription} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["vehicleOperable", "Vehicle can continue"],
            ["repairRequired", "Repair required"],
            ["towingRequired", "Towing required"],
            ["replacementVehicleRequired", "Replacement vehicle required"],
          ] as const
        ).map(([field, label]) => (
          <label
            key={field}
            className="flex min-h-12 items-center gap-3 rounded-[2px] border border-slate-200 px-3 text-sm font-semibold"
          >
            <input
              type="checkbox"
              checked={value[field]}
              disabled={disabled}
              onChange={(event) => update(field, event.target.checked)}
              className="size-5 shrink-0 accent-[#f39200]"
            />
            {label}
          </label>
        ))}
      </div>
      <p className="border border-[#f39200] bg-[#fff7e8] px-3 py-2 text-sm font-semibold text-slate-800">
        Vehicle held until replacement cost is approved.
      </p>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold text-slate-900">
          Estimated cost
          <Input
            type="number"
            min="0"
            value={value.estimatedRepairCost}
            aria-invalid={Boolean(errors.estimatedRepairCost)}
            disabled={disabled}
            onChange={(event) =>
              update("estimatedRepairCost", event.target.value)
            }
            className="min-h-12 rounded-[2px] text-base"
          />
          <IncidentFieldError message={errors.estimatedRepairCost} />
        </label>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold text-slate-900">
          Repair hours
          <Input
            type="number"
            min="0"
            step="0.1"
            value={value.estimatedRepairHours}
            aria-invalid={Boolean(errors.estimatedRepairHours)}
            disabled={disabled}
            onChange={(event) =>
              update("estimatedRepairHours", event.target.value)
            }
            className="min-h-12 rounded-[2px] text-base"
          />
          <IncidentFieldError message={errors.estimatedRepairHours} />
        </label>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold text-slate-900 sm:col-span-2">
          Repair note
          <textarea
            value={value.repairNote}
            aria-invalid={Boolean(errors.repairNote)}
            maxLength={2000}
            disabled={disabled}
            onChange={(event) => update("repairNote", event.target.value)}
            className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
          />
          <IncidentFieldError message={errors.repairNote} />
        </label>
      </div>
    </section>
  );
}
