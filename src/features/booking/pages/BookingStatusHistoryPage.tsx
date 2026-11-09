import { useLocation, useParams } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { ErrorState } from "@/shared/components/common";
import { useAuthStore } from "@/features/auth/store";
import {
  bookingHistoryDetailsPath,
  resolveBookingHistoryShell,
} from "../history/access";
import { BookingHistoryView } from "../components/history/BookingHistoryView";

export default function BookingStatusHistoryPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const roles = useAuthStore((state) => state.principal?.roles);

  if (!bookingId?.trim()) {
    return (
      <ErrorState message="A booking ID is required to view its history." />
    );
  }

  const detailsPath = bookingHistoryDetailsPath(
    bookingId,
    location.pathname.startsWith("/__dev/admin/")
      ? "admin"
      : location.pathname.startsWith("/__dev/customer/")
        ? "customer"
        : resolveBookingHistoryShell(roles) ?? "customer",
  );

  return (
    <div className="booking-page-shell min-h-[70dvh] min-w-0 px-4 py-8 font-sans text-slate-900 sm:px-6 lg:px-8 lg:py-10">
      <div className="booking-page-enter mx-auto w-full max-w-[1152px] space-y-6">
        <PageHeader
          title="Booking status history"
          backHref={detailsPath}
          backLabel="Back to booking details"
        />
        <BookingHistoryView key={`${bookingId}:${location.search}`} bookingId={bookingId} />
      </div>
    </div>
  );
}
