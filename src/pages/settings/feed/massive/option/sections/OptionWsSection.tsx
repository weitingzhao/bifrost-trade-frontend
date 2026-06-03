import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MassiveServicePanel } from '@/pages/settings/feed/massive/components/MassiveServicePanel'
import { feedMassiveOptionSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'

const WS_VERIFY_CMD = 'python scripts/verify_massive_options_ws.py --config config/config.dev.yaml'

const CHANNEL_BY_ROW: Record<string, string> = {
  'ws-aggregates-s': 'A.O',
  'ws-aggregates-m': 'AM.O',
  'ws-quotes': 'Q.O',
  'ws-trades': 'T.O',
  fmv: 'FMV.O',
  websocket: '',
}

export function OptionWsSection({
  row,
  effectiveStatus,
  expanded,
  highlighted,
  onToggle,
  evidence,
  configured,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  highlighted?: boolean
  onToggle: () => void
  evidence?: React.ReactNode
  configured: boolean
}) {
  const [ticker, setTicker] = useState('O:AAPL251219C00200000')
  const prefix = CHANNEL_BY_ROW[row.id] ?? ''

  const verifyCmd = useMemo(() => {
    if (row.id === 'websocket') return WS_VERIFY_CMD
    const ch = prefix && ticker.trim() ? `${prefix}:${ticker.trim()}` : prefix
    return ch ? `${WS_VERIFY_CMD} --channel "${ch}"` : WS_VERIFY_CMD
  }, [row.id, prefix, ticker])

  const copyCmd = async () => {
    try {
      await navigator.clipboard.writeText(verifyCmd)
    } catch {
      /* ignore */
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
      <p className="text-sm text-muted-foreground">{row.description}</p>
      {effectiveStatus === 'not-on-tier' ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Current tier does not include this channel. Upgrade plan or enable trades where required.
        </p>
      ) : null}
      {row.id !== 'websocket' ? (
        <div className="space-y-1 max-w-md">
          <Label htmlFor={`ws-ticker-${row.id}`}>Options ticker (for channel suffix)</Label>
          <Input
            id={`ws-ticker-${row.id}`}
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            disabled={!configured}
            placeholder="O:AAPL251219C00200000"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Verify command (run in terminal)</p>
        <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">{verifyCmd}</pre>
        <Button type="button" variant="outline" size="sm" onClick={() => void copyCmd()}>
          Copy command
        </Button>
      </div>
      {row.testHint ? <p className="text-xs text-muted-foreground">{row.testHint}</p> : null}
    </MassiveServicePanel>
  )
}
