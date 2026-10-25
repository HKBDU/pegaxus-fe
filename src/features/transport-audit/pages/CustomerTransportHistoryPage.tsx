import { useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import {
  ErrorState,
  LoadingState,
  EmptyState,
} from "@/shared/components/common";
import { useTransportAudit } from "../hooks/useTransportAudit";
import { AuditTimeline } from "../components/AuditTimeline";
import { CustomerTransportAuditSummary } from "../components/CustomerTransportAuditSummary";
export default function CustomerTransportHistoryPage() {
  const { bookingId = "", transportId = "" } = useParams();
  const query = useTransportAudit(transportId, "booking,timeline");
  if (query.isPending) return <LoadingState />;
  if (query.isError)
    return (
      <main className="p-8">
        <ErrorState
          message="Unable to load transport history."
          onRetry={() => void query.refetch()}
        />
      </main>
    );
  const audit = query.data;
  if (!audit) return <EmptyState message="Transport history was not found." />;
  return (
    <main className="min-h-screen bg-[#f4f2ed] px-5 py-8 lg:px-10">
      <div className="mx-auto max-w-[1000px] space-y-5">
        <PageHeader
          title="TRANSPORT HISTORY"
          backHref={`/bookings/${encodeURIComponent(bookingId)}`}
        />
        <CustomerTransportAuditSummary bookingId={bookingId} audit={audit} />
        <section className="rounded-[2px] border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold uppercase">
            Journey timeline
          </h2>
          <AuditTimeline items={audit.timeline} publicOnly />
        </section>
      </div>
    </main>
  );
}
