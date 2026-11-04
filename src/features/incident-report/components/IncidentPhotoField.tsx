import { PhotoCaptureSection } from "@/shared/components/PhotoCaptureSection";

export interface IncidentPhotoFieldValue {
  files: File[];
  capturedAt: (Date | null)[];
  coordinates: ({ latitude: number; longitude: number } | null)[];
  captions: string[];
  uploadedPublicIds: string[];
}

export interface IncidentPhotoFieldProps {
  value: IncidentPhotoFieldValue;
  onChange: (value: IncidentPhotoFieldValue) => void;
  disabled?: boolean;
  maxFiles?: number;
  error?: string | null;
  onUploadStateChange?: (state: "idle" | "uploading" | "ready" | "error") => void;
  onError?: (message: string | null) => void;
}

export function IncidentPhotoField({
  value,
  onChange,
  disabled = false,
  maxFiles = 5,
  error,
  onUploadStateChange,
  onError,
}: IncidentPhotoFieldProps) {
  return (
    <fieldset disabled={disabled}>
      <PhotoCaptureSection
        files={value.files}
        maxFiles={maxFiles}
        capturedAt={value.capturedAt}
        coordinates={value.coordinates}
        captions={value.captions}
        error={error}
        documentLabel="Incident photos"
        statusLabel="Ready for incident report"
        presignedEntity="attachment"
        onFilesChange={(files) => onChange({ ...value, files })}
        onCapturedAtChange={(capturedAt) => onChange({ ...value, capturedAt })}
        onCoordinatesChange={(coordinates) =>
          onChange({ ...value, coordinates })
        }
        onCaptionsChange={(captions) => onChange({ ...value, captions })}
        onUploadedPublicIdsChange={(uploadedPublicIds) =>
          onChange({ ...value, uploadedPublicIds })
        }
        onUploadStateChange={onUploadStateChange}
        onError={onError}
      />
    </fieldset>
  );
}
