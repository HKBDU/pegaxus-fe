import { Check, ChevronRight, ClipboardCheck, FileCheck2, Search, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"

export type ComplianceHorse = {
  horseId: string
  horseName: string
  passportNumber: string
  microchipNumber: string
  status: "Ready" | "Review required" | "Pending"
}

type ComplianceFlow = "quarantine" | "clearance"

interface ComplianceHorseSelectionPageProps {
  flow: ComplianceFlow
  horses: ComplianceHorse[]
}

const flowCopy = {
  quarantine: {
    eyebrow: "BCP quarantine",
    title: "Select horses for quarantine",
    description: "Choose the horses covered by this BCP inspection and clearance proof.",
    action: "Continue to quarantine proof",
    icon: ShieldCheck,
    accent: "border-emerald-500 bg-emerald-50 text-emerald-800",
  },
  clearance: {
    eyebrow: "Customs clearance",
    title: "Select horses for customs clearance",
    description: "Choose the horses included in this customs declaration and release proof.",
    action: "Continue to customs proof",
    icon: FileCheck2,
    accent: "border-sky-500 bg-sky-50 text-sky-800",
  },
} as const

export function ComplianceHorseSelectionPage({ flow, horses }: ComplianceHorseSelectionPageProps) {
  const copy = flowCopy[flow]
  const Icon = copy.icon
  const [query, setQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>(horses.slice(0, 2).map((horse) => horse.horseId))

  const visibleHorses = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return horses
    return horses.filter((horse) =>
      [horse.horseName, horse.passportNumber, horse.microchipNumber].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [horses, query])

  const selected = new Set(selectedIds)
  const allVisibleSelected = visibleHorses.length > 0 && visibleHorses.every((horse) => selected.has(horse.horseId))

  const toggleHorse = (horseId: string) => {
    setSelectedIds((current) => (current.includes(horseId) ? current.filter((id) => id !== horseId) : [...current, horseId]))
  }

  const toggleVisible = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleHorses.some((horse) => horse.horseId === id))
      return [...new Set([...current, ...visibleHorses.map((horse) => horse.horseId)])]
    })
  }

  return (
    <main className="min-h-screen bg-[#f4f2ed] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="border border-[#e5e2d9] bg-white p-5 shadow-sm sm:p-6 lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f39200]">Compliance dossier · TR-2026-0048</p>
            <div className="mt-2 flex items-start gap-3">
              <span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center border ${copy.accent}`}><Icon className="size-5" aria-hidden /></span>
              <div className="min-w-0">
                <h1 className="font-heading text-xl font-bold uppercase tracking-tight text-[#181818] sm:text-2xl">{copy.title}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{copy.description}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs lg:mt-0 lg:min-w-[260px]">
            <div className="border border-[#e5e2d9] bg-[#faf9f7] p-3"><p className="uppercase tracking-wider text-slate-500">Route</p><p className="mt-1 font-semibold text-slate-900">FR → UK</p></div>
            <div className="border border-[#e5e2d9] bg-[#faf9f7] p-3"><p className="uppercase tracking-wider text-slate-500">Total horses</p><p className="mt-1 font-semibold text-slate-900">{horses.length}</p></div>
          </div>
        </header>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 border border-[#e5e2d9] bg-white p-4 shadow-sm sm:p-5 lg:p-6" aria-labelledby={`${flow}-horse-selection-title`}>
            <div className="flex flex-col gap-3 border-b border-[#e5e2d9] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Step 1 of 2</p>
                <h2 id={`${flow}-horse-selection-title`} className="mt-1 font-heading text-lg font-bold uppercase text-[#181818]">Horse selection</h2>
              </div>
              <span className="text-sm font-semibold text-slate-600"><span className="text-[#f39200]">{selectedIds.length}</span> of {horses.length} selected</span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search horses</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search horse, passport or microchip" className="h-11 w-full border border-[#d8d5ce] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#f39200] focus:ring-1 focus:ring-[#f39200]" />
              </label>
              <button type="button" onClick={toggleVisible} disabled={!visibleHorses.length} className="h-11 shrink-0 border border-[#d8d5ce] bg-white px-4 text-xs font-bold uppercase tracking-wide text-slate-700 transition hover:border-[#f39200] disabled:cursor-not-allowed disabled:opacity-50">
                {allVisibleSelected ? "Clear visible" : "Select visible"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleHorses.map((horse) => {
                const isSelected = selected.has(horse.horseId)
                return (
                  <label key={horse.horseId} className={`group flex min-h-[190px] cursor-pointer flex-col justify-between border p-4 transition ${isSelected ? "border-[#f39200] bg-[#fff8ed] ring-1 ring-[#f39200]" : "border-[#e5e2d9] bg-white hover:border-slate-400"}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleHorse(horse.horseId)} className="sr-only" />
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0"><span className="block truncate font-heading text-base font-bold uppercase text-[#181818]">{horse.horseName}</span><span className="mt-1 block text-xs text-slate-500">{horse.status}</span></span>
                      <span className={`flex size-6 shrink-0 items-center justify-center border ${isSelected ? "border-[#f39200] bg-[#f39200] text-white" : "border-slate-300 bg-white text-transparent"}`}><Check className="size-4" aria-hidden /></span>
                    </div>
                    <dl className="mt-5 space-y-2 text-[11px] uppercase tracking-wide text-slate-500">
                      <div className="flex justify-between gap-3"><dt>Passport</dt><dd className="truncate font-mono font-semibold text-slate-800">{horse.passportNumber}</dd></div>
                      <div className="flex justify-between gap-3"><dt>Microchip</dt><dd className="truncate font-mono font-semibold text-slate-800">{horse.microchipNumber}</dd></div>
                    </dl>
                  </label>
                )
              })}
            </div>
            {!visibleHorses.length && <p className="mt-5 border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No horses match your search.</p>}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="border border-[#e5e2d9] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2"><ClipboardCheck className="size-5 text-[#f39200]" aria-hidden /><h2 className="font-heading text-sm font-bold uppercase tracking-wide text-[#181818]">Selection summary</h2></div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Selected horses will be checked against the dossier before the {copy.eyebrow} proof is submitted.</p>
              <div className="mt-5 border-y border-[#e5e2d9] py-4"><div className="flex items-end justify-between"><span className="text-xs uppercase tracking-wider text-slate-500">Selected</span><strong className="font-heading text-3xl text-[#181818]">{selectedIds.length}<span className="text-base text-slate-400">/{horses.length}</span></strong></div><div className="mt-3 h-2 overflow-hidden bg-slate-100"><div className="h-full bg-[#f39200] transition-[width]" style={{ width: `${horses.length ? (selectedIds.length / horses.length) * 100 : 0}%` }} /></div></div>
              <div className="mt-4 space-y-2">{horses.filter((horse) => selected.has(horse.horseId)).map((horse) => <div key={horse.horseId} className="flex min-w-0 items-center gap-2 text-sm"><Check className="size-4 shrink-0 text-emerald-600" aria-hidden /><span className="truncate font-medium text-slate-800">{horse.horseName}</span></div>)}{selectedIds.length === 0 && <p className="text-sm text-slate-500">No horses selected yet.</p>}</div>
              <button type="button" disabled={selectedIds.length === 0} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-[#f39200] px-4 text-sm font-bold uppercase tracking-wide text-[#181818] transition hover:bg-[#e08600] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">{copy.action}<ChevronRight className="size-4" aria-hidden /></button>
            </section>
            <div className="border border-blue-200 bg-blue-50/70 p-4 text-xs leading-5 text-blue-950"><strong>Desktop preview:</strong> the horse grid expands across the main column while the summary stays visible on the right. On smaller screens it stacks naturally below the cards.</div>
          </aside>
        </div>
      </div>
    </main>
  )
}
