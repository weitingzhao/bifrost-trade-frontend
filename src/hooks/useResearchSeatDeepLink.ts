/**
 * `?seat=autopilot|copilot|workbench` sets the Research seat and strips
 * itself, so a shared link opens in the posture it was written from and a
 * refresh does not pin it.
 */
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isResearchSeat, setResearchSeat } from '@/lib/research/seat'

export function useResearchSeatDeepLink() {
  const [params, setParams] = useSearchParams()
  const seat = params.get('seat')
  useEffect(() => {
    if (!isResearchSeat(seat)) return
    setResearchSeat(seat)
    const next = new URLSearchParams(params)
    next.delete('seat')
    setParams(next, { replace: true })
  }, [seat, params, setParams])
}
