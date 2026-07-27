import { useEffect, useState } from 'react'

const STALE_AGE_SEC = 10
const TICK_MS = 5_000

interface Props {
  /** Quote epoch seconds (`ts` or `updated_ts`). */
  ts: number | null | undefined
}

/** Subtle age label when OPT quote is older than ~10s (Dense UI micro token). */
export function OptQuoteAgeLabel({ ts }: Props) {
  const [nowSec, setNowSec] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNowSec(Date.now() / 1000)
    tick()
    const id = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  if (nowSec == null || ts == null || !Number.isFinite(ts)) return null
  const age = nowSec - ts
  if (age <= STALE_AGE_SEC) return null
  const rounded = Math.round(age)
  return (
    <span className="ml-1 text-dense-micro text-muted-foreground" title={`Quote age ${rounded}s`}>
      {rounded}s
    </span>
  )
}
