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
  denseTable,
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
          <span
            className={cn(
              'inline-flex min-w-0 flex-1 flex-wrap items-center gap-1',
              denseTable.entityCell,
            )}
          >
            {label ? (
              <DenseTag variant="instance" size="cell" className="whitespace-normal">
                {label}
              </DenseTag>
            ) : null}
            <DenseTag variant="instance" size="cell" className="font-mono">
              #{instanceId}
            </DenseTag>
            {oppName ? (
              <DenseTag variant="strategy" size="cell" className="whitespace-normal">
                {oppName}
              </DenseTag>
            ) : null}
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
