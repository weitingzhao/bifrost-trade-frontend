/**
 * The verdict: pool, used, the 85% house gate and the space under it — then
 * the model that produced them, folded away until asked for.
 *
 * The four figures and the seven assumptions were two blocks at opposite ends
 * of the page, so a reader checking "what is this 85% of?" had to scroll past
 * everything between them. They are one panel now: the numbers, and under them
 * the basis they rest on, including the two the page does not compute and says
 * so rather than guessing.
 */
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { StatusLamp } from '@/components/StatusLamp'
import { HeroCard, HeroRow } from '@/components/layout'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtMvAbbrev } from '@/utils/positionsCharts'
import { backingAssumptionRows } from '@/utils/backingAssumptions'
import type { BackingJudgment } from '@/utils/backingJudgment'

function sharePct(v: number | null): string {
  return v == null || !Number.isFinite(v) ? '—' : `${Math.round(v * 100)}%`
}

export function BackingVerdictPanel({
  judgment,
  pressureCeiling,
}: {
  judgment: BackingJudgment
  /** 1 − Cushion ceiling on Room to add; the basis rows quote it beside the house gate. */
  pressureCeiling: number
}) {
  const [basisOpen, setBasisOpen] = useState(false)
  const empty = !(judgment.pool > 0)
  const rows = backingAssumptionRows({ judgment, pressureCeiling })
  const unknown = rows.filter((r) => r.unknown)

  return (
    <div className="space-y-2.5" data-testid="backing-judgment-strip">
      {/* §16.2 (Rev .86): the four figures leave the panel for a hero row
          above it. Space under gate is a figure, not the active thing — ink,
          not the accent. */}
      <HeroRow label="Backing verdict">
        <HeroCard
          label="Backing pool"
          value={empty ? '—' : fmtMvAbbrev(judgment.pool)}
          sub="priced stocks + cash/SGOV + income ETFs"
        />
        <HeroCard
          label="Used"
          value={empty ? '—' : fmtMvAbbrev(judgment.used)}
          valueClassName={judgment.overGate ? 'text-warning' : undefined}
          state={judgment.overGate ? 'warn' : null}
          sub={`${sharePct(judgment.usedPct)} of pool · calls and puts`}
        />
        <HeroCard
          label="Gate · 85%"
          value={empty ? '—' : fmtMvAbbrev(judgment.gate)}
          sub="House auto-derisk line · Rules does not read it yet"
        />
        <HeroCard
          label="Space under gate"
          value={empty ? '—' : fmtMvAbbrev(judgment.spendable)}
          sub="headroom under the 85% house line"
        />
      </HeroRow>
    <section className={positionsUi.panel} aria-label="Backing verdict">
      {/* The two house lines stay on screen (§16.3's exception): read without
          it, the 85% and the pressure ceiling look like one number. */}
      <p className="m-0 px-3.5 py-2 text-xs leading-normal text-muted-foreground text-pretty">
        Two different house lines. The 85% gate is pool usage; the pressure ceiling on{' '}
        <a href="#room" className={positionsUi.link}>
          Room to add
        </a>{' '}
        (default 50% of 1 − Cushion) is the broker&rsquo;s Cushion. Neither is the other.
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-3 py-1.5">
        <button
          type="button"
          className={positionsUi.btn}
          onClick={() => setBasisOpen((v) => !v)}
          aria-expanded={basisOpen}
        >
          <span className="text-muted-foreground">{basisOpen ? '▾' : '▸'}</span>
          Model basis · {rows.length} assumptions
        </button>
        {unknown.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-dense-meta leading-normal text-muted-foreground">
            <StatusLamp lamp="gray" variant="dot" title="Unknown — not a fault" />
            {unknown.length} unknown: {unknown.map((r) => r.key.toLowerCase()).join(' · ')}
          </span>
        ) : null}
        <span className="min-w-0 flex-[1_1_16rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
          This page computes pool, used, share and the house gate; everything else cites them. If two pages disagree, this
          page is the source.
        </span>
      </div>

      {basisOpen ? (
        <div className="border-t border-border" data-testid="backing-assumptions">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[9.25rem_minmax(0,1.25fr)_minmax(0,1fr)] items-start border-b border-border/55 last:border-b-0"
            >
              <span className="px-2.5 py-1.5 text-dense-meta leading-normal text-muted-foreground">{row.key}</span>
              <span className="flex gap-1.5 px-2.5 py-1.5 text-xs leading-normal text-foreground text-pretty">
                {row.unknown ? <StatusLamp lamp="gray" variant="dot" title="Unknown — not a fault" className="mt-1 shrink-0" /> : null}
                {row.value}
              </span>
              <span className={cn(positionsUi.mono, 'px-2.5 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty')}>
                {row.source}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
    </div>
  )
}
