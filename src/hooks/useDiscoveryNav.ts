import { useNavigate } from 'react-router-dom'

/** Breadcrumb navigation from Option Discovery. */
export function useDiscoveryNav() {
  const navigate = useNavigate()
  return {
    goToScreener: () => navigate('/research/screener'),
    /** Historical Massive feed link — now points to stock IB coverage. */
    openMassiveFeed: () => navigate('/settings/coverage/stock-ib'),
  }
}
