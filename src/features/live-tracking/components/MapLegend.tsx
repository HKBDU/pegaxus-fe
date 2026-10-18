/** Key of the map symbols, bottom-left over the map. */
export function MapLegend() {
  return (
    <ul
      aria-label="Map legend"
      className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-[#e5e2d9] bg-white/95 px-3 py-2 text-[11px] text-gray-700 shadow"
    >
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-full border-2 border-white bg-emerald-600 shadow ring-1 ring-emerald-600" />
        Vehicle
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-full border-2 border-primary" />
        Next stop
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-2.5 rounded-full bg-amber-600" />
        Stop
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0.5 w-5 bg-blue-600" />
        Planned route
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0 w-5 border-t-[3px] border-dashed border-sky-400" />
        Traveled path
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-0 w-5 border-t-[3px] border-dotted border-slate-500" />
        No signal (path unknown)
      </li>
    </ul>
  )
}
