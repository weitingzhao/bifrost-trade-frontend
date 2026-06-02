import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { ApiDetailKvCard, DetailKV } from '../ApiDetailKvList'
import { ACCOUNT_SERVICES } from '../apiHealthConfig'
import {
  apiHealthDetailPanelClass,
  apiHealthDetailSectionClass,
  apiHealthDetailHintClass,
  apiHealthDetailTitleClass,
} from '../apiHealthDetailUi'

export function AccountDetailsPanel() {
  const [tab, setTab] = useState<'trading' | 'portfolio'>('trading')
  const tradingBase = ACCOUNT_SERVICES.find((s) => s.key === 'trading')!.base
  const portfolioBase = ACCOUNT_SERVICES.find((s) => s.key === 'portfolio')!.base

  return (
    <div className={apiHealthDetailPanelClass}>
      <SegmentControl
        size="sm"
        ariaLabel="Account API details"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { value: 'trading', label: 'Trading API' },
          { value: 'portfolio', label: 'Portfolio API' },
        ]}
      />

      {tab === 'trading' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Executions, performance, and cash flows</p>
          <p className={apiHealthDetailHintClass}>
            Account-level trades and derived views (R-A2, performance book, Flex ingest). Uses IB
            operator client on startup when configured.
          </p>
          <ApiDetailKvCard>
            <DetailKV label="Typical routes">
              <code className="text-xs">/executions</code>
              <span className="text-xs text-muted-foreground">
                , performance and transaction helpers (see OpenAPI)
              </span>
            </DetailKV>
            <DetailKV label="OpenAPI JSON" mono>
              {tradingBase ? `${tradingBase}/trading/openapi.json` : '–'}
            </DetailKV>
          </ApiDetailKvCard>
        </div>
      )}

      {tab === 'portfolio' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Model analysis and portfolio configuration</p>
          <p className={apiHealthDetailHintClass}>
            Portfolio payoff / Greeks style analysis and position category CRUD (Postgres-backed writes
            when available).
          </p>
          <ApiDetailKvCard>
            <DetailKV label="Typical routes">
              <code className="text-xs">/portfolio/model-analysis</code>
              <span className="text-xs text-muted-foreground">
                , /position-categories, execution strategy attribution
              </span>
            </DetailKV>
            <DetailKV label="OpenAPI JSON" mono>
              {portfolioBase ? `${portfolioBase}/portfolio/openapi.json` : '–'}
            </DetailKV>
          </ApiDetailKvCard>
        </div>
      )}
    </div>
  )
}
