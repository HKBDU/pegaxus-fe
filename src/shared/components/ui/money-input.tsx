import * as React from "react"

import { Input } from "@/shared/components/ui/input"

/** 1500000 -> "1,500,000". The app is VND-only, so there are never decimals. */
function groupThousands(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

const MAX_DIGITS = 16

function toDigits(text: string) {
  // Leading zeros are dropped ("007" -> "7") but a lone "0" stays.
  return text.replace(/\D/g, "").slice(0, MAX_DIGITS).replace(/^0+(?=\d)/, "")
}

type MoneyInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode"> & {
  /** Plain digits, no separators: what the form stores and what is sent to the API. */
  value: string
  onChange: (digits: string) => void
}

/**
 * Whole-VND amount typed as digits and shown with thousand separators while typing, so "1500000" reads "1,500,000".
 * Letters, dots, commas and signs are dropped; the caret keeps its place among the digits when separators appear.
 */
function MoneyInput({ value, onChange, ref, ...props }: MoneyInputProps) {
  const innerRef = React.useRef<HTMLInputElement | null>(null)
  const pendingCaret = React.useRef<number | null>(null)
  const display = groupThousands(value ?? "")

  React.useLayoutEffect(() => {
    const input = innerRef.current
    if (!input || pendingCaret.current === null) return
    // Walk the formatted text until the same number of digits sit before the caret as before the edit.
    let seen = 0
    let position = 0
    while (position < display.length && seen < pendingCaret.current) {
      if (/\d/.test(display[position])) seen += 1
      position += 1
    }
    input.setSelectionRange(position, position)
    pendingCaret.current = null
  }, [display])

  const setRefs = (node: HTMLInputElement | null) => {
    innerRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = node
  }

  return (
    <Input
      {...props}
      ref={setRefs}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={(event) => {
        const raw = event.target.value
        const caret = event.target.selectionStart ?? raw.length
        pendingCaret.current = toDigits(raw.slice(0, caret)).length
        const digits = toDigits(raw)
        // Same digits (for example a typed letter was dropped): nothing re-renders, so put the caret back here.
        if (digits === value) {
          const input = event.target
          requestAnimationFrame(() => {
            if (pendingCaret.current === null) return
            let seen = 0
            let position = 0
            while (position < display.length && seen < pendingCaret.current) {
              if (/\d/.test(display[position])) seen += 1
              position += 1
            }
            input.setSelectionRange(position, position)
            pendingCaret.current = null
          })
          return
        }
        onChange(digits)
      }}
    />
  )
}

export { MoneyInput }
