import { Link } from "react-router-dom"
import { MoreHorizontal } from "lucide-react"
import { approvedBookingDetail } from "@/app/route-config"
import { useAuthStore } from "@/features/auth/store"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"
import { getApprovedBookingActions } from "../approved-booking-actions"
import type { ApprovedBookingListItem } from "../types"

export function ApprovedBookingActionMenu({ booking }: { booking: ApprovedBookingListItem }) {
  const principal = useAuthStore((state) => state.principal)
  const actions = getApprovedBookingActions(principal, booking)
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 rounded-[2px]" aria-label={`Actions for ${booking.bookingCode}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="max-w-80">
      <DropdownMenuItem asChild><Link to={approvedBookingDetail(booking.bookingId)}>View Booking</Link></DropdownMenuItem>
      {actions.map((action) => action.href ? <DropdownMenuItem key={action.kind} asChild><Link to={action.href}>{action.label}</Link></DropdownMenuItem> :
        <DropdownMenuItem key={action.kind} disabled title={action.blockedReason} className="items-start"><span>{action.label}<span className="mt-1 block whitespace-normal text-[11px]">{action.blockedReason}</span></span></DropdownMenuItem>)}
    </DropdownMenuContent>
  </DropdownMenu>
}
