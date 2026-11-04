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
import { areIncidentPhotosReady } from "../../validation";
import { IncidentFieldError } from "../IncidentFieldError";
import type { IncidentFieldErrors } from "../../validation";

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
  errors?: IncidentFieldErrors;
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
  errors = {},
  locationStatus,
  locationError,
}: VehicleIncidentFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="min-w-0 space-y-5"
    >
      <IncidentFieldError
        message={errors.transportId && `Transport: ${errors.transportId}`}
      />
      <IncidentFieldError
        message={errors.vehicleId && `Vehicle: ${errors.vehicleId}`}
      />
      <IncidentCommonForm
        value={value}
        photos={photos}
        onChange={(next) => onChange({ ...value, ...next })}
        onPhotosChange={onPhotosChange}
        disabled={disabled}
        photoError={errors.photoFiles}
        errors={errors}
        locationStatus={locationStatus}
        locationError={locationError}
      />
      <VehicleIncidentFields
        value={value}
        onChange={(next) => onChange({ ...value, ...next })}
        disabled={disabled}
        errors={errors}
      />
      <IncidentSubmitBar
        isSubmitting={submitting}
        disabled={disabled || !areIncidentPhotosReady(photos)}
        error={error}
        uploadState={photos.files.length > 0 ? photos.uploadState : undefined}
      />
    </form>
  );
}
