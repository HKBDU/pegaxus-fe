import { cn } from "@/lib/utils"

import { PROFILE_SECTION_TITLES } from "../constants/profile.constants"
import type { ProfileAccordionSectionProps } from "../types/props"

export function ProfileAccordionSection({ title, open, onToggle, children }: ProfileAccordionSectionProps) {
  const contentId = `profile-section-${title.toLowerCase().replaceAll(" ", "-")}`

  return (
    <section className="grid gap-x-8 min-h-[101.5px] border-b border-[#d1d5db] py-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-[42px] w-full items-center text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <span className="font-bold text-[24px] leading-8 tracking-[0.6px] uppercase">{PROFILE_SECTION_TITLES[title]}</span>
      </button>
      <div
        id={contentId}
        hidden={!open}
        className={cn("min-w-0 pt-4 lg:pt-0", !open && "hidden")}
      >
        {children}
      </div>
    </section>
  )
}
