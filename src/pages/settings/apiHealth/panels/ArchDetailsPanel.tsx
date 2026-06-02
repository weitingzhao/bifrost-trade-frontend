import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SegmentControl } from '@/components/data-display'
import { makeProbeQuery } from '@/hooks/useApiHealthProbes'
import { ApiDetailKvCard, DetailKV } from '../ApiDetailKvList'
import { ARCH_SERVICES } from '../apiHealthConfig'
import {
  apiHealthDetailEmptyClass,
  apiHealthDetailHintClass,
  apiHealthDetailPanelClass,
  apiHealthDetailSectionClass,
  apiHealthDetailTitleClass,
} from '../apiHealthDetailUi'

export function ArchDetailsPanel() {
  const [tab, setTab] = useState<'monitor' | 'ops' | 'docs'>('monitor')

  const monitorSvc = ARCH_SERVICES.find((s) => s.key === 'monitor')!
  const docsSvc = ARCH_SERVICES.find((s) => s.key === 'docs')!
  const opsSvc = ARCH_SERVICES.find((s) => s.key === 'ops')!

  const { data: monitorData } = useQuery(makeProbeQuery(monitorSvc))
  const { data: docsData } = useQuery(makeProbeQuery(docsSvc))
  const monitorBody = monitorData?.body ?? null
  const docsBody = docsData?.body ?? null

  return (
    <div className={apiHealthDetailPanelClass}>
      <SegmentControl
        size="sm"
        ariaLabel="Architecture API details"
        value={tab}
        onChange={(v) => setTab(v as typeof tab)}
        options={[
          { value: 'monitor', label: 'Monitor API' },
          { value: 'ops', label: 'Ops API' },
          { value: 'docs', label: 'Docs API' },
        ]}
      />

      {tab === 'monitor' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Sidecar ports (from YAML)</p>
          <p className={apiHealthDetailHintClass}>
            From Monitor GET /health — listen ports declared in the merged server config.
          </p>
          {monitorBody ? (
            <ApiDetailKvCard>
              {(
                [
                  ['Massive API', monitorBody.massive_port],
                  ['Ops API', monitorBody.ops_port],
                  ['Docs API', monitorBody.docs_port],
                  ['Trading API', monitorBody.trading_port],
                  ['Strategy API', monitorBody.strategy_port],
                  ['Portfolio API', monitorBody.portfolio_port],
                  ['Market API', monitorBody.market_port],
                  ['Research API', monitorBody.research_port],
                ] as [string, number | undefined][]
              ).map(([label, port]) => (
                <DetailKV key={label} label={label}>
                  <span className="font-mono tabular-nums">{port ?? '–'}</span>
                </DetailKV>
              ))}
            </ApiDetailKvCard>
          ) : (
            <p className={apiHealthDetailEmptyClass}>
              No data yet. When Monitor API is reachable, GET /health returns YAML sidecar listen ports
              here.
            </p>
          )}
        </div>
      )}

      {tab === 'ops' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Main and Ops OpenAPI JSON</p>
          <p className={apiHealthDetailHintClass}>Resolved OpenAPI endpoints used by tooling.</p>
          <ApiDetailKvCard>
            <DetailKV label="Main API" mono>
              {monitorSvc.base}/openapi.json
            </DetailKV>
            <DetailKV label="Ops API" mono>
              {opsSvc.base}/ops/openapi.json
            </DetailKV>
          </ApiDetailKvCard>
        </div>
      )}

      {tab === 'docs' && (
        <div className={apiHealthDetailSectionClass}>
          <p className={apiHealthDetailTitleClass}>Upstream OpenAPI sources</p>
          <p className={apiHealthDetailHintClass}>
            URLs the Docs server uses to fetch and merge OpenAPI specs.
          </p>
          {docsBody?.main_url ? (
            <ApiDetailKvCard>
              <DetailKV label="Main API" mono>
                {String(docsBody.main_url)}
              </DetailKV>
              <DetailKV label="Massive API" mono>
                {String(docsBody.massive_url ?? '–')}
              </DetailKV>
              <DetailKV label="Research API" mono>
                {String(docsBody.research_url ?? '–')}
              </DetailKV>
            </ApiDetailKvCard>
          ) : (
            <p className={apiHealthDetailEmptyClass}>
              No data yet. When Docs API is reachable, GET /health returns upstream OpenAPI source URLs
              here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
