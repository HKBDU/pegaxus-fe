/**
 * Utility to permanently stamp GPS coordinates and time marking directly onto captured photo images.
 */

export interface StampOptions {
  capturedAt: Date
  coordinates?: { latitude: number; longitude: number } | null
  documentLabel?: string
}

function formatStampDate(date: Date): string {
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * Applies a tamper-evident visual watermark (Date/Time, GPS coordinates, verification badge)
 * directly into the image canvas.
 */
export async function stampPhoto(file: File, options: StampOptions): Promise<File> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file
  }

  // Only stamp supported image mime types
  if (!file.type.startsWith("image/")) {
    return file
  }

  try {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Image load failed"))
      img.src = objectUrl
    })

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (!width || !height) {
      URL.revokeObjectURL(objectUrl)
      return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      URL.revokeObjectURL(objectUrl)
      return file
    }

    // 1. Draw base image
    ctx.drawImage(img, 0, 0, width, height)
    URL.revokeObjectURL(objectUrl)

    // 2. Prepare stamp text
    const timeStr = `TIME: ${formatStampDate(options.capturedAt)}`
    const gpsStr = options.coordinates
      ? `GPS: ${options.coordinates.latitude.toFixed(4)}, ${options.coordinates.longitude.toFixed(4)}`
      : "GPS: Unavailable"
    const labelStr = (options.documentLabel || "PEGAXUS PROOF").toUpperCase()

    // 3. Compute responsive sizing
    const baseUnit = Math.max(14, Math.round(width * 0.018))
    const padding = Math.round(baseUnit * 0.8)
    const lineHeight = Math.round(baseUnit * 1.35)
    const boxHeight = padding * 2 + lineHeight * 3
    const boxWidth = Math.max(
      Math.round(width * 0.38),
      Math.round(ctx.measureText(timeStr).width * 2) + padding * 2,
    )
    const margin = Math.round(width * 0.02)
    const boxX = margin
    const boxY = height - boxHeight - margin

    // 4. Draw background banner
    ctx.save()
    ctx.fillStyle = "rgba(15, 23, 42, 0.82)" // Slate-900 with high opacity
    ctx.strokeStyle = "rgba(243, 146, 0, 0.9)" // Amber/Orange border
    ctx.lineWidth = Math.max(1.5, Math.round(baseUnit * 0.1))

    // Rounded rectangle path
    const radius = Math.round(baseUnit * 0.4)
    ctx.beginPath()
    ctx.moveTo(boxX + radius, boxY)
    ctx.lineTo(boxX + boxWidth - radius, boxY)
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius)
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius)
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight)
    ctx.lineTo(boxX + radius, boxY + boxHeight)
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius)
    ctx.lineTo(boxX, boxY + radius)
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 5. Draw text
    ctx.font = `bold ${Math.round(baseUnit * 0.85)}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = "#f39200" // Pegasus Orange
    ctx.fillText(labelStr, boxX + padding, boxY + padding + lineHeight * 0.75)

    ctx.font = `${Math.round(baseUnit * 0.8)}px "Courier New", monospace`
    ctx.fillStyle = "#ffffff"
    ctx.fillText(timeStr, boxX + padding, boxY + padding + lineHeight * 1.7)

    ctx.fillStyle = options.coordinates ? "#38bdf8" : "#94a3b8" // Cyan or light slate
    ctx.fillText(gpsStr, boxX + padding, boxY + padding + lineHeight * 2.65)
    ctx.restore()

    // 6. Export stamped canvas to Blob and File
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, 0.92),
    )

    if (!blob) return file

    return new File([blob], file.name, {
      type: outputType,
      lastModified: options.capturedAt.getTime(),
    })
  } catch {
    // If stamping fails, fall back smoothly to the original file
    return file
  }
}
