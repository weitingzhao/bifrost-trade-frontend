import { useNavigate } from 'react-router-dom'

/** Breadcrumb navigation from Option Discovery. */
export function useDiscoveryNav() {
  const navigate = useNavigate()
  return {
    goToScreener: () => navigate('/research/screener'),
    openMassiveFeed: () => navigate('/settings/feed/massive-option'),
  }
}
