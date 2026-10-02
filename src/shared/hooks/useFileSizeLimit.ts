import { useEffect, useState } from 'react'

export type FileSizeSource = { url: string; size?: number }
export type FileSizeStatus = 'checking' | 'allowed' | 'too-large'

export function useFileSizeLimit(
  sources: FileSizeSource[],
  maxBytes: number,
) {
  const sourceKey = sources.map(({ url, size }) => `${url}:${size ?? ''}`).join('|')
  const checkKey = `${maxBytes}:${sourceKey}`
  const [result, setResult] = useState<{ key: string; status: FileSizeStatus }>({
    key: checkKey,
    status: 'checking',
  })

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

      if (!cancelled) {
        setResult({
          key: checkKey,
          status: results.some((size) => size !== undefined && size > maxBytes) ? 'too-large' : 'allowed',
        })
      }
    }

    void check()
    return () => { cancelled = true }
  }, [checkKey, maxBytes, sources])

  return result.key === checkKey ? result.status : 'checking'
}
