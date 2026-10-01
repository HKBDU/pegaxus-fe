import { useEffect, useState } from 'react'

export type FileSizeSource = { url: string; size?: number }
export type FileSizeStatus = 'checking' | 'allowed' | 'too-large'

export function useFileSizeLimit(
  sources: FileSizeSource[],
  maxBytes: number,
) {
  const [status, setStatus] = useState<FileSizeStatus>('checking')
  const sourceKey = sources.map(({ url, size }) => `${url}:${size ?? ''}`).join('|')

  useEffect(() => {
    let cancelled = false

    async function check() {
      const results = await Promise.all(sources.map(async (source) => {
        if (source.size !== undefined) return source.size

        try {
          const response = await fetch(source.url, { method: 'HEAD' })
          const contentLength = response.headers.get('content-length')
          return contentLength ? Number(contentLength) : undefined
        } catch {
          return undefined
        }
      }))

      if (!cancelled) setStatus(results.some((size) => size !== undefined && size > maxBytes) ? 'too-large' : 'allowed')
    }

    setStatus('checking')
    void check()
    return () => { cancelled = true }
  }, [maxBytes, sourceKey])

  return status
}
