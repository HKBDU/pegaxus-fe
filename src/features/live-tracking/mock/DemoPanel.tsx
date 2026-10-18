import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useSyncExternalStore } from "react"
import { demoActions, getDemoState, subscribeDemo } from "./demo"

const button =
  "rounded border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

/** Remote control of the demo trip. Every change reloads the tab's queries, exactly like a status change on the BE would. */
export default function DemoPanel() {
  const state = useSyncExternalStore(subscribeDemo, getDemoState)
  const queryClient = useQueryClient()

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["transport-tracking"] })
  }, [queryClient, state.phase, state.silent])

  return (
    <section aria-label="Demo controls" className="rounded border border-dashed border-amber-500 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold uppercase tracking-[0.06em]">Demo data (dev only) - not from the backend</p>
      <p className="mt-0.5">
        Simulated trip Paris - Lille - Brussels - The Hague. Status: <strong>{state.phase.replace("_", " ")}</strong>
        {state.silent ? " - GPS signal cut" : ""}.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {state.phase === "READY" ? (
          <button type="button" className={button} onClick={demoActions.start}>
            Start trip (IN TRANSIT)
          </button>
        ) : null}
        {state.phase === "IN_TRANSIT" ? (
          <>
            <button type="button" className={button} onClick={() => demoActions.setSilent(!state.silent)}>
              {state.silent ? "Restore GPS signal" : "Cut GPS signal"}
            </button>
            <button type="button" className={button} onClick={() => void demoActions.finish()}>
              Finish trip now
            </button>
          </>
        ) : null}
        <button type="button" className={button} onClick={() => window.location.reload()}>
          Reset to READY
        </button>
      </div>
      {state.phase === "IN_TRANSIT" && state.silent ? <p className="mt-2">DELAYED after 30 s, LOST after 2 min without a sample. Keep it cut for over 2 min to see the "no signal" stretch on the map.</p> : null}
    </section>
  )
}
