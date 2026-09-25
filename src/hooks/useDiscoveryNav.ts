import { useNavigate } from 'react-router-dom'
import { opsConsoleHref } from '@/lib/opsConsole'

/** Breadcrumb navigation from Option Discovery. */
export function useDiscoveryNav() {
  const navigate = useNavigate()
  return {
    goToScreener: () => navigate('/research/contract-screener'),
    /**
     * Option coverage lives in the Ops Console (Massive › Coverage) since the
     * System › Data coverage page retired (Owner 2026-09-25).
     */
    openPolygonFeed: () => window.open(opsConsoleHref('market-data-manage'), '_blank', 'noopener,noreferrer'),
  }
}
