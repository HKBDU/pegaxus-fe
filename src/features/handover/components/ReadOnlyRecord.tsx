import { Ban, CheckCircle2, ImageOff } from "lucide-react"
import { useState } from "react"
import type { HandoverRecord } from "../types"
import { formatDateTime } from "../utils"
import { NoteSection } from "./NoteSection"
import { PartiesSection } from "./PartyBlock"
import { RecordSummary } from "./RecordSummary"

function SignatureImage({ label, signer, url }: { label: string; signer?: string | null; url?: string | null }) {
  const [broken, setBroken] = useState(false)
  return (
    <figure className="min-w-0 space-y-2">
      <figcaption>
        <p className="font-heading text-xs font-semibold tracking-wide text-gray-800 uppercase">{label}</p>
        {signer ? <p className="truncate text-xs text-gray-500">{signer}</p> : null}
      </figcaption>
      <div className="flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white">
        {url && !broken ? (
          <img src={url} alt={`${label}${signer ? ` of ${signer}` : ""}`} loading="lazy" onError={() => setBroken(true)} className="size-full object-contain" />
        ) : (
          <p className="flex items-center gap-2 px-3 text-center text-sm text-gray-400">
            <ImageOff aria-hidden="true" className="size-4 shrink-0" />
            {url ? "The signature image could not be loaded." : "No signature."}
          </p>
        )}
      </div>
    </figure>
  )
}

/** View of a record nobody can fill in any more (or has not been started): planned, completed or cancelled. */
export function ReadOnlyRecord({ record, justCompleted = false }: { record: HandoverRecord; justCompleted?: boolean }) {
  const effects = record.effects
  const showNotes = record.status === "COMPLETED"
  return (
    <div className="space-y-4">
      {record.status === "CANCELLED" ? (
        <section role="status" className="flex items-start gap-3 rounded-[2px] border border-gray-300 bg-gray-100 p-3 text-sm text-gray-700 sm:p-4">
          <Ban aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gray-500" />
          <div className="min-w-0">
            <p className="font-heading text-xs font-semibold tracking-[0.06em] uppercase">Handover cancelled {record.cancelledAt ? `on ${formatDateTime(record.cancelledAt)}` : ""}</p>
            <p className="mt-1 break-words whitespace-pre-wrap">{record.cancellationReason || "No reason given."}</p>
          </div>
        </section>
      ) : null}

      {justCompleted && effects ? (
        <section role="status" className="flex items-start gap-3 rounded-[2px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 sm:p-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="min-w-0 space-y-1">
            <p className="font-heading text-xs font-semibold tracking-[0.06em] uppercase">Handover completed</p>
            <p>Transport status is now <strong>{effects.transportStatus.replaceAll("_", " ").toLowerCase()}</strong>.</p>
            {effects.claimWindowEndsAt ? <p>The customer can raise a claim until {formatDateTime(effects.claimWindowEndsAt)}.</p> : null}
          </div>
        </section>
      ) : null}

      <RecordSummary record={record} />
      <PartiesSection from={{ party: record.from }} to={{ party: record.to }} />

      {showNotes ? (
        <>
          <section aria-label="Handover notes" className="overflow-hidden rounded-[2px] border border-slate-300 bg-white">
            <NoteSection name="horseConditionNote" title="Horse condition" value={record.horseConditionNote ?? ""} readOnly placeholder="" />
            <NoteSection name="documentHandoverNote" title="Compliance document" value={record.documentHandoverNote ?? ""} readOnly placeholder="" />
            <NoteSection name="equipmentHandoverNote" title="Equipment" value={record.equipmentHandoverNote ?? ""} readOnly placeholder="" />
            <NoteSection name="discrepancyNote" title="Discrepancy" value={record.discrepancyNote ?? ""} readOnly placeholder="" />
          </section>
          <section aria-label="Signatures" className="rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4">
            <div className="grid gap-5 md:grid-cols-2 md:gap-4">
              <SignatureImage label="Sender sign" signer={record.from.partyName} url={record.senderSignatureUrl} />
              <SignatureImage label="Receiver sign" signer={record.to.partyName} url={record.receiverSignatureUrl} />
            </div>
            {record.completedAt ? <p className="mt-3 text-xs text-gray-500">Completed {formatDateTime(record.completedAt)}</p> : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
