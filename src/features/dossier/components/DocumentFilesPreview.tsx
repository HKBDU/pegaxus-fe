import { lazy, Suspense, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import apiClient from "@/lib/axios";
import { Button } from "@/shared/components/ui/button";
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

function ProtectedFilePreview({ file }: { file: DocumentVersionFile }) {
  const [resource, setResource] = useState<{
    url: string;
    size: number;
    mimeType: string;
  } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const blob = await apiClient.get<Blob, Blob>(
          getProtectedPreviewPath(file.fileUrl),
          { responseType: "blob", signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!(blob instanceof Blob))
          throw new Error("Invalid preview response.");
        objectUrl = URL.createObjectURL(blob);
        setResource({
          url: objectUrl,
          size: blob.size,
          mimeType: blob.type || file.mimeType,
        });
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.fileUrl, file.mimeType, attempt]);

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
          {file.fileName} · {file.mimeType}
        </p>
        {resource ? (
          <Button asChild size="sm" variant="outline" className="rounded-[2px]">
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              Open File <ExternalLink aria-hidden="true" className="size-3.5" />
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
        ) : !resource ? (
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
                images={[
                  {
                    src: resource.url,
                    size: resource.size,
                    alt: file.fileName,
                    download: { url: resource.url, filename: file.fileName },
                  },
                ]}
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
  const ordered = [...files].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const file = ordered[selectedIndex] ?? ordered[0];
  if (!file)
    return (
      <p className="text-sm text-slate-500">
        No files are available in this version.
      </p>
    );
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Version files">
        {ordered.map((item, index) => (
          <Button
            key={`${item.sortOrder}-${index}`}
            type="button"
            size="sm"
            variant={item === file ? "default" : "outline"}
            aria-pressed={item === file}
            onClick={() => setSelectedIndex(index)}
            className="h-auto max-w-full whitespace-normal rounded-[2px] break-all text-xs"
          >
            {index + 1}. {item.fileName}
          </Button>
        ))}
      </div>
      <ProtectedFilePreview key={file.fileUrl} file={file} />
    </div>
  );
}
