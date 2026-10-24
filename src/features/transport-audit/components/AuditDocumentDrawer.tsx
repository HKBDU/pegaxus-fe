import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {url ? (
          <iframe title={title} src={url} className="min-h-0 flex-1 border-0" />
        ) : (
          <p className="p-4 text-sm text-slate-500">No preview available.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
