import { Circle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { dossierStatusLabels, dossierStatusStyles } from "../constants";

export function DossierStatusBadge({ status }: { status: keyof typeof dossierStatusLabels }) {
  return (
    <Badge variant="outline" className={`inline-flex h-5 items-center gap-1 rounded-full px-1.5 py-0 text-[0.65rem] font-medium leading-none ${dossierStatusStyles[status]}`}>
      <Circle aria-hidden="true" className="size-1! fill-current" />
      {dossierStatusLabels[status]}
    </Badge>
  );
}
