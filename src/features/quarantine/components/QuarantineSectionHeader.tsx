import type { ReactNode } from 'react'

interface QuarantineSectionHeaderProps {
  title: string
  badge?: ReactNode
}

export function QuarantineSectionHeader({ title, badge }: QuarantineSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="block h-5 w-1 rounded-none bg-[#f39200]" aria-hidden />
        <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-[#181818]">
          {title}
        </h2>
      </div>
      {badge}
    </div>
  )
}
