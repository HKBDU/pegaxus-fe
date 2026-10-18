import { useEffect, useRef } from "react"
import { useSidebar } from "@/shared/components/ui/sidebar"

/**
 * Gives the map the width of the sidebar while the Tab GPS is open: the admin sidebar collapses on entering and goes back
 * to what it was on leaving. It stays a normal toggle in between, so the user can open it whenever they want.
 * Render it only under the admin layout (it needs its `SidebarProvider`).
 */
export function CollapseAdminSidebar() {
  const { open, setOpen } = useSidebar()
  const before = useRef(open)
  const setOpenRef = useRef(setOpen)
  useEffect(() => {
    setOpenRef.current = setOpen
  })
  useEffect(() => {
    const restore = before.current
    setOpenRef.current(false)
    return () => setOpenRef.current(restore)
  }, [])
  return null
}
