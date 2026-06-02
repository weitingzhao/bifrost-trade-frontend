import { useMassiveApiStatus } from '@/hooks/useApiHealthProbes'
import { ApiDetailKvCard, DetailKV } from '../ApiDetailKvList'
import { MASSIVE_SERVICES } from '../apiHealthConfig'
import {
  apiHealthDetailHintClass,
  apiHealthDetailSectionClass,
  apiHealthDetailTitleClass,
} from '../apiHealthDetailUi'

const TIER_LABELS: Record<string, string> = {
  starter: 'Starter (free)',
  developer: 'Developer',
  advanced: 'Advanced',
  business: 'Business',
}

export function MassiveDetailsPanel() {
  const { data, isPending, isError } = useMassiveApiStatus(MASSIVE_SERVICES[0].base)

  return (
    <div className={apiHealthDetailSectionClass}>
      <p className={apiHealthDetailTitleClass}>Polygon data source</p>
      <p className={apiHealthDetailHintClass}>
        Configuration status of the Polygon.io market data provider (GET /research/massive/status).
      </p>
      <ApiDetailKvCard>
        <DetailKV label="Configured">
          {isPending ? '…' : isError ? '–' : data!.configured ? 'Yes' : 'No'}
        </DetailKV>
        <DetailKV label="Tier">
          {isPending
            ? '…'
            : isError
              ? '–'
              : (TIER_LABELS[String(data!.tier ?? '')] ?? String(data!.tier ?? '–'))}
        </DetailKV>
        <DetailKV label="Trades enabled">
          {isPending ? '…' : isError ? '–' : data!.trades_enabled ? 'Yes' : 'No'}
        </DetailKV>
        {data?.delay_notice ? <DetailKV label="Delay notice">{String(data.delay_notice)}</DetailKV> : null}
      </ApiDetailKvCard>
    </div>
  )
}
