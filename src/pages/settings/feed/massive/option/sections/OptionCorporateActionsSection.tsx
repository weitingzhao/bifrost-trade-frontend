import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchCorporateActions } from '@/api/massive/optionFeed'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { useMassiveSyncJob } from '@/pages/settings/feed/massive/hooks/useMassiveSyncJob'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function OptionCorporateActionsSection({
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
  const [symbol, setSymbol] = useState('AAPL')
  const [limit, setLimit] = useState('50')
  const sync = useMassiveSyncJob(onJobComplete)
  const [loadBusy, setLoadBusy] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchCorporateActions>>['rows']>([])

  const enqueue = () => {
    void sync.run('feed_stocks_corporate_action', { symbol: symbol.trim().toUpperCase() })
  }

  const loadDb = async () => {
    setLoadBusy(true)
    setLoadErr(null)
    try {
      const r = await fetchCorporateActions(symbol.trim().toUpperCase(), {
        limit: parseInt(limit, 10) || 50,
      })
      if (!r.ok) setLoadErr(r.error ?? 'Load failed')
      else setRows(r.rows)
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoadBusy(false)
    }
  }

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
      <p className="text-sm text-muted-foreground">
        Sync dividends, splits, and ticker events from Massive Stocks REST into PostgreSQL, then verify rows.
      </p>
      <div className="flex flex-wrap items-end gap-3 max-w-md">
        <div className="space-y-1">
          <Label>Symbol</Label>
          <Input value={symbol} onChange={e => setSymbol(e.target.value)} disabled={!configured || sync.busy} />
        </div>
        <Button type="button" size="sm" disabled={!configured || sync.busy} onClick={enqueue}>
          {sync.busy ? 'Enqueueing…' : 'Enqueue sync'}
        </Button>
        <div className="space-y-1 w-24">
          <Label>Limit</Label>
          <Input value={limit} onChange={e => setLimit(e.target.value)} type="number" disabled={loadBusy} />
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loadBusy} onClick={() => void loadDb()}>
          {loadBusy ? 'Loading…' : 'Load from DB'}
        </Button>
      </div>
      {sync.error ? <p className="text-sm text-destructive">{sync.error}</p> : null}
      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}
      {rows.length > 0 ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
      ) : null}
    </MassiveServicePanel>
  )
}
