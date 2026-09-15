import { useNavigate } from 'react-router-dom'

/** Breadcrumb navigation from Option Discovery. */
export function useDiscoveryNav() {
  const navigate = useNavigate()
  return {
    goToScreener: () => navigate('/research/contract-screener'),
    /** Polygon feed coverage settings (stock IB coverage page). */
    openPolygonFeed: () => navigate('/system/coverage?view=stock'),
  }
}
