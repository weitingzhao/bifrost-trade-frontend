/**
 * The sheet's right column (Trade Plans sheet): verdict with its lamp, the
 * rows the verdict rests on, the memory hint, the pressure bar against the
 * trader's ceiling, and the derivation it shares with Room to add.
 */
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'
import { riskLevelFor } from '@/hooks/usePressureCeiling'
import type { CheckLamp, CheckTone, PlanCheck } from './planCheck'
import { MemoryHintLine } from './MemoryHintLine'

const LAMP: Record<CheckLamp, 'green' | 'yellow' | 'red' | 'gray'> = {
  ok: 'green',
  degraded: 'yellow',
  fail: 'red',
  unknown: 'gray',
}

const TONE: Record<CheckTone, string> = {
  ink: 'text-foreground',
  profit: 'text-profit',
  loss: 'text-loss',
  warn: 'text-[var(--sk-warn)]',
}

const BAR_FILL: Record<CheckTone, string> = {
  ink: 'bg-[var(--sk-soft)]',
  profit: 'bg-profit',
  loss: 'bg-loss',
  warn: 'bg-[var(--sk-warn)]',
}

const clampPct = (v: number) => Math.min(100, Math.max(0, v * 100))

export function PlanCheckPanel({ check, symbol }: { check: PlanCheck; symbol: string }) {
  const { bar } = check
  const now = bar.now != null ? clampPct(bar.now) : null
  const after = bar.after != null ? clampPct(bar.after) : null
  const add = now != null && after != null ? Math.max(0, after - now) : 0
  const level = riskLevelFor(bar.ceiling)
  return (
    <aside
      aria-label="Backing check"
      className="flex min-h-0 flex-col gap-3 overflow-y-auto bg-[var(--sk-raised)] p-4"
    >
      <div className="flex items-center gap-2">
        <StatusLamp lamp={LAMP[check.lamp]} variant="dot" title={check.lamp} />
        <span className="text-dense-body font-semibold">{check.verdict}</span>
      </div>

      <dl className="flex flex-col gap-2.5">
        {check.rows.map((row) => (
          <div key={row.k} className="flex items-baseline gap-2 text-dense-label">
            <dt className="flex-1 text-muted-foreground">
              {row.k}
              {row.note ? <span className="ml-1.5 text-dense-meta text-muted-foreground/70">{row.note}</span> : null}
            </dt>
            <dd className={cn('font-mono font-semibold tabular-nums', TONE[row.tone ?? 'ink'])}>{row.v}</dd>
          </div>
        ))}
      </dl>

      {/* §20.6 — one quiet line when a memory names this symbol. */}
      <MemoryHintLine symbol={symbol} />

      <div
        className="relative h-1.5 rounded bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]"
        role="img"
        aria-label={
          now != null
            ? `Pressure ${Math.round(now)}%${after != null ? ` to ${Math.round(after)}%` : ''}, ceiling ${Math.round(bar.ceiling * 100)}%`
            : 'Pressure not read'
        }
      >
        <div className="absolute inset-y-0 left-0 overflow-hidden rounded" style={{ width: `${now ?? 0}%` }}>
          <div className="h-full w-full bg-[var(--sk-faint)]" />
        </div>
        {add > 0 ? (
          <div className={cn('absolute inset-y-0', BAR_FILL[bar.tone])} style={{ left: `${now}%`, width: `${add}%` }} />
        ) : null}
        <div className="absolute -inset-y-0.5 w-px bg-foreground" style={{ left: `${clampPct(bar.ceiling)}%` }} />
      </div>
      <div className="flex justify-between text-dense-meta text-muted-foreground">
        <span>pressure now → after</span>
        <span title={level.meaning}>
          ceiling {Math.round(bar.ceiling * 100)}% · {level.label.toLowerCase()}
        </span>
      </div>

      <p className="border-t border-border pt-2.5 text-dense-label text-muted-foreground text-pretty">{check.note}</p>
      <p className="text-dense-meta text-muted-foreground text-pretty">
        Same derivation as Room to add on Backing &amp; Model: Reg-T short-put margin on the account&rsquo;s
        current maintenance; covered calls check free shares, not cash. The ceiling is your risk level there.
      </p>
    </aside>
  )
}
