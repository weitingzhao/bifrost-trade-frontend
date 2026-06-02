import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupStats,
  DenseTag,
} from '@/components/data-display'
import { fmtCcy } from './ledgerFormat'

type Props = {
  instanceId: number
  label?: string | null
  oppName?: string | null
  closedCount: number
  openCount: number
  pnl: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
}

export function LedgerInstanceCard({
  instanceId,
  label,
  oppName,
  closedCount,
  openCount,
  pnl,
  expanded,
  onToggle,
  children,
}: Props) {
  return (
    <CollapsibleGroup variant="card">
      <div className="flex items-stretch">
        <CollapsibleGroupHeader expanded={expanded} onToggle={onToggle} className="flex-1">
          <CollapsibleChevron expanded={expanded} />
          <span className="min-w-0 truncate">
            {label ? <span title={label}>{label} </span> : null}
            <span className="font-mono">#{instanceId}</span>
            {oppName && (
              <span className="ml-1 text-[length:var(--text-dense-meta)] text-muted-foreground">
                ({oppName})
              </span>
            )}
          </span>
          <CollapsibleGroupStats>
            <span>Closed: {closedCount}</span>
            <span>Open: {openCount}</span>
            <span className={cn('font-mono tabular-nums', pnlColorClass(pnl))}>
              PnL: {fmtCcy(pnl)}
            </span>
          </CollapsibleGroupStats>
        </CollapsibleGroupHeader>
        <Link
          to={`/strategy/instances?instance=${instanceId}`}
          className="mr-2 shrink-0 self-center no-underline"
          target="_blank"
          rel="noopener noreferrer"
          title={label ? `Open instance #${instanceId} (${label})` : `Open instance #${instanceId}`}
        >
          <DenseTag variant="success" size="pill">
            Open
          </DenseTag>
        </Link>
      </div>
      {expanded && <CollapsibleGroupBody>{children}</CollapsibleGroupBody>}
    </CollapsibleGroup>
  )
}
