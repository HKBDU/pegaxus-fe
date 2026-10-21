import { useEffect, useId, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import type {
  CostEvidencePreview,
  MockCostEvidence,
} from "../mocks/repository";

export function CostEvidenceGallery({
  photos,
}: {
  photos: readonly CostEvidencePreview[];
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className="min-w-0 rounded-xs border border-border bg-muted/20 p-2"
        >
          <a
            href={photo.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xs focus-visible:outline focus-visible:outline-2"
            aria-label={`Open ${photo.caption}`}
          >
            <img
              src={photo.url}
              alt={photo.caption}
              className="aspect-[4/3] w-full object-contain"
            />
          </a>
          <p className="mt-2 mb-0 text-xs break-words text-muted-foreground">
            {photo.caption}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function MockCostPhotoPicker({
  photos,
  onChange,
  disabled,
}: {
  photos: readonly MockCostEvidence[];
  onChange: (photos: MockCostEvidence[]) => void;
  disabled: boolean;
}) {
  const inputId = useId();
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<CostEvidencePreview[]>([]);
  useEffect(() => {
    const next = photos.map((photo) => ({
      id: photo.publicId,
      caption: photo.file.name,
      url: URL.createObjectURL(photo.file),
    }));
    setPreviews(next);
    return () => next.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, [photos]);
  return (
    <div className="space-y-3">
      <Label htmlFor={inputId}>Local mock photos</Label>
      <Input
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/png"
        disabled={disabled}
        className="min-h-11 rounded-xs"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (
            photos.length + selected.length > 5 ||
            selected.some(
              (file) =>
                !["image/jpeg", "image/png"].includes(file.type) ||
                file.size > 5 * 1024 * 1024 ||
                file.size === 0,
            )
          ) {
            setError(
              "Use up to five non-empty JPG/PNG images, at most 5 MB each. No files from this selection were added.",
            );
            return;
          }
          setError("");
          onChange([
            ...photos,
            ...selected.map((file) => ({
              file,
              publicId: `mock-evidence:${crypto.randomUUID()}`,
            })),
          ]);
        }}
      />
      <p className="m-0 text-xs text-muted-foreground">
        Mock references stay in this browser session. These files are not
        uploaded to storage.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <CostEvidenceGallery photos={previews} />
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <Button
            key={photo.publicId}
            type="button"
            variant="outline"
            disabled={disabled}
            className="min-h-11 max-w-full rounded-xs whitespace-normal break-all"
            onClick={() =>
              onChange(
                photos.filter((entry) => entry.publicId !== photo.publicId),
              )
            }
          >
            Remove {photo.file.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
