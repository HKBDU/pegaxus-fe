import { lazy, Suspense, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { getDossierFilePreview } from "../lib/document-preview";
import type { DocumentVersionFile } from "../types";

// Load shared renderers only when a file is inspected (including history versions).
const PdfViewer = lazy(() => import("@/shared/components/file-viewer/PdfViewer").then((module) => ({ default: module.PdfViewer })));
const ImageViewer = lazy(() => import("@/shared/components/file-viewer/ImageViewer"));

export function DocumentFilesPreview({ files }: { files: DocumentVersionFile[] }) {
  const ordered = [...files].sort((a, b) => a.sortOrder - b.sortOrder);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const file = ordered[selectedIndex] ?? ordered[0];
  if (!file) return <p className="text-sm text-slate-500">No files are available in this version.</p>;
  const preview = getDossierFilePreview(file);
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Version files">
        {ordered.map((item, index) => <Button key={`${item.sortOrder}-${index}`} type="button" size="sm"
          variant={item === file ? "default" : "outline"} aria-pressed={item === file} onClick={() => setSelectedIndex(index)}
          className="h-auto max-w-full whitespace-normal rounded-[2px] break-all text-xs">
          {index + 1}. {item.fileName}
        </Button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="min-w-0 break-all text-slate-600">{file.fileName} · {file.mimeType} · {(file.fileSizeBytes / 1024).toFixed(0)} KB</p>
        {preview.href ? <Button asChild size="sm" variant="outline" className="rounded-[2px]">
          <a href={preview.href} target="_blank" rel="noopener noreferrer">Open File <ExternalLink aria-hidden="true" className="size-3.5" /></a>
        </Button> : null}
      </div>
      <div className="h-[45svh] min-h-56 min-w-0 overflow-hidden rounded-[2px] border border-slate-200 bg-slate-100 lg:h-[65svh]" aria-label="Document preview">
        <Suspense fallback={<p role="status" className="p-4 text-sm text-slate-500">Loading file preview…</p>}>
          {preview.kind === "pdf" && preview.href ? <PdfViewer key={preview.href} url={preview.href} fileName={file.fileName} size={file.fileSizeBytes} />
            : preview.kind === "image" && preview.href ? <ImageViewer key={preview.href} height="100%" width="100%"
              images={[{ src: preview.href, size: file.fileSizeBytes, alt: file.fileName, download: { url: preview.href, filename: file.fileName } }]} />
              : <p role="status" className="p-4 text-sm text-slate-600">{preview.reason}</p>}
        </Suspense>
      </div>
    </div>
  );
}
