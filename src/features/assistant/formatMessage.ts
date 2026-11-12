/** Convert escaped text and common Markdown output into readable plain chat text. */
export function formatAssistantMessage(value: string): string {
  const normalized = value
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\\\\/g, "\\")
  const lines = normalized.split("\n")
  const formattedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line.startsWith("|") || !line.endsWith("|")) {
      formattedLines.push(lines[i])
      continue
    }

    const cells = line.slice(1, -1).split("|").map(cell => cell.trim())
    if (cells.every(cell => /^:?-{3,}:?$/.test(cell))) continue

    const nextLine = lines[i + 1]?.trim()
    if (nextLine?.startsWith("|") && nextLine.endsWith("|")) {
      const separator = nextLine.slice(1, -1).split("|").map(cell => cell.trim())
      if (separator.every(cell => /^:?-{3,}:?$/.test(cell))) {
        const headers = cells
        i++
        while (i + 1 < lines.length) {
          const row = lines[i + 1].trim()
          if (!row.startsWith("|") || !row.endsWith("|")) break
          i++
          const values = row.slice(1, -1).split("|").map(cell => cell.trim())
          formattedLines.push(headers.map((header, index) => values[index] ? `${header}: ${values[index]}` : "").filter(Boolean).join(" · "))
        }
        continue
      }
    }

    formattedLines.push(cells.join(" · "))
  }

  return formattedLines.join("\n")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+[.)]\s+/gm, "• ")
    .replace(/\*\*(.*?)\*\*|__(.*?)__/gs, "$1$2")
    .replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)|(?<!_)_(?!_)(.*?)_(?!_)/gs, "$1$2")
    .replace(/~~(.*?)~~/gs, "$1")
    .replace(/`{1,3}([^`\n]*)`{1,3}/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}
/** Do not show tool references when the assistant refuses an out-of-scope request. */
export function shouldShowAssistantReferences(reply: string): boolean {
  const normalized = reply.trim().toLocaleLowerCase()
  const refusal = "i can only help look up information about my transport bookings. which booking would you like to see?"
  return normalized !== refusal
}

