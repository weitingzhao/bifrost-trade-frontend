import { memo, useEffect, useState } from 'react'
import { fmtRelativeEpoch } from '@/utils/celeryWorkerDisplay'

export const WorkerHeartbeatLine = memo(function WorkerHeartbeatLine({
  epochSec,
}: {
  epochSec: number | null
}) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  return <span>Heartbeat: {fmtRelativeEpoch(epochSec)}</span>
})
