/**
 * Structure builder on the Chain tab — Single / Vertical / Covered × Long / Short.
 *
 * Prototype payoff tab collapsed onto the selected contract: reuse the portfolio
 * riskProfile engine (no second payoff math). ＋ Plan this structure queues an
 * advisory handoff with the contract label. D10-safe.
 */
import { useMemo, useState } from 'react'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { SegmentControl } from '@/components/data-display'
import { PlanThisButton } from '@/components/research/PlanThisButton'
import { RiskProfilePayoffChart } from '@/components/positions/RiskProfilePayoffChart'
import { fmtUsd } from '@/lib/format'
import {
  adjacentStrikeStep,
  buildStructureLegs,
  rightOf,
  structureTitle,
  wingPremiumOnChain,
  type StructureKind,
  type StructureSide,
} from '@/utils/optionDiscovery/discoveryStructure'
import {
  computeRiskProfile,
  formatRiskUsd,
  type RiskCalcContext,
} from '@/utils/riskProfile'

export function DiscoveryStructurePanel({
  symbol,
  expiration,
  row,
  spot,
  chain,
  strikes,
}: {
  symbol: string
  expiration: string
  row: OptionSnapshotRow
  spot: number | null
  chain: readonly OptionSnapshotRow[]
  strikes: readonly number[]
}) {
  const [kind, setKind] = useState<StructureKind>('single')
  const [side, setSide] = useState<StructureSide>('short')
  const sym = symbol.trim().toUpperCase()

  const built = useMemo(() => {
    const stepHint = adjacentStrikeStep(strikes, row.strike, rightOf(row))
    const { wingMid } = wingPremiumOnChain(row, chain, spot, stepHint)
    return buildStructureLegs({ row, kind, side, spot, wingMid, stepHint })
  }, [row, kind, side, spot, chain, strikes])

  const title = structureTitle(kind, side, row, built.wing)
  const contractLabel = `${sym} ${expiration || '—'} ${row.strike}${
    (row.right || '').trim().toUpperCase().startsWith('C') ? 'C' : 'P'
  }`

  const ctx: RiskCalcContext = useMemo(
    () => ({
      positions: built.legs,
      covered_shares: Math.abs(built.coveredShares),
      underlying_avg_cost: spot,
    }),
    [built.legs, built.coveredShares, spot],
  )

  const profile = useMemo(
    () =>
      built.unquotedWing
        ? null
        : computeRiskProfile(built.legs, Math.abs(built.coveredShares), spot),
    [built.unquotedWing, built.legs, built.coveredShares, spot],
  )

  return (
    <section
      id="structure"
      className="scroll-mt-16 space-y-2 rounded border border-border/60 bg-muted/15 px-3 py-2"
      aria-label="Structure"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Structure
        </span>
        <span className="text-dense-meta font-medium text-foreground">{title}</span>
        <span className="font-mono text-dense-micro text-muted-foreground">{contractLabel}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <PlanThisButton
            symbol={sym}
            source="symbol:chain"
            sourceLabel="Symbol · chain"
            contract={contractLabel}
            note={title}
            variant="primary"
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentControl
          ariaLabel="Structure kind"
          size="sm"
          value={kind}
          onChange={(v) => setKind(v as StructureKind)}
          options={[
            { value: 'single', label: 'Single' },
            { value: 'vertical', label: 'Vertical' },
            { value: 'covered', label: 'Covered / CSP' },
          ]}
        />
        {kind !== 'covered' ? (
          <SegmentControl
            ariaLabel="Structure side"
            size="sm"
            value={side}
            onChange={(v) => setSide(v as StructureSide)}
            options={[
              { value: 'short', label: 'Short' },
              { value: 'long', label: 'Long' },
            ]}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 text-dense-meta">
        <span className="text-muted-foreground">Legs</span>
        {built.unquotedWing ? (
          <span className="text-foreground">Wing unquoted</span>
        ) : (
          built.legs.map((g, i) => (
          <span key={`${g.strike}-${g.right}-${i}`} className="inline-flex gap-1 font-mono tabular-nums">
            <span className="text-muted-foreground">{g.qty > 0 ? `+${g.qty}` : String(g.qty)}</span>
            <span className="text-foreground">
              {sym} {g.strike}
              {g.right}
            </span>
            <span className="text-muted-foreground">@ {fmtUsd(g.avg_cost)}</span>
          </span>
          ))
        )}
        {built.coveredShares !== 0 ? (
          <span className="font-mono tabular-nums text-muted-foreground">
            {built.coveredShares > 0 ? '+' : ''}
            {built.coveredShares} sh @ {spot != null ? fmtUsd(spot) : '—'}
          </span>
        ) : null}
      </div>

      {built.unquotedWing || !profile ? (
        built.unquotedWing ? (
        <p className="text-dense-meta text-muted-foreground">
          Wing unquoted — the adjacent strike has no mid on this chain, so Vertical has no
          payoff. Not estimated (§2.1).
        </p>
        ) : null
      ) : (
        <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Max profit"
          value={
            profile.max_gain == null
              ? profile.risk_type === 'unlimited'
                ? 'Unlimited'
                : '—'
              : formatRiskUsd(profile.max_gain)
          }
        />
        <Metric
          label="Max loss"
          value={
            profile.max_loss == null
              ? profile.risk_type === 'unlimited'
                ? 'Unlimited'
                : '—'
              : formatRiskUsd(profile.max_loss)
          }
        />
        <Metric
          label="Break-even"
          value={
            profile.breakeven_prices.length
              ? profile.breakeven_prices.map((p) => p.toFixed(0)).join(' · ')
              : '—'
          }
        />
        <Metric label="Net premium" value={formatRiskUsd(profile.net_premium)} />
      </div>

      <RiskProfilePayoffChart profile={profile} ctx={ctx} variant="compact" />

      <p className="text-dense-micro text-muted-foreground">
        At expiry · per 1 contract · before commissions. Observe-only (D10).
      </p>
        </>
      )}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border/40 px-2 py-1">
      <div className="text-dense-micro uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-dense-meta tabular-nums text-foreground">{value}</div>
    </div>
  )
}
