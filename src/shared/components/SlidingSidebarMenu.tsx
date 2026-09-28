import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { SidebarMenu } from "@/shared/components/ui/sidebar"

export function SlidingSidebarMenu({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 0 })

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (!shell) return

    const updateIndicator = () => {
      const activeItem = shell.querySelector<HTMLElement>('[data-active-item="true"]')
      if (!activeItem) {
        setIndicator((current) => current.height === 0 ? current : { top: 0, height: 0 })
        return
      }
      const shellRect = shell.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()
      setIndicator({ top: itemRect.top - shellRect.top, height: itemRect.height })
    }

    updateIndicator()
    const observer = new ResizeObserver(updateIndicator)
    observer.observe(shell)
    return () => observer.disconnect()
  }, [children])

  return (
    <div ref={shellRef} className="relative">
      {indicator.height > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 z-10 w-1 rounded-r-sm bg-[#f39200] transition-[transform,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ height: indicator.height, transform: `translateY(${indicator.top}px)` }}
        />
      ) : null}
      <SidebarMenu>{children}</SidebarMenu>
    </div>
  )
}
