import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";

export function ApproveDocumentDialog({ open, documentName, versionNo, isPending, canApprove, onCancel, onConfirm }: {
  open: boolean;
  documentName: string;
  versionNo: number;
  isPending: boolean;
  canApprove: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(value) => !value && !isPending && onCancel()}>
      <AlertDialogContent className="rounded-[2px] bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl">Approve and verify this document?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left" asChild>
            <div><p className="font-semibold text-slate-900">{documentName} · Version v{versionNo}</p><p>DocumentReview will be recorded as APPROVED. The requirement will become SATISFIED. Approved documents are locked from replacement under current rules.</p></div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" className="rounded-[2px]" disabled={isPending} onClick={onCancel}>Cancel</Button>
          <Button className="rounded-[2px]" disabled={isPending || !canApprove} onClick={onConfirm}>{isPending ? "Approving…" : "Confirm Approval"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
