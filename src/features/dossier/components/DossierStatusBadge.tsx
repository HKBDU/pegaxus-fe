import type {
  DossierRequirementStatus,
  DossierStatus,
} from "@/features/dossier/types";
import { StatusBadge } from "@/shared/components/ui/status-badge";
import { dossierStatusLabels, dossierStatusStyles } from "../constants";

type BadgeStatus = DossierStatus | DossierRequirementStatus | "EXPIRED";

export function DossierStatusBadge({
  status,
  className,
}: {
  status: BadgeStatus;
  className?: string;
}) {
  return (
    <StatusBadge className={`${dossierStatusStyles[status]} ${className ?? ""}`.trim()}>
      {dossierStatusLabels[status]}
    </StatusBadge>
  );
}
