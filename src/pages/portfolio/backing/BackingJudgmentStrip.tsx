/**
 * Pool · used · house gate 85% · spendable. Pressure ceiling stays on Room to add.
 */
import { cn } from '@/lib/utils'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import type { BackingJudgment } from '@/utils/backingJudgment'

function backingStripPct(v: number | null): string {
  return v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
}

function BackingStripStat({
  cap,
  value,
  hint,
  tone,
}: {
  cap: string
  value: string
  hint: string
  tone?: 'warning' | 'accent'
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-dense-caption font-semibold uppercase tracking-wider text-muted-foreground">
        {cap}
      </span>
      <span
        className={cn(
          'font-mono text-base font-semibold tabular-nums',
          tone === 'warning' && 'text-warning',
          tone === 'accent' && 'text-primary'
        )}
      >
        {value}
      </span>
      <span className="text-dense-caption text-muted-foreground">{hint}</span>
    </div>
  )
}

export function BackingJudgmentStrip({ judgment }: { judgment: BackingJudgment }) {
  const empty = !(judgment.pool > 0)
  return (
    <div
      className="flex flex-wrap items-end gap-x-7 gap-y-3 rounded-md border border-border bg-secondary/40 px-3.5 py-2.5"
      data-testid="backing-judgment-strip"
    >
      <BackingStripStat
        cap="Backing pool"
        value={empty ? '—' : fmtMvAbbrev(judgment.pool)}
        hint="priced stocks + cash/SGOV + income ETFs"
      />
      <BackingStripStat
        cap="Used"
        value={empty ? '—' : fmtMvAbbrev(judgment.used)}
        hint={`${backingStripPct(judgment.usedPct)} of pool · calls and puts`}
        tone={judgment.overGate ? 'warning' : undefined}
      />
      <BackingStripStat
        cap="Gate · 85%"
        value={empty ? '—' : fmtMvAbbrev(judgment.gate)}
        hint="House auto-derisk line · Rules does not read it yet"
      />
      <BackingStripStat
        cap="Space under gate"
        value={empty ? '—' : fmtMvAbbrev(judgment.spendable)}
        hint="what Sizing may spend against this line"
        tone="accent"
      />
      <p className="ml-auto max-w-sm text-dense-caption text-muted-foreground">
        Pressure ceiling lives on{' '}
        <a href="#room" className="text-link hover:underline">
          Room to add
        </a>{' '}
        (default 50% of 1 − Cushion). It is not this 85% line.
      </p>
    </div>
  )
}
