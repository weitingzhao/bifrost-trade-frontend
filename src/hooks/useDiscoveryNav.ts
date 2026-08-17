import { useNavigate } from 'react-router-dom'

/** Breadcrumb navigation from Option Discovery. */
export function useDiscoveryNav() {
  const navigate = useNavigate()
  return {
    goToScreener: () => navigate('/research/screener'),
    /** Polygon feed coverage settings (stock IB coverage page). */
    openPolygonFeed: () => navigate('/settings/coverage/stock-ib'),
  }
}
