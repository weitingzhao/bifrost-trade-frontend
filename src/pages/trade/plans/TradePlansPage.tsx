/**
 * Trade › Plans — landing for ＋ Plan this handoffs.
 *
 * The full Plans desk (Trade Plans.dc.html) is still unbuilt. This page is the
 * thin receiver: it lists advisory drafts queued from Symbol / Chain with
 * source · rule · contract, and refuses order placement (D10). Growing it into
 * the designed sheet is a later walk — not this exit's job.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  clearPlanHandoffs,
  dismissPlanHandoff,
  listPlanHandoffs,
  type PlanHandoff,
} from '@/lib/planHandoff'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'

function formatWhen(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  return new Date(t).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TradePlansPage() {
  const [params] = useSearchParams()
  const highlight = params.get('handoff')
  const [tick, setTick] = useState(0)
  const items = useMemo(() => {
    void tick
    return listPlanHandoffs()
  }, [tick])

  function refresh() {
    setTick((n) => n + 1)
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Plans"
        description="Advisory drafts from Research. Observe-only (D10) — nothing here places an order."
        actions={
          items.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-dense-meta"
              onClick={() => {
                clearPlanHandoffs()
                refresh()
              }}
            >
              Clear queue
            </Button>
          ) : null
        }
      />

      {items.length === 0 ? (
        <p className="rounded border border-border/60 bg-muted/20 px-3 py-4 text-dense-meta text-muted-foreground">
          No plan drafts on this desk yet. From Symbol, press{' '}
          <span className="text-foreground">＋ Plan this</span> — the handoff
          lands here with source · rule · contract.
        </p>
      ) : (
        <ul className="divide-y divide-border/50 rounded border border-border/60">
          {items.map((h) => (
            <PlanRow
              key={h.id}
              handoff={h}
              highlight={h.id === highlight}
              onDismiss={() => {
                dismissPlanHandoff(h.id)
                refresh()
              }}
            />
          ))}
        </ul>
      )}
    </PageShell>
  )
}

function PlanRow({
  handoff: h,
  highlight,
  onDismiss,
}: {
  handoff: PlanHandoff
  highlight: boolean
  onDismiss: () => void
}) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2 text-dense-meta',
        highlight && 'bg-primary/5',
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link
            to={withSymbolParam(SYMBOL_PATH, h.symbol)}
            className="font-mono font-semibold text-foreground hover:underline"
          >
            {h.symbol}
          </Link>
          <span className="text-muted-foreground">{h.sourceLabel}</span>
          <span className="font-mono text-dense-micro text-muted-foreground/70">
            {formatWhen(h.createdAt)}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 text-muted-foreground">
          {h.rule ? (
            <span>
              rule <span className="font-mono text-foreground">{h.rule}</span>
            </span>
          ) : null}
          {h.contract ? (
            <span>
              contract <span className="font-mono text-foreground">{h.contract}</span>
            </span>
          ) : null}
          {h.note ? <span className="text-foreground/80">{h.note}</span> : null}
        </div>
        <p className="text-dense-micro text-muted-foreground">
          Advisory draft · not an order intent · D10 blocked
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 text-dense-meta text-muted-foreground"
        onClick={onDismiss}
      >
        Dismiss
      </Button>
    </li>
  )
}
