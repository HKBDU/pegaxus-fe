import type { IncidentReportDetailsValue } from "./IncidentReportDetailsForm";
import { IncidentReportDetailsForm } from "./IncidentReportDetailsForm";
import {
  IncidentLocationField,
  type IncidentLocationValue,
} from "./IncidentLocationField";
import {
  IncidentPhotoField,
  type IncidentPhotoFieldValue,
} from "./IncidentPhotoField";
import type { IncidentLocationStatus } from "../hooks/useIncidentLocation";
import type { IncidentFieldErrors } from "../validation";
import { IncidentFieldError } from "./IncidentFieldError";

export interface IncidentCommonFormValue
  extends IncidentReportDetailsValue, IncidentLocationValue {
  description: string;
}

export interface IncidentCommonFormProps {
  value: IncidentCommonFormValue;
  photos: IncidentPhotoFieldValue;
  onChange: (value: IncidentCommonFormValue) => void;
  onPhotosChange: (value: IncidentPhotoFieldValue) => void;
  disabled?: boolean;
  showPhotos?: boolean;
  showDescription?: boolean;
  errors?: IncidentFieldErrors;
  maxPhotos?: number;
  photoError?: string | null;
  locationStatus?: IncidentLocationStatus;
  locationError?: string | null;
  onPhotoUploadStateChange?: (state: "idle" | "uploading" | "ready" | "error") => void;
  onPhotoError?: (message: string | null) => void;
}

export function IncidentCommonForm({
  value,
  photos,
  onChange,
  onPhotosChange,
  disabled = false,
  showPhotos = true,
  showDescription = true,
  errors = {},
  maxPhotos = 5,
  photoError,
  locationStatus = "idle",
  locationError,
  onPhotoUploadStateChange,
  onPhotoError,
}: IncidentCommonFormProps) {
  return (
    <div className="space-y-5">
      <IncidentReportDetailsForm
        value={value}
        onChange={(next) => onChange({ ...value, ...next })}
        disabled={disabled}
        errors={errors}
      />
      {showDescription && (
        <label className="block min-w-0 space-y-2 text-sm text-slate-900">
          <span className="font-bold">
            Description <span className="text-red-600">*</span>
          </span>
          <textarea
            value={value.description}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, description: event.target.value })
            }
            placeholder="Describe what happened"
            maxLength={2000}
            aria-invalid={Boolean(errors.description)}
            className="min-h-28 w-full min-w-0 max-w-full resize-y rounded-[2px] border border-slate-300 bg-white p-3 text-base outline-none focus:border-[#f39200]"
          />
          <IncidentFieldError message={errors.description} />
          <span className="block text-right text-xs text-slate-500">
            {value.description.length}/2000
          </span>
        </label>
      )}
      <IncidentLocationField
        value={value}
        status={locationStatus}
        error={locationError}
        errors={errors}
      />
      {showPhotos && (
        <IncidentPhotoField
          value={photos}
          onChange={onPhotosChange}
          disabled={disabled}
          maxFiles={maxPhotos}
          error={photoError}
          onUploadStateChange={onPhotoUploadStateChange}
          onError={onPhotoError}
        />
      )}
    </div>
  );
}
