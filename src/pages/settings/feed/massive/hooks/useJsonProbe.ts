import { useCallback, useState } from 'react'
import type { MassiveTickerProxyResponse } from '@/api/massive/stockFeed'

export function useJsonProbe(runner: () => Promise<MassiveTickerProxyResponse>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Record<string, unknown> | null>(null)

  const execute = useCallback(async () => {
    setBusy(true)
    setError(null)
    setData(null)
    try {
      const res = await runner()
      if (!res.ok) {
        setError(res.error ?? 'Request failed')
        return
      }
      setData(res.data ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [runner])

  return { busy, error, data, execute }
}
