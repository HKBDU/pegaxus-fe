import { RotateCcw, Save } from "lucide-react"

import { Button } from "@/shared/components/ui/button"

export function ProfileSaveBar({ saving, changeCount, onSave, onDiscard }: { saving: boolean; changeCount: number; onSave: () => void; onDiscard: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-[680px] flex-col gap-3 rounded-[8px] border border-white/15 bg-[#181818] px-4 py-3 text-white shadow-[0_8px_30px_rgba(24,24,24,0.2)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f39200] text-xs font-bold text-[#181818]">{changeCount}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Unsaved profile changes</p>
            <p className="text-[11px] text-white/60">{changeCount} {changeCount === 1 ? "field" : "fields"} waiting to be saved</p>
          </div>
        </div>
        <div className="flex gap-2 sm:shrink-0 sm:justify-end">
          <Button type="button" variant="outline" disabled={saving} onClick={onDiscard} className="h-8 flex-1 rounded-[4px] border-white/30 bg-transparent px-3 text-[11px] font-bold uppercase text-white hover:bg-white/10 hover:text-white sm:flex-none">
            <RotateCcw className="size-3.5" />
            Discard
          </Button>
          <Button type="button" disabled={saving} onClick={onSave} className="h-8 flex-1 rounded-[4px] bg-[#f39200] px-3 text-[11px] font-bold uppercase text-[#181818] hover:bg-[#ffad2f] sm:flex-none">
            {saving ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : <Save className="size-3.5" />}
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
