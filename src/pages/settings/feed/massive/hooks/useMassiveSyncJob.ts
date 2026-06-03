import { useCallback, useState } from 'react'
import { subscribeMassiveJobEvents } from '@/api/massive'
import { postMassiveSync } from '@/api/massive/optionFeed'

export function useMassiveSyncJob(onComplete?: () => void) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const run = useCallback(
    async (kind: string, payload: Record<string, unknown>) => {
      setBusy(true)
      setError(null)
      setResult(null)
      try {
        const res = await postMassiveSync(kind, payload)
        if (!res.ok) {
          setError(res.error ?? res.message ?? 'Enqueue failed')
          setBusy(false)
          return
        }
        if (!res.job_id) {
          setError('No job_id returned')
          setBusy(false)
          return
        }
        const sub = subscribeMassiveJobEvents(
          res.job_id,
          ev => {
            if (!ev.ok) {
              setError(ev.error ?? 'SSE error')
              setBusy(false)
              sub.close()
              return
            }
            const st = ev.job?.status
            if (st === 'done' || st === 'failed') {
              const jr = ev.job?.result as Record<string, unknown> | undefined
              if (st === 'done') setResult(jr ?? { ok: true })
              else setError((jr?.error as string) || 'Job failed')
              setBusy(false)
              sub.close()
              onComplete?.()
            }
          },
          { timeoutSec: 240 },
        )
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed')
        setBusy(false)
      }
    },
    [onComplete],
  )

  return { busy, error, result, run, setError, setResult }
}
