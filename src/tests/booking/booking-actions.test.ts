import { describe, expect, it } from "vitest";
import { getBookingActionAvailability } from "@/features/booking/lib/booking-actions";
import type { Booking } from "@/features/booking/types";
import type { BookingDossierLink } from "@/features/dossier/schemas";

const baseBooking: Booking = {
  bookingId: "b-123",
  bookingCode: "BK-2026-001",
  status: "APPROVED",
  statusName: "Approved",
  customer: {
    customerId: "c-1",
    fullName: "John Doe",
    phone: "123456789",
  },
  originAddress: "123 Origin St",
  originCountry: "Vietnam",
  originLatitude: 10.77,
  originLongitude: 106.69,
  destinationAddress: "456 Dest Rd",
  destinationCountry: "Cambodia",
  destinationLatitude: 11.55,
  destinationLongitude: 104.92,
  requestedDepartureDate: "2026-12-01",
  requestedArrivalDate: "2026-12-05",
  horses: [],
  totalHorses: 1,
  specialRequirements: null,
  customerNote: null,
  assignedEmployee: null,
  submittedAt: "2026-11-01T08:00:00Z",
  createdAt: "2026-11-01T08:00:00Z",
  approvedAt: "2026-11-02T10:00:00Z",
  rejectedAt: null,
  cancelledAt: null,
  rejectionReason: null,
  cancellationReason: null,
  transport: null,
  updatedAt: "2026-11-02T10:00:00Z",
};

describe("getBookingActionAvailability", () => {
  it("disables both actions when booking is REJECTED", () => {
    const booking: Booking = {
      ...baseBooking,
      status: "REJECTED",
      transport: { transportId: "t-1", transportCode: "TR-01", status: "READY" },
    };
    const dossiers: BookingDossierLink[] = [
      { complianceDossierId: "d-1", dossierCode: "DOS-01", dossierType: "MAIN", status: "APPROVED" },
    ];

    const result = getBookingActionAvailability({ booking, dossiers });
    expect(result.transport.enabled).toBe(false);
    expect(result.transport.reason).toContain("rejected");
    expect(result.dossier.enabled).toBe(false);
    expect(result.dossier.reason).toContain("rejected");
  });

  it("disables both actions when booking is CANCELLED", () => {
    const booking: Booking = {
      ...baseBooking,
      status: "CANCELLED",
      transport: { transportId: "t-1", transportCode: "TR-01", status: "IN_TRANSIT" },
    };
    const dossiers: BookingDossierLink[] = [
      { complianceDossierId: "d-1", dossierCode: "DOS-01", dossierType: "MAIN", status: "APPROVED" },
    ];

    const result = getBookingActionAvailability({ booking, dossiers });
    expect(result.transport.enabled).toBe(false);
    expect(result.transport.reason).toContain("cancelled");
    expect(result.dossier.enabled).toBe(false);
    expect(result.dossier.reason).toContain("cancelled");
  });

  it("disables transport tracking when transport is null", () => {
    const booking: Booking = { ...baseBooking, transport: null };
    const result = getBookingActionAvailability({ booking });
    expect(result.transport.enabled).toBe(false);
    expect(result.transport.reason).toContain("assigned");
  });

  it("disables transport tracking when transport status is CREATED or PLANNING (409 on BE)", () => {
    const bookingCreated: Booking = {
      ...baseBooking,
      transport: { transportId: "t-1", transportCode: "TR-01", status: "CREATED" },
    };
    const resultCreated = getBookingActionAvailability({ booking: bookingCreated });
    expect(resultCreated.transport.enabled).toBe(false);
    expect(resultCreated.transport.reason).toBe("Available once the transport has started");

    const bookingPlanning: Booking = {
      ...baseBooking,
      transport: { transportId: "t-1", transportCode: "TR-01", status: "PLANNING" },
    };
    const resultPlanning = getBookingActionAvailability({ booking: bookingPlanning });
    expect(resultPlanning.transport.enabled).toBe(false);
    expect(resultPlanning.transport.reason).toBe("Available once the transport has started");
  });

  it("enables transport tracking when transport status is READY, IN_TRANSIT, or COMPLETED", () => {
    for (const status of ["READY", "IN_TRANSIT", "COMPLETED"] as const) {
      const booking: Booking = {
        ...baseBooking,
        transport: { transportId: "t-1", transportCode: "TR-01", status },
      };
      const result = getBookingActionAvailability({ booking });
      expect(result.transport.enabled).toBe(true);
      expect(result.transport.href).toBe("/bookings/b-123/transports/t-1");
    }
  });

  it("disables compliance dossier when no dossier exists", () => {
    const booking: Booking = { ...baseBooking };
    const result = getBookingActionAvailability({ booking, dossiers: [] });
    expect(result.dossier.enabled).toBe(false);
    expect(result.dossier.reason).toBe("Available once your documents are requested");
  });

  it("disables compliance dossier with loading state while query is fetching", () => {
    const booking: Booking = { ...baseBooking };
    const result = getBookingActionAvailability({
      booking,
      dossiers: null,
      dossierLoading: true,
    });
    expect(result.dossier.enabled).toBe(false);
    expect(result.dossier.loading).toBe(true);
  });

  it("enables compliance dossier when a dossier exists", () => {
    const booking: Booking = { ...baseBooking };
    const dossiers: BookingDossierLink[] = [
      { complianceDossierId: "dossier-456", dossierCode: "DOS-456", dossierType: "MAIN", status: "SUBMITTED" },
    ];
    const result = getBookingActionAvailability({ booking, dossiers });
    expect(result.dossier.enabled).toBe(true);
    expect(result.dossier.href).toBe("/compliance-dossiers/dossier-456");
  });
});

