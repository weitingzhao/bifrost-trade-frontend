/**
 * `/research` lands where the seat sits.
 *
 * The seat is the Owner's posture; the home is that posture's page. The
 * search string rides along so `/research?copilot=open` still opens the
 * panel after the forward.
 */
import { Navigate, useLocation } from 'react-router-dom'
import { SEAT_META, useResearchSeat } from '@/lib/research/seat'

export default function ResearchHomePage() {
  const seat = useResearchSeat()
  const location = useLocation()
  return <Navigate to={{ pathname: SEAT_META[seat].home, search: location.search }} replace />
}
