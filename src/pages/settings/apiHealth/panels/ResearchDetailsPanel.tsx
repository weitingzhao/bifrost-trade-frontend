import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { ApiDetailKvCard, DetailKV } from '../ApiDetailKvList'
import { RESEARCH_SERVICES } from '../apiHealthConfig'
import {
  apiHealthDetailPanelClass,
  apiHealthDetailSectionClass,
  apiHealthDetailHintClass,
  apiHealthDetailTitleClass,
} from '../apiHealthDetailUi'

export function ResearchDetailsPanel() {
  const [tab, setTab] = useState<'research' | 'strategy' | 'market'>('research')
  const researchBase = RESEARCH_SERVICES.find((s) => s.key === 'research')!.base
  const strategyBase = RESEARCH_SERVICES.find((s) => s.key === 'strategy')!.base
  const marketBase = RESEARCH_SERVICES.find((s) => s.key === 'market')!.base

  return (
    <div className={apiHealthDetailPanelClass}>
      <SegmentControl
        size="sm"
        ariaLabel="Research API details"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { value: 'research', label: 'Research API' },
          { value: 'strategy', label: 'Strategy API' },
          { value: 'market', label: 'Market API' },
        ]}
      />

      {tab === 'research' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Option discovery and max pain</p>
          <p className={apiHealthDetailHintClass}>
            IB-backed option chains, snapshots, and max pain compute endpoints. Uses IB operator client
            on startup when configured.
          </p>
          <ApiDetailKvCard>
            <DetailKV label="Typical routes">
              <code className="text-xs">/research/option-snapshot</code>
              <span className="text-xs text-muted-foreground">
                , /research/max-pain/compute (see OpenAPI)
              </span>
            </DetailKV>
            <DetailKV label="OpenAPI JSON" mono>
              {researchBase ? `${researchBase}/openapi.json` : '–'}
            </DetailKV>
          </ApiDetailKvCard>
        </div>
      )}

      {tab === 'strategy' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Structures, instances, allocations</p>
          <p className={apiHealthDetailHintClass}>
            Strategy templates, scoring, opportunity views, and instance CRUD (Postgres-backed when
            available).
          </p>
          <ApiDetailKvCard>
            <DetailKV label="Typical routes">
              <code className="text-xs">/strategy/*</code>
              <span className="text-xs text-muted-foreground"> REST resources (see OpenAPI)</span>
            </DetailKV>
            <DetailKV label="OpenAPI JSON" mono>
              {strategyBase ? `${strategyBase}/strategy/openapi.json` : '–'}
            </DetailKV>
          </ApiDetailKvCard>
        </div>
      )}

      {tab === 'market' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Bars, quotes, watchlist</p>
          <p className={apiHealthDetailHintClass}>
            Market data and SSE quote streams; Redis subscriber when configured. IB operator client on
            startup when configured.
          </p>
          <ApiDetailKvCard>
            <DetailKV label="Typical routes">
              <code className="text-xs">/market/*</code>
              <span className="text-xs text-muted-foreground"> bars, quotes, watchlist (see OpenAPI)</span>
            </DetailKV>
            <DetailKV label="OpenAPI JSON" mono>
              {marketBase ? `${marketBase}/market/openapi.json` : '–'}
            </DetailKV>
          </ApiDetailKvCard>
        </div>
      )}
    </div>
  )
}
