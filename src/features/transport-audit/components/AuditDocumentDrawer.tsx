import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { PdfViewer } from "@/shared/components/file-viewer/PdfViewer";
import ImageViewer from "@/shared/components/file-viewer/ImageViewer";
export function AuditDocumentDrawer({
  open,
  onOpenChange,
  title = "Audit document",
  url,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  url?: string;
}) {
  const isPdf = Boolean(url && /\.pdf(?:$|[?#])/i.test(url));
  const isImage = Boolean(
    url && /\.(?:png|jpe?g|webp|gif)(?:$|[?#])/i.test(url),
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {url && isPdf ? (
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <PdfViewer url={url} fileName={title} />
          </div>
        ) : url && isImage ? (
          <div className="min-h-0 flex-1 p-4">
            <ImageViewer
              images={[{ src: url, title, alt: title }]}
              width="100%"
              height={560}
            />
          </div>
        ) : url ? (
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-primary underline"
            >
              Open document in a new tab
            </a>
          </div>
        ) : (
          <p className="p-4 text-sm text-slate-500">No preview available.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
