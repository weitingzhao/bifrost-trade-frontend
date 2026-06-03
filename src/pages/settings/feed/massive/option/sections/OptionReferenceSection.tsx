import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchOptionExpirations } from '@/api/massive/optionFeed'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

export function OptionReferenceSection({
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
  evidence?: ReactNode
}) {
  const [symbol, setSymbol] = useState('AAPL')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [expirations, setExpirations] = useState<string[]>([])
  const [strikes, setStrikes] = useState<number[]>([])

  const run = async () => {
    setBusy(true)
    setMsg(null)
    setExpirations([])
    setStrikes([])
    try {
      const r = await fetchOptionExpirations(symbol.trim().toUpperCase(), 'massive')
      if (r.error) {
        setMsg(r.error)
        return
      }
      setExpirations(r.expirations ?? [])
      setStrikes(r.strikes ?? [])
      setMsg(`Loaded ${r.expirations?.length ?? 0} expirations, ${r.strikes?.length ?? 0} strikes.`)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed')
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
      evidence={evidence ?? (configured ? 'Run expirations test via Massive REST.' : 'Configure Massive API key first.')}
    >
      <p className="text-sm text-muted-foreground">
        Massive-backed expirations and strikes (same API as Research → Option Discovery). Read-only — no PostgreSQL writes.
      </p>
      <div className="flex flex-wrap items-end gap-3 max-w-md">
        <div className="space-y-1 flex-1 min-w-[8rem]">
          <Label>Symbol</Label>
          <Input value={symbol} onChange={e => setSymbol(e.target.value)} disabled={busy || !configured} />
        </div>
        <Button type="button" size="sm" disabled={busy || !configured} onClick={() => void run()}>
          {busy ? 'Running…' : 'Run expirations test'}
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/research/discovery">Open Option Discovery</Link>
        </Button>
      </div>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      {expirations.length > 0 ? (
        <details className="rounded-md border border-border/60" open>
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Expirations ({expirations.length})
          </summary>
          <pre className="max-h-40 overflow-auto p-3 text-xs">{expirations.join('\n')}</pre>
        </details>
      ) : null}
      {strikes.length > 0 ? (
        <details className="rounded-md border border-border/60" open>
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Strikes ({strikes.length})</summary>
          <pre className="max-h-40 overflow-auto p-3 text-xs">{strikes.map(String).join('\n')}</pre>
        </details>
      ) : null}
    </MassiveServicePanel>
  )
}
