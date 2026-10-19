import { useParams } from "react-router-dom";
import { transportPlanDetail } from "@/app/route-config";
import { canAccess } from "@/features/auth/access-control";
import { useAuthStore } from "@/features/auth/store";
import { BookingDetailsSkeleton } from "@/features/booking/components/BookingPageSkeletons";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { Card, CardContent } from "@/shared/components/ui/card";
import { useTransportPlan } from "../hooks/useTransportPlans";
import { actionEntityIdSchema } from "../schemas";
import { getTransportPlanError } from "../services";
import { canEditTransportPlan } from "../transport-plan.form";
import { TransportPlanMetadataForm } from "../components/TransportPlanMetadataForm";
import { TransportPlanStatusBadge } from "../components/TransportPlanStatusBadge";
import { Field } from "../components/ApprovedBookingDetails";

export default function EditTransportPlanPage() {
  const { transportPlanId = "" } = useParams<{ transportPlanId: string }>();
  const principal = useAuthStore((state) => state.principal);
  const allowed = canAccess(principal, { anyRole: ["LOGISTICS_MANAGER"] });
  const query = useTransportPlan(transportPlanId, allowed);
  const plan = query.data;
  const error = query.isError ? getTransportPlanError(query.error) : null;
  return (
    <div className="flow3-ui booking-page-shell min-w-0 min-h-[calc(100svh-5rem)] px-4 py-4 font-sans sm:px-6 lg:py-6">
      <div className="mx-auto w-full min-w-0 max-w-[1152px] space-y-4">
        <PageHeader
          className="[&_h1]:text-2xl [&_h1]:leading-tight sm:[&_h1]:text-3xl"
          title="Edit Transport Plan"
          backHref={transportPlanDetail(transportPlanId)}
          backLabel="Back to Transport Plan"
        />
        {!allowed ? (
          <ErrorState message="Only Logistics Managers can edit transport plans." />
        ) : !actionEntityIdSchema.safeParse(transportPlanId).success ? (
          <ErrorState message="The transport plan identifier is invalid." />
        ) : error ? (
          <ErrorState
            message={error.message}
            onRetry={error.retryable ? () => void query.refetch() : undefined}
          />
        ) : query.isPending ? (
          <BookingDetailsSkeleton />
        ) : plan ? (
          <>
            <Card className="gap-0 rounded-[2px] border-slate-200 py-0 shadow-xs">
              <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
                <h2 className="m-0! shrink-0 font-heading text-base! leading-5! uppercase text-slate-900">
                  Plan Summary
                </h2>
                <dl className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
                  <Field label="Plan code">{plan.planCode}</Field>
                  <Field label="Status">
                    <TransportPlanStatusBadge status={plan.status} />
                  </Field>
                  <Field label="Booking">{plan.booking.bookingCode}</Field>
                </dl>
              </CardContent>
            </Card>
            {!canEditTransportPlan(principal, plan) ? (
              <ErrorState message="This transport plan is locked and cannot be edited." />
            ) : (
              <TransportPlanMetadataForm
                key={transportPlanId}
                bookingId={plan.booking.bookingId}
                plan={plan}
                cancelHref={transportPlanDetail(transportPlanId)}
                reloadLatest={async () => {
                  const result = await query.refetch();
                  if (result.error) throw result.error;
                  return result.data;
                }}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
