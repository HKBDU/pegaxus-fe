import type { FileRejection } from './types'

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

export function matchesAcceptedType(file: File, accept?: string) {
  if (!accept) return true
  const name = file.name.toLowerCase()
  return accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule)
      if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
      return file.type.toLowerCase() === rule
    })
}

export function describeFileRejection(file: File, reason: string): FileRejection {
  return { file, reason: `${file.name}: ${reason}` }
}

let uploadId = 0
export function createUploadId() {
  return `upl_${Date.now().toString(36)}_${uploadId++}`
}
