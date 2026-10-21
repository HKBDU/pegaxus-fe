import { Link } from "react-router-dom"

import { useDossierByBooking } from "@/features/dossier/hooks/useDossier"
import { cn } from "@/lib/utils"

/**
 * "Compliance dossier" button of the booking details. It appears only when D1 returns a dossier the viewer may see:
 * a customer gets none while the dossier is still DRAFT, so the button shows up together with the notification.
 */
export function BookingDossierLink({ bookingId, className }: { bookingId: string; className?: string }) {
  const query = useDossierByBooking(bookingId)
  const dossiers = query.data ?? []
  if (!dossiers.length) return null

  return (
    <>
      {dossiers.map((dossier) => (
        <Link key={dossier.complianceDossierId} to={`/compliance-dossiers/${encodeURIComponent(dossier.complianceDossierId)}`} className={cn(className)}>
          {dossier.dossierType === "EXTRA" ? `Extra dossier${dossier.dossierCode ? ` ${dossier.dossierCode}` : ""}` : "Compliance dossier"}
        </Link>
      ))}
    </>
  )
}
