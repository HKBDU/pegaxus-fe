import type { ComponentType } from "react";
import { EmptyState } from "@/shared/components/common";
import { Section } from "./ApprovedBookingDetails";

export type PersonnelPanelProps = { transportPlanId: string };

// UC-36 belongs to personnel. Pass its public export here once the owner supplies it.
export function TransportPlanPersonnel({
  transportPlanId,
  panel: Panel,
}: {
  transportPlanId: string;
  panel?: ComponentType<PersonnelPanelProps>;
}) {
  return Panel ? (
    <Panel transportPlanId={transportPlanId} />
  ) : (
    <Section title="Personnel">
      <EmptyState message="Personnel assignment is not available yet. This tab is ready for the UC-36 PersonnelAssignmentPanel integration." />
    </Section>
  );
}
