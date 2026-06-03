import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchResearchOptionOi } from '@/api/massive/optionFeed'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function OptionDailyOiSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  configured,
  evidence,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  configured: boolean
  evidence?: React.ReactNode
}) {
  const [symbol, setSymbol] = useState('AAPL')
  const [limit, setLimit] = useState('20')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [rows, setRows] = useState<Record<string, unknown>[]>([])

  const load = async () => {
    setBusy(true)
    setErr(null)
    setRows([])
    try {
      const r = await fetchResearchOptionOi(symbol.trim().toUpperCase(), {
        limit: parseInt(limit, 10) || 20,
      })
      if (r.error) setErr(r.error)
      setRows(r.rows)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
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
        Daily open interest rows from <code className="font-mono text-xs">option_open_interest_daily</code> when populated.
        OI enqueue job is a placeholder in the worker.
      </p>
      <div className="flex flex-wrap items-end gap-3 max-w-md">
        <div className="space-y-1">
          <Label>Symbol</Label>
          <Input value={symbol} onChange={e => setSymbol(e.target.value)} disabled={busy || !configured} />
        </div>
        <div className="space-y-1 w-24">
          <Label>Limit</Label>
          <Input value={limit} onChange={e => setLimit(e.target.value)} type="number" disabled={busy || !configured} />
        </div>
        <Button type="button" variant="outline" size="sm" disabled={busy || !configured} onClick={() => void load()}>
          {busy ? 'Loading…' : 'Load from DB'}
        </Button>
      </div>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {rows.length > 0 ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
      ) : (
        !busy && !err ? <p className="text-xs text-muted-foreground">No rows returned.</p> : null
      )}
    </MassiveServicePanel>
  )
}
