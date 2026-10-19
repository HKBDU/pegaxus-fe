import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useDocumentReview } from "../hooks/useDocumentReview";
import { mapDocumentReviewError } from "../lib/document-review";
import type { ComplianceDocumentDetail } from "../types";

export function RevokeDocumentReviewDialog({
  dossierId,
  requirementId,
  document,
  onClose,
}: {
  dossierId: string;
  requirementId: string;
  document: ComplianceDocumentDetail;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<3 | 5>(3);
  const mutation = useDocumentReview();
  const latest = document.versions[0];
  const review = latest?.review;
  async function revoke() {
    if (
      !latest ||
      review?.result !== "APPROVED" ||
      !reason.trim() ||
      mutation.isPending
    )
      return;
    try {
      const attempt = await mutation.revoke({
        dossierId,
        requirementId,
        documentId: String(document.complianceDocumentId),
        versionId: latest.documentVersionId,
        reviewId: String(review.documentReviewId),
        review: { status, reason: reason.trim() },
      });
      if (!attempt.started) return;
      toast.success(attempt.value.message);
      onClose();
    } catch (error) {
      toast.error(mapDocumentReviewError(error).message);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
    >
      <DialogContent
        showCloseButton={!mutation.isPending}
        onEscapeKeyDown={(event) =>
          mutation.isPending && event.preventDefault()
        }
        onPointerDownOutside={(event) =>
          mutation.isPending && event.preventDefault()
        }
        className="rounded-[2px]"
      >
        <DialogHeader>
          <DialogTitle className="font-heading uppercase">
            Revoke Document Approval
          </DialogTitle>
          <DialogDescription>
            Record a reason and return this requirement to Provided or Rejected.
            Existing review history remains available.
          </DialogDescription>
        </DialogHeader>
        <label className="space-y-2 text-sm">
          Requirement status
          <Select
            value={String(status)}
            onValueChange={(value) => setStatus(value === "5" ? 5 : 3)}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="w-full rounded-[2px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Provided</SelectItem>
              <SelectItem value="5">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-sm">
          Reason *
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            disabled={mutation.isPending}
            className="rounded-[2px]"
          />
        </label>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending || !reason.trim()}
            onClick={() => void revoke()}
          >
            {mutation.isPending ? "Revoking…" : "Revoke Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
