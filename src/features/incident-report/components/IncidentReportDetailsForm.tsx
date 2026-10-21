import { INCIDENT_SEVERITY, INCIDENT_SEVERITY_OPTIONS } from "@/shared/constants/incident";
import type { IncidentSeverity } from "@/shared/types/incident";
import { Input } from "@/shared/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Textarea } from "@/shared/components/ui/textarea";

export interface IncidentReportDetailsValue {
  severity: IncidentSeverity;
  title: string;
  immediateAction: string;
  emergencySettlementRequired: boolean;
}

export interface IncidentReportDetailsFormProps {
  value: IncidentReportDetailsValue;
  onChange: (value: IncidentReportDetailsValue) => void;
  disabled?: boolean;
}

const severityOptions = [
  INCIDENT_SEVERITY.LOW,
  INCIDENT_SEVERITY.MEDIUM,
  INCIDENT_SEVERITY.HIGH,
  INCIDENT_SEVERITY.CRITICAL,
] as const;

/** Large-touch-target incident details for crew members reporting from the field. */
export function IncidentReportDetailsForm({
  value,
  onChange,
  disabled = false,
}: IncidentReportDetailsFormProps) {
  const update = <K extends keyof IncidentReportDetailsValue>(
    field: K,
    nextValue: IncidentReportDetailsValue[K],
  ) => onChange({ ...value, [field]: nextValue });

  return (
    <section className="space-y-5" aria-label="Incident details">
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold uppercase tracking-[0.04em] text-slate-900">
          Severity <span className="text-red-600">*</span>
        </legend>
        <RadioGroup
          value={value.severity}
          disabled={disabled}
          onValueChange={(nextValue) => update("severity", nextValue as IncidentSeverity)}
          aria-label="Severity"
          className="grid grid-cols-2 gap-2 "
        >
          {severityOptions.map((severity) => (
            <label
              key={severity}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-[#f39200] has-[[data-state=checked]]:bg-[#f39200] has-[[data-state=checked]]:bg-[#181818] has-[[data-state=checked]]:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
            >
              <RadioGroupItem value={severity} className="sr-only" />
              {INCIDENT_SEVERITY_OPTIONS[severity].label}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      <label className="block space-y-2 text-sm text-slate-900">
        <span className="font-bold ">Title</span>
        <Input
          value={value.title}
          maxLength={200}
          disabled={disabled}
          onChange={(event) => update("title", event.target.value)}
          placeholder="Briefly describe the incident"
          className="h-12 rounded-[2px] bg-white text-[1em]"
        />
        <span className="block text-right text-xs font-normal text-slate-500">
          {value.title.length}/200
        </span>
      </label>

      <label className="block space-y-2 text-sm text-slate-900">
        <span className="font-bold ">Immediate action</span>
        <Textarea
          value={value.immediateAction}
          disabled={disabled}
          onChange={(event) => update("immediateAction", event.target.value)}
          placeholder="What did you do to keep the horse and transport safe?"
          className="min-h-28 resize-y rounded-[2px] bg-white text-[1em]"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold uppercase tracking-[0.04em] text-slate-900">
          Emergency Settlement
        </legend>
        <RadioGroup
          value={String(value.emergencySettlementRequired)}
          disabled={disabled}
          onValueChange={(nextValue) =>
            update("emergencySettlementRequired", nextValue === "true")
          }
          aria-label="Emergency Settlement"
          className="grid grid-cols-2 gap-2"
        >
          {[true, false].map((required) => (
            <label
              key={String(required)}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[2px] border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition-colors hover:border-[#f39200] has-[[data-state=checked]]:bg-[#f39200] has-[[data-state=checked]]:bg-[#181818] has-[[data-state=checked]]:text-white has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
            >
              <RadioGroupItem
                value={String(required)}
                className="sr-only"
              />
              {required ? "YES" : "NO"}
            </label>
          ))}
        </RadioGroup>
      </fieldset>
    </section>
  );
}
