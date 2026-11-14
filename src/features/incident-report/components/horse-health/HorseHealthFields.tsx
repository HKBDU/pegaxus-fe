import {
  HORSE_INCIDENT_TYPE,
  HORSE_INCIDENT_TYPE_LABELS,
} from "@/shared/constants/incident";
import type { HorseIncidentType } from "@/shared/types/incident";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { TimePicker } from "@/shared/components/shadcn-studio/date-picker/date-picker-09";
import { formatUtcDateTime, toUtcIso } from "@/shared/utils/datetime";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { VitalSignsFields, type VitalSignsValue } from "./VitalSignsFields";
import { IncidentFieldError } from "../IncidentFieldError";
import type { IncidentFieldErrors } from "../../validation";

export interface HorseHealthFieldsValue extends VitalSignsValue {
  incidentType: HorseIncidentType;
  conditionDescription: string;
  symptoms: string;
  firstAidProvided: string;
  veterinarianRequired: boolean;
  isolationRequired: boolean;
  veterinarianContactedAt: string;
  veterinarianInstruction: string;
  medicationGiven: string;
  horseTransportable: boolean | null;
}
export interface HorseHealthFieldsProps {
  value: HorseHealthFieldsValue;
  onChange: (value: HorseHealthFieldsValue) => void;
  horseName: string;
  passportNumber?: string | null;
  microchipNumber?: string | null;
  warnings?: string[];
  disabled?: boolean;
  errors?: IncidentFieldErrors;
}

export function HorseHealthFields({
  value,
  onChange,
  horseName,
  passportNumber,
  microchipNumber,
  warnings = [],
  disabled = false,
  errors = {},
}: HorseHealthFieldsProps) {
  const update = <K extends keyof HorseHealthFieldsValue>(
    field: K,
    next: HorseHealthFieldsValue[K],
  ) => onChange({ ...value, [field]: next });
  const contactedDate = value.veterinarianContactedAt.split("T")[0] ?? "";
  const contactedTime =
    value.veterinarianContactedAt.split("T")[1]?.slice(0, 5) ?? "";
  const contactedSeconds = value.veterinarianContactedAt
    .split("T")[1]
    ?.split(":")[2];
  const contactedUtc = value.veterinarianContactedAt
    ? toUtcIso(value.veterinarianContactedAt)
    : undefined;
  const updateContactedDate = (date: string) =>
    update(
      "veterinarianContactedAt",
      date
        ? `${date}T${contactedTime || "00:00"}${contactedSeconds ? `:${contactedSeconds}` : ""}`
        : "",
    );
  const updateContactedTime = (time: string) =>
    update(
      "veterinarianContactedAt",
      time
        ? `${contactedDate}T${time}${contactedSeconds ? `:${contactedSeconds}` : ""}`
        : contactedDate
          ? `${contactedDate}T`
          : "",
    );
  return (
    <section
      className="min-w-0 space-y-4 border border-l-4 border-slate-200 border-l-[#f39200] bg-white p-4 sm:p-5"
      aria-label="Horse health incident details"
    >
      <header className="break-words border-b border-slate-200 pb-3 [overflow-wrap:anywhere]">
        <h2 className="font-heading text-base font-bold uppercase text-[#181818]">
          {horseName}
        </h2>
        <div className="mt-2 grid gap-1 text-[11px] uppercase tracking-wide text-slate-600 sm:grid-cols-2">
          <span>
            <strong className="mr-2 text-[10px] text-[#181818]">
              Passport ID:
            </strong>
            {passportNumber ?? "—"}
          </span>
          <span>
            <strong className="mr-2 text-[10px] text-[#181818]">
              Microchip:
            </strong>
            {microchipNumber ?? "—"}
          </span>
        </div>
      </header>
      <IncidentFieldError message={errors.horseId} />
      <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
        Incident type
        <Select
          value={value.incidentType}
          disabled={disabled}
          onValueChange={(next) =>
            update("incidentType", next as HorseIncidentType)
          }
        >
          <SelectTrigger className="min-h-12 w-full rounded-[2px] bg-white text-base">
            <SelectValue placeholder="Select incident type" />
          </SelectTrigger>
          <SelectContent className="rounded-[2px]">
            {Object.values(HORSE_INCIDENT_TYPE).map((type) => (
              <SelectItem key={type} value={type}>
                {HORSE_INCIDENT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IncidentFieldError message={errors.incidentType} />
      </label>
      <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
        Condition description{" "}
        <span className="font-normal text-slate-500">
          Minimum 10 characters
        </span>
        <textarea
          value={value.conditionDescription}
          aria-invalid={Boolean(errors.conditionDescription)}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) =>
            update("conditionDescription", event.target.value)
          }
          className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-28 rounded-[2px] border border-slate-300 p-3 text-base"
        />
        <IncidentFieldError message={errors.conditionDescription} />
      </label>
      <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
        Symptoms
        <textarea
          value={value.symptoms}
          aria-invalid={Boolean(errors.symptoms)}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => update("symptoms", event.target.value)}
          className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
        />
        <IncidentFieldError message={errors.symptoms} />
      </label>
      <VitalSignsFields
        value={value}
        onChange={(next) => onChange({ ...value, ...next })}
        warnings={warnings}
        disabled={disabled}
        errors={errors}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["veterinarianRequired", "Veterinarian required"],
            ["isolationRequired", "Isolation required"],
          ] as const
        ).map(([field, label]) => (
          <label
            key={field}
            className="flex min-h-12 items-center gap-3 border border-slate-200 px-3 text-sm font-semibold"
          >
            <Checkbox
              checked={value[field]}
              disabled={disabled}
              onCheckedChange={(checked) => update(field, checked === true)}
              className="size-5 shrink-0 rounded-[2px]"
            />
            {label}
          </label>
        ))}
      </div>
      <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
        First aid provided
        <textarea
          value={value.firstAidProvided}
          aria-invalid={Boolean(errors.firstAidProvided)}
          maxLength={2000}
          disabled={disabled}
          onChange={(event) => update("firstAidProvided", event.target.value)}
          className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
        />
        <IncidentFieldError message={errors.firstAidProvided} />
      </label>
      <div className="space-y-4">
        <div
          className="@container grid min-w-0 content-start gap-2 text-sm font-bold"
          data-incident-field
        >
          <span>Veterinarian contacted at</span>
          <span className="text-xs font-normal text-slate-500">
            Your local time. Sent as{" "}
            {contactedUtc ? formatUtcDateTime(contactedUtc) : "UTC"}.
          </span>
          <div className="grid min-w-0 items-start gap-2 @min-[20rem]:grid-cols-[minmax(0,1fr)_9rem]">
            <DatePicker
              value={contactedDate}
              onChange={updateContactedDate}
              disabled={disabled}
              placeholder="DD / MM / YYYY"
              className="h-9 rounded-[2px] text-sm"
            />
            <TimePicker
              value={contactedTime}
              onChange={updateContactedTime}
              disabled={disabled}
              label="Veterinarian contacted time"
              labelClassName="sr-only"
              className="h-9 rounded-[2px] text-sm"
            />
          </div>
          <IncidentFieldError message={errors.veterinarianContactedAt} />
        </div>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
          Veterinarian instruction
          <textarea
            value={value.veterinarianInstruction}
            aria-invalid={Boolean(errors.veterinarianInstruction)}
            maxLength={2000}
            disabled={disabled}
            onChange={(event) =>
              update("veterinarianInstruction", event.target.value)
            }
            className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
          />
          <IncidentFieldError message={errors.veterinarianInstruction} />
        </label>
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
          Medication given
          <textarea
            value={value.medicationGiven}
            aria-invalid={Boolean(errors.medicationGiven)}
            maxLength={2000}
            disabled={disabled}
            onChange={(event) => update("medicationGiven", event.target.value)}
            className="w-full min-w-0 max-w-full resize-y outline-none focus:border-[#f39200] min-h-24 rounded-[2px] border border-slate-300 p-3 text-base"
          />
          <IncidentFieldError message={errors.medicationGiven} />
        </label>
        <label className="grid min-w-0 content-start self-start gap-2 text-sm font-bold">
          Horse transportable
          <Select
            value={
              value.horseTransportable === null
                ? ""
                : String(value.horseTransportable)
            }
            disabled={disabled}
            onValueChange={(next) =>
              update(
                "horseTransportable",
                next === "unknown" ? null : next === "true",
              )
            }
          >
            <SelectTrigger className="min-h-12 w-full rounded-[2px] bg-white text-base">
              <SelectValue placeholder="Needs monitoring" />
            </SelectTrigger>
            <SelectContent className="rounded-[2px]">
              <SelectItem value="unknown">Needs monitoring</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
          <IncidentFieldError message={errors.horseTransportable} />
        </label>
      </div>
    </section>
  );
}
