import type { ComponentProps } from "react";
import { DocumentSubmissionDialog } from "./DocumentSubmissionDialog";

export function UploadComplianceDocumentDialog(
  props: Omit<ComponentProps<typeof DocumentSubmissionDialog>, "mode">,
) {
  return <DocumentSubmissionDialog {...props} mode="initial" />;
}
