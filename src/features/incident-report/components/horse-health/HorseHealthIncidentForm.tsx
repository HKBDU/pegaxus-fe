import {
  IncidentCommonForm,
  type IncidentCommonFormValue,
} from "../IncidentCommonForm";
import { IncidentSubmitBar } from "../IncidentSubmitBar";
import {
  HorseHealthFields,
  type HorseHealthFieldsValue,
} from "./HorseHealthFields";
import type { IncidentPhotoFieldValue } from "../IncidentPhotoField";
import { IncidentPhotoField } from "../IncidentPhotoField";
import type { HorseHealthOverviewItem } from "@/features/horse-health/types";

export interface HorseHealthIncidentFormValue extends IncidentCommonFormValue {
  transportId: string;
  horses: Record<string, HorseHealthFieldsValue>;
}
export interface HorseHealthIncidentFormProps {
  value: HorseHealthIncidentFormValue;
  horses: HorseHealthOverviewItem[];
  photos: IncidentPhotoFieldValue;
  onChange: (value: HorseHealthIncidentFormValue) => void;
  onPhotosChange: (value: IncidentPhotoFieldValue) => void;
  onSubmit: () => void;
  warnings?: string[];
  disabled?: boolean;
  submitting?: boolean;
  error?: string | null;
  locationStatus?:
    | "idle"
    | "locating"
    | "reading"
    | "creating"
    | "ready"
    | "unavailable"
    | "error";
  locationError?: string | null;
}

export function HorseHealthIncidentForm({
  value,
  horses,
  photos,
  onChange,
  onPhotosChange,
  onSubmit,
  warnings,
  disabled = false,
  submitting = false,
  error,
  locationStatus,
  locationError,
}: HorseHealthIncidentFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-5"
    >
      <IncidentCommonForm
        value={value}
        photos={photos}
        onChange={(next) => onChange({ ...value, ...next })}
        onPhotosChange={onPhotosChange}
        disabled={disabled}
        photoError={error}
        locationStatus={locationStatus}
        locationError={locationError}
        showPhotos={false}
      />
      <section
        className="space-y-4"
        aria-label="Selected horses incident details"
      >
        <div>
          <h2 className="font-heading text-lg font-bold text-[#181818]">
            Horse details
          </h2>
          <p className="text-sm text-slate-600">
            Complete the incident information for each selected horse.
          </p>
        </div>
        {horses.map((horse) => (
          <HorseHealthFields
            key={horse.horse.horseId}
            value={value.horses[horse.horse.horseId]}
            onChange={(next) =>
              onChange({
                ...value,
                horses: {
                  ...value.horses,
                  [horse.horse.horseId]: next,
                },
              })
            }
            horseName={horse.horse.horseName}
            passportNumber={horse.horse.passportNumber}
            microchipNumber={horse.horse.microchipNumber}
            warnings={warnings}
            disabled={disabled}
          />
        ))}
      </section>
      <IncidentPhotoField
        value={photos}
        onChange={onPhotosChange}
        disabled={disabled}
        maxFiles={10}
        error={error}
      />
      <IncidentSubmitBar
        isSubmitting={submitting}
        disabled={disabled}
        error={error}
      />
    </form>
  );
}
