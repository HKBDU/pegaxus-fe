import { DateTimeUtc } from "@/shared/components/DateTimeUtc";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  useAddDocumentRequestComment,
  useDocumentRequestComments,
} from "../hooks/useDocumentRequests";
import { mapDocumentReviewError } from "../lib/document-review";
import { DocumentRequestAlert } from "./DocumentRequestAlert";
import type { DocumentRequestSummary } from "../types";

export function DocumentRequestComments({
  dossierId,
  requirementId,
  request,
  canComment,
  canReadComments,
  showRequestSummary = true,
}: {
  dossierId: string;
  requirementId: string;
  request: DocumentRequestSummary;
  canComment: boolean;
  canReadComments: boolean;
  showRequestSummary?: boolean;
}) {
  const query = useDocumentRequestComments(
    dossierId,
    requirementId,
    String(request.documentRequestId),
    canReadComments,
  );
  const mutation = useAddDocumentRequestComment();
  const [message, setMessage] = useState("");
  const running = useRef(false);
  async function send() {
    if (running.current || !canComment || !message.trim()) return;
    running.current = true;
    try {
      await mutation.mutateAsync({
        dossierId,
        requirementId,
        requestId: String(request.documentRequestId),
        message: message.trim(),
      });
      setMessage("");
      toast.success("Comment added.");
    } catch (error) {
      toast.error(mapDocumentReviewError(error).message);
    } finally {
      running.current = false;
    }
  }
  return (
    <section
      className="min-w-0 space-y-3 border-t border-border pt-4 [overflow-wrap:anywhere]"
      aria-label={`Request ${request.requestCode}`}
    >
      {showRequestSummary ? (
        <DocumentRequestAlert request={request} />
      ) : (
        <h3 className="text-sm font-semibold">Discussion</h3>
      )}
      {canReadComments ? (
        query.isPending ? (
          <p role="status" className="text-xs">
            Loading comments…
          </p>
        ) : query.isError ? (
          <div
            role="alert"
            className="space-y-2 rounded-[2px] border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <p>
              Comments could not be loaded. The document request above is still
              available.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              Retry comments
            </Button>
          </div>
        ) : !query.data?.length ? (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        ) : (
          <ul className="space-y-2">
            {query.data?.map((comment) => (
              <li
                key={comment.documentRequestCommentId}
                className="border-l-2 border-primary/30 pl-3 text-xs"
              >
                <p className="whitespace-pre-wrap break-words">
                  {comment.message}
                </p>
                <time className="text-muted-foreground">
                  <DateTimeUtc value={comment.createdAt} compact />
                </time>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {canComment ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="space-y-2"
        >
          <label className="block text-xs font-semibold">
            Add comment
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              disabled={mutation.isPending}
              className="mt-2 rounded-[2px] text-sm"
            />
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={mutation.isPending || !message.trim()}
          >
            {mutation.isPending ? "Sending…" : "Send Comment"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
