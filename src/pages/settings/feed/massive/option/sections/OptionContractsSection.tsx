import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchContractsCoverage } from '@/api/massive/optionFeed'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { useMassiveSyncJob } from '@/pages/settings/feed/massive/hooks/useMassiveSyncJob'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import type { ContractsCoverageResponse } from '@/api/massive/optionFeed'

type CtSub = 'contracts_list' | 'contract_detail' | 'db_verify' | 'snapshot_link'

const CT_OPTS: { value: CtSub; label: string }[] = [
  { value: 'contracts_list', label: 'All Contracts' },
  { value: 'contract_detail', label: 'Contract Overview' },
  { value: 'db_verify', label: 'DB Verify' },
  { value: 'snapshot_link', label: 'Snapshot Link' },
]

export function OptionContractsSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
  evidence,
  onJobComplete,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
  evidence?: React.ReactNode
  onJobComplete?: () => void
}) {
  const [sub, setSub] = useState<CtSub>('contracts_list')
  const sync = useMassiveSyncJob(onJobComplete)

  const [listSymbol, setListSymbol] = useState('AAPL')
  const [listExp, setListExp] = useState('')
  const [listType, setListType] = useState('')
  const [listLimit, setListLimit] = useState('100')

  const [detailTicker, setDetailTicker] = useState('O:AAPL251219C00200000')

  const [covSymbol, setCovSymbol] = useState('AAPL')
  const [coverage, setCoverage] = useState<ContractsCoverageResponse | null>(null)
  const [covBusy, setCovBusy] = useState(false)

  const [snapUnderlying, setSnapUnderlying] = useState('AAPL')
  const [snapTicker, setSnapTicker] = useState('O:AAPL251219C00200000')

  const runList = () => {
    const payload: Record<string, unknown> = { underlying: listSymbol.trim().toUpperCase() }
    if (listExp.trim()) payload.expiration_date = listExp.trim()
    if (listType.trim()) payload.contract_type = listType.trim()
    const lim = parseInt(listLimit, 10)
    if (lim > 0) payload.limit = lim
    void sync.run('feed_option_contracts', payload)
  }

  const runDetail = () => {
    void sync.run('feed_option_contracts', {
      mode: 'detail',
      options_ticker: detailTicker.trim(),
    })
  }

  const runSnapLink = () => {
    void sync.run('feed_option_snapshots', {
      mode: 'contract',
      underlying: snapUnderlying.trim().toUpperCase(),
      option_contract: snapTicker.trim(),
    })
  }

  const loadCoverage = async () => {
    setCovBusy(true)
    try {
      const r = await fetchContractsCoverage(covSymbol.trim().toUpperCase())
      setCoverage(r)
    } finally {
      setCovBusy(false)
    }
  }

  const err = sync.error
  const resultJson = sync.result ? JSON.stringify(sync.result, null, 2) : null

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
      <SegmentControl ariaLabel="Contracts sub-tabs" options={CT_OPTS} value={sub} onChange={v => setSub(v as CtSub)} className="mb-3" />
      {sub === 'contracts_list' ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
            <div className="space-y-1">
              <Label>Underlying</Label>
              <Input value={listSymbol} onChange={e => setListSymbol(e.target.value)} disabled={!configured || sync.busy} />
            </div>
            <div className="space-y-1">
              <Label>Expiration (YYYY-MM-DD)</Label>
              <Input value={listExp} onChange={e => setListExp(e.target.value)} disabled={!configured || sync.busy} />
            </div>
            <div className="space-y-1">
              <Label>Contract type</Label>
              <Input value={listType} onChange={e => setListType(e.target.value)} placeholder="call / put" disabled={!configured || sync.busy} />
            </div>
            <div className="space-y-1">
              <Label>Limit</Label>
              <Input value={listLimit} onChange={e => setListLimit(e.target.value)} type="number" disabled={!configured || sync.busy} />
            </div>
          </div>
          <Button type="button" size="sm" disabled={!configured || sync.busy} onClick={runList}>
            {sync.busy ? 'Enqueueing…' : 'Enqueue All Contracts'}
          </Button>
        </div>
      ) : null}
      {sub === 'contract_detail' ? (
        <div className="space-y-3 max-w-xl">
          <div className="space-y-1">
            <Label>Options ticker</Label>
            <Input value={detailTicker} onChange={e => setDetailTicker(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <Button type="button" size="sm" disabled={!configured || sync.busy} onClick={runDetail}>
            {sync.busy ? 'Enqueueing…' : 'Enqueue Contract Overview'}
          </Button>
        </div>
      ) : null}
      {sub === 'db_verify' ? (
        <div className="space-y-3 max-w-xl">
          <div className="space-y-1">
            <Label>Symbol</Label>
            <Input value={covSymbol} onChange={e => setCovSymbol(e.target.value)} disabled={covBusy} />
          </div>
          <Button type="button" variant="outline" size="sm" disabled={covBusy} onClick={() => void loadCoverage()}>
            {covBusy ? 'Loading…' : 'Check coverage (DB)'}
          </Button>
          {coverage?.ok && coverage.total != null ? (
            <div className="text-sm space-y-1">
              <p>
                <strong>{coverage.total}</strong> contracts in DB for {coverage.symbol ?? covSymbol}.
              </p>
              {coverage.coverage ? (
                <ul className="list-disc pl-5 text-muted-foreground text-xs">
                  <li>Ticker mapped: {coverage.coverage.with_massive_ticker ?? 0} ({coverage.coverage.ticker_pct ?? 0}%)</li>
                  <li>Expirations: {coverage.coverage.distinct_expirations ?? 0}</li>
                  <li>Strikes: {coverage.coverage.distinct_strikes ?? 0}</li>
                </ul>
              ) : null}
            </div>
          ) : null}
          {coverage && !coverage.ok ? (
            <p className="text-sm text-destructive">{coverage.error ?? 'Coverage check failed'}</p>
          ) : null}
        </div>
      ) : null}
      {sub === 'snapshot_link' ? (
        <div className="space-y-3 max-w-xl">
          <div className="space-y-1">
            <Label>Underlying</Label>
            <Input value={snapUnderlying} onChange={e => setSnapUnderlying(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Option contract ticker</Label>
            <Input value={snapTicker} onChange={e => setSnapTicker(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <Button type="button" size="sm" disabled={!configured || sync.busy} onClick={runSnapLink}>
            {sync.busy ? 'Enqueueing…' : 'Enqueue contract snapshot'}
          </Button>
        </div>
      ) : null}
      {err ? <p className="text-sm text-destructive" role="alert">{err}</p> : null}
      {resultJson && sub !== 'db_verify' ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs">{resultJson}</pre>
      ) : null}
    </MassiveServicePanel>
  )
}
