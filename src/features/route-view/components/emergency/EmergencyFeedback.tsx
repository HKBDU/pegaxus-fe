import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { getEmergencyError } from "../../services"

export function EmergencyFeedback({ error, latestUpdatedAt, onReviewLatest }: { error: unknown; latestUpdatedAt: string; onReviewLatest?: () => void }) {
  const [dismissed, setDismissed] = useState(false)
  if (!error) return null
  const problem = getEmergencyError(error)
  return <>
    <div role="alert" className="space-y-1 rounded-[2px] border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"><p>{problem.message}</p>
      {problem.errors.map(item => <p key={item.field} className="text-xs">{item.field}: {item.message}</p>)}
      {problem.stale && dismissed && <Button className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" type="button" variant="outline" onClick={() => setDismissed(false)}>Review Latest Version</Button>}
    </div>
    {problem.stale && <Dialog open={!dismissed} onOpenChange={open => { if (!open) setDismissed(true) }}>
      <DialogContent className="motion-reduce:animate-none motion-reduce:transition-none rounded-[2px]"><DialogHeader><DialogTitle>Route Changed</DialogTitle><DialogDescription>Your form input is retained. The latest route has been fetched; review its status and segments before making another decision. Nothing is automatically resubmitted.</DialogDescription></DialogHeader>
        <p className="break-all text-xs text-slate-500">Latest route version: {latestUpdatedAt}</p>
        <Button className="rounded-[2px] transition-colors duration-200 motion-reduce:transition-none" type="button" disabled={!onReviewLatest} onClick={() => { onReviewLatest?.(); setDismissed(true) }}>Review Latest Route</Button>
      </DialogContent>
    </Dialog>}
  </>
}
