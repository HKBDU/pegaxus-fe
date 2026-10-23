import { useEffect, useState } from "react"

type AudioCtor = typeof AudioContext

const SIREN_EVERY_MS = 1800

/**
 * Emergency siren, no audio file needed: two rising-and-falling wails (a harsh sawtooth with a square sub-layer) followed by
 * three sharp beeps. It is loud on purpose; the compressor keeps the layers from clipping.
 */
function siren(context: AudioContext) {
  const now = context.currentTime
  const master = context.createGain()
  master.gain.value = 0.9
  const compressor = context.createDynamicsCompressor()
  master.connect(compressor).connect(context.destination)

  const tone = (type: OscillatorType, peak: number, start: number, length: number, shape: (osc: OscillatorNode) => void) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    shape(oscillator)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.03)
    gain.gain.setValueAtTime(peak, start + length - 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    oscillator.connect(gain).connect(master)
    oscillator.start(start)
    oscillator.stop(start + length + 0.02)
  }

  // Wail: 600 Hz up to 1300 Hz and back, twice.
  for (let wail = 0; wail < 2; wail++) {
    const start = now + wail * 0.55
    tone("sawtooth", 0.55, start, 0.52, (osc) => {
      osc.frequency.setValueAtTime(600, start)
      osc.frequency.linearRampToValueAtTime(1300, start + 0.26)
      osc.frequency.linearRampToValueAtTime(600, start + 0.52)
    })
    tone("square", 0.2, start, 0.52, (osc) => {
      osc.frequency.setValueAtTime(300, start)
      osc.frequency.linearRampToValueAtTime(650, start + 0.26)
      osc.frequency.linearRampToValueAtTime(300, start + 0.52)
    })
  }

  // Three sharp beeps right after the wails.
  for (let beep = 0; beep < 3; beep++) {
    const start = now + 1.15 + beep * 0.2
    tone("square", 0.5, start, 0.12, (osc) => {
      osc.frequency.value = 1480
    })
  }
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
      if (context.state === "running") siren(context)
    }
    const unlock = () => {
      void context.resume().then(() => {
        if (!cancelled) setBlocked(context.state !== "running")
      })
    }

    unlock()
    tick()
    timer = window.setInterval(tick, SIREN_EVERY_MS)
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
