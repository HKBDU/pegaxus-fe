import { useState } from "react"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog"

import type { IncidentPhoto } from "../types"
import { fieldLabelClass } from "./ui"

/** Thumbnails of `photos[]` (DB v10 IncidentPhoto); a click opens the picture larger. */
export function IncidentPhotoGrid({ photos, label }: { photos: IncidentPhoto[]; label: string }) {
  const [active, setActive] = useState<IncidentPhoto | null>(null)
  if (!photos.length) return null
  const sorted = [...photos].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <div className="min-w-0">
      <p className={`${fieldLabelClass} mb-1.5`}>{label}</p>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {sorted.map((photo) => (
          <li key={photo.photoId}>
            <button type="button" onClick={() => setActive(photo)} className="block overflow-hidden rounded-[2px] border border-slate-200 transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-primary">
              <img src={photo.photoUrl} alt={photo.caption ?? label} loading="lazy" className="h-20 w-28 object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-3xl gap-2 rounded-[2px] p-3">
          <DialogTitle className="text-sm">{label}</DialogTitle>
          <DialogDescription className="text-xs">{active?.caption ?? "No caption"}</DialogDescription>
          {active ? <img src={active.photoUrl} alt={active.caption ?? label} className="max-h-[70vh] w-full object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
