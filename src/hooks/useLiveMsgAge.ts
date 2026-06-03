/* eslint-disable react-hooks/set-state-in-effect -- live msg age ticks between Monitor /status polls (legacy IbEventSubscribePanel parity) */
import { useEffect, useRef, useState } from 'react'

/**
 * Live-updating message age: takes last_msg_age_s from a status poll and adds elapsed seconds since the poll.
 * Ticks every 1s between status polls (~5s).
 */
export function useLiveMsgAge(
  statusTick: unknown,
  ageAtPoll: number | null | undefined,
): number | null {
  const snapshotRef = useRef<{ pollMs: number; age: number } | null>(null)
  const [liveAge, setLiveAge] = useState<number | null>(null)

  useEffect(() => {
    if (ageAtPoll == null || !Number.isFinite(Number(ageAtPoll))) {
      snapshotRef.current = null
      setLiveAge(null)
      return
    }
    snapshotRef.current = { pollMs: Date.now(), age: Number(ageAtPoll) }
    setLiveAge(Number(ageAtPoll))
  }, [statusTick, ageAtPoll])

  useEffect(() => {
    const id = setInterval(() => {
      if (snapshotRef.current == null) return
      const elapsed = (Date.now() - snapshotRef.current.pollMs) / 1000
      setLiveAge(snapshotRef.current.age + elapsed)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return liveAge
}
