import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import {
  MassiveJsonProbeCard,
  ProbeField,
  ProbeInput,
} from '@/pages/settings/feed/massive/components/MassiveJsonProbeCard'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import {
  fetchMassiveHistQuotes,
  fetchMassiveHistTrades,
  fetchMassiveLastTrade,
} from '@/api/massive/optionFeed'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import { tierOkForRow, tradesOkForRow } from '@/pages/settings/feed/massive/checklist/optionStatus'

type TqSub = 'last_trade' | 'hist_quotes' | 'hist_trades' | 'flat_quotes' | 'flat_trades'

const REST_OPTS: { value: TqSub; label: string }[] = [
  { value: 'hist_trades', label: 'Trades' },
  { value: 'last_trade', label: 'Last Trade' },
  { value: 'hist_quotes', label: 'Quotes' },
  { value: 'flat_quotes', label: 'Flat Files — Quotes' },
  { value: 'flat_trades', label: 'Flat Files — Trades' },
]

export function OptionTradesQuotesSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
  evidence,
  massiveStatus,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
  evidence?: React.ReactNode
  massiveStatus: MassiveStatusResponse | null | undefined
}) {
  const [sub, setSub] = useState<TqSub>('last_trade')
  const [ticker, setTicker] = useState('O:AAPL251219C00200000')
  const [limit, setLimit] = useState('50')
  const [gte, setGte] = useState('')
  const [lte, setLte] = useState('')

  const tradesRow = { ...row, requiresTrades: true, tierMin: 'developer' as const }
  const tradesAllowed =
    configured && tierOkForRow(tradesRow, massiveStatus ?? null, true) && tradesOkForRow(tradesRow, massiveStatus ?? null)

  if (sub === 'flat_quotes' || sub === 'flat_trades') {
    return (
      <MassiveServicePanel
        row={row}
        effectiveStatus={effectiveStatus}
        expanded={expanded}
        highlighted={highlighted}
        onToggle={onToggle}
        anchorId={feedMassiveOptionSvcAnchorId(row.id)}
        evidence={evidence}
      >
        <SegmentControl ariaLabel="Trade and quotes sub-tabs" options={REST_OPTS} value={sub} onChange={v => setSub(v as TqSub)} className="mb-3" />
        <p className="text-sm text-muted-foreground">
          S3 bulk download for all US options. Not integrated in this project UI — see{' '}
          <a href="https://polygon.io/flat-files" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Massive flat file documentation
          </a>
          .
        </p>
        {sub === 'flat_trades' ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">Developer tier required for tick-level trades.</p>
        ) : null}
      </MassiveServicePanel>
    )
  }

  const disabled = !configured || (sub === 'hist_trades' && !tradesAllowed)

  return (
    <MassiveServicePanel
      row={row}
      effectiveStatus={effectiveStatus}
      expanded={expanded}
      highlighted={highlighted}
      onToggle={onToggle}
      anchorId={feedMassiveOptionSvcAnchorId(row.id)}
      evidence={evidence}
    >
      <SegmentControl ariaLabel="Trade and quotes sub-tabs" options={REST_OPTS} value={sub} onChange={v => setSub(v as TqSub)} className="mb-3" />
      {sub === 'hist_trades' && !tradesAllowed ? (
        <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
          Trades REST requires Developer tier and trades_enabled on the Massive account.
        </p>
      ) : null}
      <MassiveJsonProbeCard
        title={REST_OPTS.find(o => o.value === sub)?.label ?? 'Probe'}
        fields={
          <>
            <ProbeField label="options_ticker">
              <ProbeInput value={ticker} onChange={setTicker} />
            </ProbeField>
            {sub === 'hist_quotes' || sub === 'hist_trades' ? (
              <>
                <ProbeField label="timestamp_gte">
                  <ProbeInput value={gte} onChange={setGte} />
                </ProbeField>
                <ProbeField label="timestamp_lte">
                  <ProbeInput value={lte} onChange={setLte} />
                </ProbeField>
                <ProbeField label="limit">
                  <ProbeInput value={limit} onChange={setLimit} type="number" />
                </ProbeField>
              </>
            ) : null}
          </>
        }
        disabled={disabled}
        onExecute={async () => {
          const t = ticker.trim()
          if (sub === 'last_trade') {
            const r = await fetchMassiveLastTrade(t)
            return { ok: r.ok, error: r.error, data: r.results }
          }
          if (sub === 'hist_quotes') {
            const r = await fetchMassiveHistQuotes(t, {
              limit: parseInt(limit, 10) || undefined,
            })
            return { ok: r.ok, error: r.error, data: { results: r.results, count: r.count } }
          }
          const r = await fetchMassiveHistTrades(t, {
            timestamp_gte: gte.trim() || undefined,
            timestamp_lte: lte.trim() || undefined,
            limit: parseInt(limit, 10) || undefined,
          })
          return { ok: r.ok, error: r.error, data: { results: r.results, count: r.count } }
        }}
      />
    </MassiveServicePanel>
  )
}
