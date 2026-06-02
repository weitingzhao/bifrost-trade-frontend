import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { useApiEnvHealthOverview } from '@/hooks/useApiEnvHealthOverview'
import { ApiConfiguredRoutesStrip } from './ApiConfiguredRoutesStrip'
import { ApiEnvHealthColumn } from './ApiEnvHealthColumn'
import {
  apiHealthEmptyHintClass,
  apiHealthEnvGridClass,
  apiHealthOverviewSectionClass,
} from './apiHealthEnvUi'
import { apiHealthLastRefreshClass, apiHealthSectionTitleClass } from './apiHealthUi'

const OVERVIEW_INFO =
  'Configured routes from YAML utilized.services (GET /health), and live probes for Dev vs Prod. Override bases with VITE_DEV_API_ORIGIN and VITE_PROD_API_ORIGIN. Probes refresh every 15 s.'

export function ApiEnvHealthGrid() {
  const { resolved, displayDev, displayProd, lastRefresh, probeBusy } = useApiEnvHealthOverview()

  return (
    <div className={apiHealthOverviewSectionClass}>
      <div>
        <h3 className={apiHealthSectionTitleClass}>
          Services Overview
          <InfoTooltip text={OVERVIEW_INFO} />
        </h3>
        <p className={apiHealthLastRefreshClass}>
          Last refresh: {lastRefresh}
          {probeBusy ? ' · Updating…' : ''}
        </p>
      </div>

      {!resolved ? (
        <p className={apiHealthEmptyHintClass}>Resolving environment routes…</p>
      ) : (
        <>
          <ApiConfiguredRoutesStrip utilizedServices={resolved.utilizedServices} />
          <div>
            <h4 className={apiHealthSectionTitleClass}>Health</h4>
            <div
              className={apiHealthEnvGridClass}
              role="region"
              aria-label="FastAPI health by environment"
            >
              {displayDev ? <ApiEnvHealthColumn column={displayDev} /> : null}
              {displayProd ? <ApiEnvHealthColumn column={displayProd} /> : null}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
