import { Button } from "@/shared/components/ui/button";
import type { PhotoUploadState } from "@/shared/components/PhotoCaptureSection";

export interface IncidentSubmitBarProps {
  submitLabel?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  error?: string | null;
  onCancel?: () => void;
  uploadState?: PhotoUploadState;
}

export function IncidentSubmitBar({
  submitLabel = "Submit incident report",
  isSubmitting = false,
  disabled = false,
  error,
  onCancel,
  uploadState,
}: IncidentSubmitBarProps) {
  return (
    <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur sm:z-10 sm:p-4 sm:shadow-none">
      {uploadState === "uploading" && (
        <p className="mb-2 text-xs text-slate-600" role="status">
          Preparing or uploading photos. Submit becomes available when every
          photo is uploaded.
        </p>
      )}
      {uploadState === "error" && (
        <p className="mb-2 text-xs text-red-600" role="status">
          Retry or remove failed photos before submitting.
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="mx-auto flex max-w-3xl flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
            className="min-h-12 rounded-[2px]"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={disabled || isSubmitting}
          className="min-h-12 rounded-[2px] bg-[#f39200] px-6 text-white hover:bg-[#d97f00]"
        >
          {isSubmitting ? "Submitting…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
