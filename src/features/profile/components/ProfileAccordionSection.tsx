import { cn } from "@/lib/utils"

import { PROFILE_SECTION_TITLES } from "../constants/profile.constants"
import type { ProfileAccordionSectionProps } from "../types"

export function ProfileAccordionSection({ title, open, onToggle, children }: ProfileAccordionSectionProps) {
  const contentId = `profile-section-${title.toLowerCase().replaceAll(" ", "-")}`

  return (
    <section className="grid gap-x-6 min-h-[84px] border-b border-[#d1d5db] py-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-[42px] w-full items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="font-bold text-[20px] leading-7 tracking-[0.5px] uppercase">{PROFILE_SECTION_TITLES[title]}</span>
      </button>
      <div
        id={contentId}
        aria-hidden={!open}
        inert={!open}
        className={cn(
          "grid min-w-0 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden pt-3 lg:pt-0">{children}</div>
      </div>
    </section>
  )
}
