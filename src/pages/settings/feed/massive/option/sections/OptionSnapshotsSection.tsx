import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { fetchOptionSnapshotsPg } from '@/api/massive/optionFeed'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { useMassiveSyncJob } from '@/pages/settings/feed/massive/hooks/useMassiveSyncJob'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

type SnapType = 'contract' | 'chain' | 'unified'

const SNAP_OPTS: { value: SnapType; label: string }[] = [
  { value: 'contract', label: 'Option Contract Snapshot' },
  { value: 'chain', label: 'Option Chain Snapshot' },
  { value: 'unified', label: 'Unified Snapshot' },
]

export function OptionSnapshotsSection({
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
  const [snapType, setSnapType] = useState<SnapType>('chain')
  const sync = useMassiveSyncJob(onJobComplete)

  const [underlying, setUnderlying] = useState('NVDA')
  const [contractTicker, setContractTicker] = useState('O:NVDA251219C00140000')
  const [chainLimit, setChainLimit] = useState('250')
  const [chainType, setChainType] = useState<'' | 'call' | 'put'>('')
  const [unifiedTickers, setUnifiedTickers] = useState('AAPL,MSFT')

  const [verifySymbol, setVerifySymbol] = useState('NVDA')
  const [verifyExp, setVerifyExp] = useState('')
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyErr, setVerifyErr] = useState<string | null>(null)
  const [verifyData, setVerifyData] = useState<unknown>(null)

  const enqueue = () => {
    if (snapType === 'contract') {
      void sync.run('feed_option_snapshots', {
        mode: 'contract',
        underlying: underlying.trim().toUpperCase(),
        option_contract: contractTicker.trim(),
      })
      return
    }
    if (snapType === 'chain') {
      const payload: Record<string, unknown> = {
        mode: 'chain',
        underlying: underlying.trim().toUpperCase(),
      }
      const lim = parseInt(chainLimit, 10)
      if (lim > 0) payload.limit = lim
      if (chainType) payload.contract_type = chainType
      void sync.run('feed_option_snapshots', payload)
      return
    }
    void sync.run('feed_option_snapshots', {
      mode: 'unified',
      tickers: unifiedTickers.trim(),
    })
  }

  const verifyDb = async () => {
    const sym = verifySymbol.trim().toUpperCase()
    const exp = verifyExp.trim()
    if (!sym || !exp) {
      setVerifyErr('Symbol and expiration are required')
      return
    }
    setVerifyBusy(true)
    setVerifyErr(null)
    setVerifyData(null)
    try {
      const r = await fetchOptionSnapshotsPg(sym, exp, undefined, 'massive')
      if (r.error) setVerifyErr(r.error)
      else setVerifyData(r)
    } catch (e: unknown) {
      setVerifyErr(e instanceof Error ? e.message : 'Verify failed')
    } finally {
      setVerifyBusy(false)
    }
  }

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
      <SegmentControl
        ariaLabel="Snapshots sub-tabs"
        options={SNAP_OPTS}
        value={snapType}
        onChange={v => setSnapType(v as SnapType)}
        className="mb-3"
      />
      {snapType === 'contract' ? (
        <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
          <div className="space-y-1">
            <Label>Underlying</Label>
            <Input value={underlying} onChange={e => setUnderlying(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Option contract ticker</Label>
            <Input value={contractTicker} onChange={e => setContractTicker(e.target.value)} disabled={!configured || sync.busy} />
          </div>
        </div>
      ) : null}
      {snapType === 'chain' ? (
        <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
          <div className="space-y-1">
            <Label>Underlying</Label>
            <Input value={underlying} onChange={e => setUnderlying(e.target.value)} disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Limit</Label>
            <Input value={chainLimit} onChange={e => setChainLimit(e.target.value)} type="number" disabled={!configured || sync.busy} />
          </div>
          <div className="space-y-1">
            <Label>Contract type</Label>
            <Select value={chainType || '__all__'} onValueChange={v => setChainType(v === '__all__' ? '' : v as 'call' | 'put')} disabled={!configured || sync.busy}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="put">Put</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
      {snapType === 'unified' ? (
        <div className="space-y-1 max-w-xl">
          <Label>Tickers (comma-separated)</Label>
          <Input value={unifiedTickers} onChange={e => setUnifiedTickers(e.target.value)} disabled={!configured || sync.busy} />
        </div>
      ) : null}
      <Button type="button" size="sm" className="mt-3" disabled={!configured || sync.busy} onClick={enqueue}>
        {sync.busy ? 'Enqueueing…' : 'Enqueue snapshot job'}
      </Button>
      {sync.error ? <p className="text-sm text-destructive mt-2" role="alert">{sync.error}</p> : null}
      {resultJson ? <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs mt-2">{resultJson}</pre> : null}
      <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
        <p className="text-sm font-medium">Verify (PostgreSQL)</p>
        <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
          <div className="space-y-1">
            <Label>Symbol</Label>
            <Input value={verifySymbol} onChange={e => setVerifySymbol(e.target.value)} disabled={verifyBusy} />
          </div>
          <div className="space-y-1">
            <Label>Expiration (optional)</Label>
            <Input value={verifyExp} onChange={e => setVerifyExp(e.target.value)} disabled={verifyBusy} />
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={verifyBusy} onClick={() => void verifyDb()}>
          {verifyBusy ? 'Loading…' : 'Load option_snapshots (DB)'}
        </Button>
        {verifyErr ? <p className="text-sm text-destructive">{verifyErr}</p> : null}
        {verifyData ? (
          <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
            {JSON.stringify(verifyData, null, 2)}
          </pre>
        ) : null}
      </div>
    </MassiveServicePanel>
  )
}
