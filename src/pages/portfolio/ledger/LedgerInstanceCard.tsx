import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { CollapsibleChevron } from '@/components/data-display'
import { fmtCcy } from './ledgerFormat'
import { LedgerInstanceStateTag } from './LedgerInstanceStateTag'
import { ledgerGroupRowButtonClass, ledgerGroupRowWrapClass } from './ledgerShellUi'

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

/** One instance in the Instance view: a group row, and when open, its contracts and their fills. */
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
  const name = label?.trim() || oppName?.trim() || ''
  const showOpp = !!oppName?.trim() && oppName.trim() !== name
  return (
    <div>
      <div className={ledgerGroupRowWrapClass}>
        <button type="button" className={ledgerGroupRowButtonClass} onClick={onToggle} aria-expanded={expanded}>
          <CollapsibleChevron
            expanded={expanded}
            className={cn('h-3 w-3 self-center', expanded ? 'rotate-0' : '-rotate-90')}
          />
          <span className="font-mono text-dense-body font-bold text-[var(--color-instance-multi)]">#{instanceId}</span>
          <span className="min-w-0 flex-[1_1_200px] text-dense-body text-foreground">
            {name}
            {showOpp ? <span className="ml-2 text-dense-meta text-muted-foreground">{oppName}</span> : null}
          </span>
          <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
            Closed {closedCount} · Open {openCount} · PnL <span className={pnlColorClass(pnl)}>{fmtCcy(pnl)}</span>
          </span>
          <LedgerInstanceStateTag open={openCount > 0} />
        </button>
        <Link
          to={`/strategy/instances?instance=${instanceId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground hover:border-[var(--color-border-strong)] hover:text-foreground"
          title={`Open instance #${instanceId} in Strategy → Instances`}
          aria-label={`Open instance #${instanceId} in Strategy → Instances`}
        >
          <ArrowUpRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      {expanded && <div className="border-b border-border px-2.5 pb-2.5">{children}</div>}
    </div>
  )
}
