import { useEffect, useState } from "react"

type AudioCtor = typeof AudioContext

const BEEP_EVERY_MS = 1200

/** Two short tones; no audio file needed. */
function beep(context: AudioContext) {
  const now = context.currentTime
  ;[880, 660].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = "square"
    oscillator.frequency.value = frequency
    const start = now + index * 0.22
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.2)
  })
}

/**
 * Repeats an alarm while `playing` is true (URGENT alert, not muted). Browsers refuse audio before the first click or key press:
 * then `blocked` is true, the visual alert keeps running, and the sound starts as soon as the user touches the page.
 */
export function useAlertSound(playing: boolean) {
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    if (!playing) return
    const Ctor: AudioCtor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext
    if (!Ctor) return
    const context = new Ctor()
    let timer = 0
    let cancelled = false

    const tick = () => {
      if (context.state === "running") beep(context)
    }
    const unlock = () => {
      void context.resume().then(() => {
        if (!cancelled) setBlocked(context.state !== "running")
      })
    }

    unlock()
    tick()
    timer = window.setInterval(tick, BEEP_EVERY_MS)
    window.addEventListener("pointerdown", unlock)
    window.addEventListener("keydown", unlock)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
      void context.close()
      setBlocked(false)
    }
  }, [playing])

  return { blocked }
}
