/* eslint-disable react-hooks/set-state-in-effect -- msg/s estimated from consecutive GET /status samples (legacy IbEventSubscribePanel parity) */
import { useEffect, useRef, useState } from 'react'

/**
 * Estimate msg/s from health-hash msg_count using consecutive GET /status samples.
 */
export function useMsgCountRate(
  statusTick: unknown,
  msgCount: number | null | undefined,
): number | null {
  const ref = useRef<{ t: number; v: number } | null>(null)
  const [rate, setRate] = useState<number | null>(null)

  useEffect(() => {
    if (msgCount == null || !Number.isFinite(Number(msgCount))) {
      ref.current = null
      setRate(null)
      return
    }
    const v = Number(msgCount)
    const now = Date.now()
    const prev = ref.current
    ref.current = { t: now, v }
    if (prev == null) {
      setRate(null)
      return
    }
    const dt = (now - prev.t) / 1000
    if (dt < 0.05) return
    const dv = v - prev.v
    if (dv < 0) {
      setRate(null)
      return
    }
    setRate(dv / dt)
  }, [statusTick, msgCount])

  return rate
}
