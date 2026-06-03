import { useState } from 'react'
import {
  MassiveJsonProbeCard,
  ProbeField,
  ProbeInput,
} from '@/pages/settings/feed/massive/components/MassiveJsonProbeCard'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchMassiveStockNews } from '@/api/massive/stockFeed'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function StockNewsSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
}) {
  const [ticker, setTicker] = useState('AAPL')
  const [gte, setGte] = useState('')
  const [lte, setLte] = useState('')
  const [limit, setLimit] = useState('20')

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
    >
      <MassiveJsonProbeCard
        title="Stock News"
        fields={
          <>
            <ProbeField label="ticker">
              <ProbeInput value={ticker} onChange={setTicker} />
            </ProbeField>
            <ProbeField label="published_utc_gte">
              <ProbeInput value={gte} onChange={setGte} />
            </ProbeField>
            <ProbeField label="published_utc_lte">
              <ProbeInput value={lte} onChange={setLte} />
            </ProbeField>
            <ProbeField label="limit">
              <ProbeInput value={limit} onChange={setLimit} type="number" />
            </ProbeField>
          </>
        }
        disabled={!configured}
        onExecute={() =>
          fetchMassiveStockNews({
            ticker: ticker.trim() || undefined,
            published_utc_gte: gte.trim() || undefined,
            published_utc_lte: lte.trim() || undefined,
            limit: Math.min(1000, Math.max(1, parseInt(limit, 10) || 20)),
          })
        }
      />
    </MassiveServicePanel>
  )
}
