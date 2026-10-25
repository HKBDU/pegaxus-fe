import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import apiClient from "@/lib/axios";
import { Button } from "@/shared/components/ui/button";
import { MAX_IMAGE_FILE_SIZE } from "@/shared/constants/viewer";
import { getDossierFilePreview } from "../lib/document-preview";
import { getProtectedPreviewPath } from "../lib/protected-preview";
import type { DocumentVersionFile } from "../types";

const PdfViewer = lazy(() =>
  import("@/shared/components/file-viewer/PdfViewer").then((module) => ({
    default: module.PdfViewer,
  })),
);
const ImageViewer = lazy(
  () => import("@/shared/components/file-viewer/ImageViewer"),
);

function isGalleryImage(file: DocumentVersionFile) {
  return (
    (file.mimeType === "image/jpeg" || file.mimeType === "image/png") &&
    file.fileSizeBytes !== null &&
    file.fileSizeBytes <= MAX_IMAGE_FILE_SIZE
  );
}

function ProtectedFilePreview({ files }: { files: DocumentVersionFile[] }) {
  const file = files[0];
  const [resources, setResources] = useState<
    | {
        url: string;
        size: number;
        mimeType: string;
      }[]
    | null
  >(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const objectUrls: string[] = [];
    async function load() {
      try {
        const loaded = await Promise.all(
          files.map(async (item) => {
            const blob = await apiClient.get<Blob, Blob>(
              getProtectedPreviewPath(item.fileUrl),
              { responseType: "blob", signal: controller.signal },
            );
            controller.signal.throwIfAborted();
            if (!(blob instanceof Blob))
              throw new Error("Invalid preview response.");
            const url = URL.createObjectURL(blob);
            objectUrls.push(url);
            const resource = {
              url,
              size: blob.size,
              mimeType: blob.type || item.mimeType || "",
            };
            if (
              files.length > 1 &&
              getDossierFilePreview(
                {
                  ...item,
                  fileSizeBytes: resource.size,
                  mimeType: resource.mimeType,
                },
                url,
              ).kind !== "image"
            )
              throw new Error("An image is not available for gallery preview.");
            return resource;
          }),
        );
        if (!controller.signal.aborted) setResources(loaded);
      } catch {
        if (!controller.signal.aborted) {
          controller.abort();
          objectUrls.forEach((url) => URL.revokeObjectURL(url));
          setError(true);
        }
      }
    }
    void load();
    return () => {
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files, attempt]);

  const resource = resources?.[0];
  const preview = resource
    ? getDossierFilePreview(
        { ...file, fileSizeBytes: resource.size, mimeType: resource.mimeType },
        resource.url,
      )
    : null;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="min-w-0 break-all text-slate-600">
          {files.length > 1
            ? `${files.length} images in this document version`
            : `${file.fileName} · ${file.mimeType}`}
        </p>
        {resource ? (
          <Button asChild size="sm" variant="outline" className="rounded-[2px]">
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              {files.length > 1 ? "Open first image" : "Open File"}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          </Button>
        ) : null}
      </div>
      <div
        className="h-[45svh] min-h-56 min-w-0 overflow-hidden rounded-[2px] border border-slate-200 bg-slate-100 lg:h-[65svh]"
        aria-label="Document preview"
      >
        {error ? (
          <div role="alert" className="space-y-3 p-4 text-sm text-red-700">
            <p>Could not load the protected preview.</p>
            <Button
              variant="outline"
              onClick={() => {
                setError(false);
                setAttempt((value) => value + 1);
              }}
            >
              Retry preview
            </Button>
          </div>
        ) : !resources || !resource ? (
          <p role="status" className="p-4 text-sm text-slate-500">
            Loading protected preview…
          </p>
        ) : (
          <Suspense
            fallback={
              <p role="status" className="p-4 text-sm text-slate-500">
                Loading file viewer…
              </p>
            }
          >
            {preview?.kind === "pdf" ? (
              <PdfViewer
                url={resource.url}
                fileName={file.fileName}
                size={resource.size}
              />
            ) : preview?.kind === "image" ? (
              <ImageViewer
                height="100%"
                width="100%"
                ariaLabel="Images in this document version"
                images={resources.map((item, index) => ({
                  src: item.url,
                  size: item.size,
                  title: `${index + 1} / ${files.length} · ${files[index].fileName}`,
                  alt: files[index].fileName,
                  download: { url: item.url, filename: files[index].fileName },
                }))}
              />
            ) : (
              <p role="status" className="p-4 text-sm text-slate-600">
                {preview?.reason}
              </p>
            )}
          </Suspense>
        )}
      </div>
    </>
  );
}

export function DocumentFilesPreview({
  files,
}: {
  files: DocumentVersionFile[];
}) {
  const ordered = useMemo(
    () => [...files].sort((a, b) => a.sortOrder - b.sortOrder),
    [files],
  );
  const images = useMemo(() => ordered.filter(isGalleryImage), [ordered]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const file = ordered[selectedIndex] ?? ordered[0];
  const previewFiles = useMemo(
    () => (file ? (isGalleryImage(file) ? images : [file]) : []),
    [file, images],
  );
  if (!file)
    return (
      <p className="text-sm text-slate-500">
        No files are available in this version.
      </p>
    );
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Version files">
        {ordered
          .filter((item) => !isGalleryImage(item) || item === images[0])
          .map((item) => (
            <Button
              key={`${item.sortOrder}-${item.fileUrl}`}
              type="button"
              size="sm"
              variant={
                item === file || (isGalleryImage(item) && isGalleryImage(file))
                  ? "default"
                  : "outline"
              }
              aria-pressed={
                item === file || (isGalleryImage(item) && isGalleryImage(file))
              }
              onClick={() => setSelectedIndex(ordered.indexOf(item))}
              className="h-auto max-w-full whitespace-normal rounded-[2px] break-all text-xs"
            >
              {isGalleryImage(item) && images.length > 1
                ? `Images (${images.length})`
                : `${ordered.indexOf(item) + 1}. ${item.fileName}`}
            </Button>
          ))}
      </div>
      <ProtectedFilePreview
        key={previewFiles.map((item) => item.fileUrl).join("|")}
        files={previewFiles}
      />
    </div>
  );
}
