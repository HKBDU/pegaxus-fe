import { useLayoutEffect, useRef, useState } from "react";
import {
  PhotoCaptureSection,
  type PhotoUploadState,
  type UploadedPhoto,
} from "@/shared/components/PhotoCaptureSection";

export interface IncidentPhotoFieldValue {
  files: File[];
  capturedAt: (Date | null)[];
  coordinates: ({ latitude: number; longitude: number } | null)[];
  captions: string[];
  uploadedPublicIds: string[];
  uploadState?: PhotoUploadState;
  uploadedPhotos?: UploadedPhoto[];
}

export interface IncidentPhotoFieldProps {
  value: IncidentPhotoFieldValue;
  onChange: (value: IncidentPhotoFieldValue) => void;
  disabled?: boolean;
  maxFiles?: number;
  error?: string | null;
}

export function IncidentPhotoField({
  value,
  onChange,
  disabled = false,
  maxFiles = 5,
  error,
}: IncidentPhotoFieldProps) {
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // Several metadata callbacks run in the same turn. Merge against the latest
  // update, rather than spreading the same render's stale value each time.
  const patch = (next: Partial<IncidentPhotoFieldValue>) => {
    latest.current = { ...latest.current, ...next };
    onChange(latest.current);
  };
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <PhotoCaptureSection
        files={value.files}
        maxFiles={maxFiles}
        capturedAt={value.capturedAt}
        coordinates={value.coordinates}
        captions={value.captions}
        error={photoError ?? error}
        onError={setPhotoError}
        documentLabel="Incident photos"
        statusLabel="Ready for incident report"
        presignedEntity="attachment"
        uploadedPublicIds={value.uploadedPublicIds}
        uploadedPhotos={value.uploadedPhotos}
        onUploadedPhotosChange={(uploadedPhotos) => patch({ uploadedPhotos })}
        onFilesChange={(files) => patch({ files })}
        onCapturedAtChange={(capturedAt) => patch({ capturedAt })}
        onCoordinatesChange={(coordinates) => patch({ coordinates })}
        onCaptionsChange={(captions) => patch({ captions })}
        onUploadedPublicIdsChange={(uploadedPublicIds) =>
          patch({ uploadedPublicIds })
        }
        onUploadStateChange={(uploadState) => patch({ uploadState })}
      />
    </fieldset>
  );
}
