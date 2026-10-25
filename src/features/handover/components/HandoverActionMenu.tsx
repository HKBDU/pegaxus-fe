import { MoreHorizontal } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/shared/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"

/** Row actions, same three-dots menu as the Transport Plan list. */
export function HandoverActionMenu({ code, href }: { code: string; href: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 rounded-[2px]" aria-label={`Actions for ${code}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-80 motion-reduce:animate-none">
        <DropdownMenuItem asChild>
          <Link to={href}>View Handover</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
