import { cn } from "@/lib/utils";
import type {
  DossierRequirementStatus,
  DossierStatus,
} from "@/features/dossier/types";
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
    <span
      className={cn(
        "inline-flex w-fit items-center whitespace-nowrap rounded-[2px] px-2 py-1 font-heading text-[0.62rem] font-semibold uppercase leading-none tracking-[0.06em]",
        dossierStatusStyles[status],
        className,
      )}
    >
      {dossierStatusLabels[status]}
    </span>
  );
}
