import {
  IncidentCommonForm,
  type IncidentCommonFormValue,
} from "../IncidentCommonForm";
import { IncidentSubmitBar } from "../IncidentSubmitBar";
import {
  VehicleIncidentFields,
  type VehicleIncidentFieldsValue,
} from "./VehicleIncidentFields";
import type { IncidentPhotoFieldValue } from "../IncidentPhotoField";

export interface VehicleIncidentFormValue
  extends IncidentCommonFormValue, VehicleIncidentFieldsValue {
  transportId: string;
  vehicleId: string;
}
export interface VehicleIncidentFormProps {
  value: VehicleIncidentFormValue;
  photos: IncidentPhotoFieldValue;
  onChange: (value: VehicleIncidentFormValue) => void;
  onPhotosChange: (value: IncidentPhotoFieldValue) => void;
  onSubmit: () => void;
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

export function VehicleIncidentForm({
  value,
  photos,
  onChange,
  onPhotosChange,
  onSubmit,
  disabled = false,
  submitting = false,
  error,
  locationStatus,
  locationError,
}: VehicleIncidentFormProps) {
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
      />
      <VehicleIncidentFields
        value={value}
        onChange={(next) => onChange({ ...value, ...next })}
        disabled={disabled}
      />
      <IncidentSubmitBar
        isSubmitting={submitting}
        disabled={disabled}
        error={error}
      />
    </form>
  );
}
