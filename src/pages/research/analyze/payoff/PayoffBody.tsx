/**
 * Payoff — the Symbol page's seventh face (design `Research Symbol.dc.html`
 * `isPayoff`, route rev 2026-09-17.1; the design routes `/research/payoff` at
 * this file, and the app routes it at `?tab=payoff`).
 *
 * A structure on this name, read before it exists: what it is worth at expiry
 * and today across spot, where it breaks even, how likely it is to keep its
 * credit, and what the greeks do as spot walks. The anchor leg comes from the
 * Chain face's hand-off (`?strike=&right=`) or defaults to the design's own
 * glance — the OTM put nearest |Δ| 0.30.
 *
 * The marks are the vendor's EOD closes; there is no bid/ask on the data plan
 * and the header says at close rather than dressing a close as a market.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchChainExpirations, fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { SegmentControl } from '@/components/data-display'
import { EmptyState } from '@/components/data-display'
import { PlanThisButton } from '@/components/research/PlanThisButton'
import { Button } from '@/components/ui/button'
import { useCreateHypothesis } from '@/hooks/useHypotheses'
import { useResearchContext } from '@/hooks/useResearchContext'
import { daysBack, todayIso } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { chainFromSnapshots, pickExpiry } from '@/utils/optionChain'
import { daysTo } from '@/utils/optionTicker'
import type { StructureKind, StructureSide } from '@/utils/optionDiscovery/discoveryStructure'
import { SYMBOL_PATH, TAB_PARAM } from '@/lib/symbolTabs'
import { Link } from 'react-router-dom'
import { PayoffChart } from './PayoffChart'
import {
  buildPayoffStructure,
  greeksBySpot,
  legFromParams,
  marginEstimate,
  payoffCurves,
  pickDefaultLeg,
  scenarioRows,
} from './payoffModel'

const fmtSigned = (v: number) =>
  `${v >= 0 ? '+' : '−'}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`

function Kv({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="whitespace-nowrap text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      <b className={cn('font-mono text-dense-body tabular-nums', tone ?? 'text-foreground')}>
        {value}
      </b>
    </div>
  )
}

const panel =
  'min-w-0 border mat-card'
const panelHead =
  'flex flex-wrap items-center gap-2.5 border-b px-3 py-1.75 text-dense-body leading-normal'
const cap =
  'whitespace-nowrap text-dense-caption font-semibold uppercase leading-normal tracking-[0.1em] text-muted-foreground'
const th =
  'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom text-dense-caption font-semibold text-secondary-foreground'
const td =
  'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs tabular-nums'

export function PayoffBody() {
  const { symbol } = useResearchContext()
  const sym = symbol.trim().toUpperCase()
  const today = todayIso()
  const [params, setParams] = useSearchParams()
  const [kind, setKind] = useState<StructureKind>('single')
  const [side, setSide] = useState<StructureSide>('short')
  const createHyp = useCreateHypothesis()
  const [hypNote, setHypNote] = useState<string | null>(null)

  const expQ = useQuery({
    queryKey: ['market', 'chain-expirations', sym, today],
    queryFn: () => fetchChainExpirations(sym, today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  // The session's close — the same series Compare prices against.
  const closeQ = useQuery({
    queryKey: ['market', 'daily-closes', sym, today],
    queryFn: () => fetchStockDailyCloses(sym, daysBack(today, 14), today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const spot =
    closeQ.data && closeQ.data.length > 0 ? closeQ.data[closeQ.data.length - 1].close : null

  const urlExpiry = params.get('expiration')
  // The design leans on the Chain face's expiry; a remounting tab cannot, so
  // the hand-off rides the URL and the default is a seller's month out.
  const expiry = useMemo(() => {
    const listed = expQ.data ?? []
    if (urlExpiry && listed.includes(urlExpiry)) return urlExpiry
    return pickExpiry(listed, today, 21, false) ?? listed[0] ?? null
  }, [expQ.data, urlExpiry, today])

  const snapQ = useQuery({
    queryKey: ['market', 'option-snapshots', sym, expiry],
    queryFn: () => fetchOptionSnapshots(sym, expiry!),
    enabled: Boolean(sym && expiry),
    staleTime: 10 * 60_000,
  })
  const chain = useMemo(() => chainFromSnapshots(snapQ.data?.rows ?? []), [snapQ.data])

  const strikeParam = Number(params.get('strike'))
  const rightParam = params.get('right')
  const picked = legFromParams(
    chain,
    Number.isFinite(strikeParam) && strikeParam > 0 ? strikeParam : null,
    rightParam === 'C' || rightParam === 'P' ? rightParam : null
  )
  const anchor = picked ?? (spot != null ? pickDefaultLeg(chain, spot) : null)

  const structure = useMemo(
    () => (anchor && spot != null ? buildPayoffStructure(kind, side, anchor, chain, spot) : null),
    [anchor, spot, kind, side, chain]
  )
  const dte = expiry ? (daysTo(expiry, today) ?? 0) : 0
  const curves = useMemo(
    () =>
      structure && spot != null ? payoffCurves(structure, spot, dte, anchor?.iv ?? null) : null,
    [structure, spot, dte, anchor]
  )
  const scen = useMemo(
    () =>
      structure && spot != null && curves ? scenarioRows(structure, spot, dte, curves.sigma) : [],
    [structure, spot, dte, curves]
  )
  const greekRows = useMemo(
    () => (structure && spot != null ? greeksBySpot(structure, spot, dte) : []),
    [structure, spot, dte]
  )

  if (!sym) {
    return (
      <EmptyState
        title="Pick a symbol"
        description="The payoff face reads one name's chain. Set a symbol in the shell's Lens."
      />
    )
  }
  if (expQ.isLoading || closeQ.isLoading || snapQ.isLoading) {
    return <p className="p-3 text-dense-meta text-muted-foreground">Reading the chain…</p>
  }
  if (!expiry || chain.length === 0 || spot == null) {
    return (
      <EmptyState
        title="No chain to price"
        description={`${sym} has ${!expiry ? 'no listed expiry' : spot == null ? 'no session close' : 'no priced contracts on this expiry'} in the vendor's snapshots — a fact about the data plan, not the market.`}
      />
    )
  }
  if (!anchor || !structure) {
    return (
      <EmptyState
        title="No contract to anchor"
        description="No priced contract on this expiry could seed a structure."
      />
    )
  }

  const profile = structure.profile
  const contractLabel = `${sym} ${expiry} ${anchor.strike}${anchor.right}`
  const legChips = [
    ...structure.legs.map((l) => ({
      sign: l.qty > 0 ? `+${l.qty}` : String(l.qty),
      pos: l.qty > 0,
      name: `${sym} ${expiry.slice(5)} ${l.strike}${l.right}`,
      px: l.avg_cost.toFixed(2),
    })),
    // A CSP's short-stock marker is the design's covered-put drawing; the one
    // payoff engine prices a cash-secured put without it (`payoffStockAtPrice`
    // ignores short shares), so no chip claims a leg the chart does not price.
    ...(structure.coveredShares > 0
      ? [
          {
            sign:
              structure.coveredShares > 0
                ? `+${structure.coveredShares}`
                : String(structure.coveredShares),
            pos: structure.coveredShares > 0,
            name: `${sym} stock`,
            px: spot.toFixed(2),
          },
        ]
      : []),
  ]
  const sigma1 = curves ? [spot * Math.exp(-curves.sigma), spot * Math.exp(curves.sigma)] : null
  const margin = marginEstimate(kind, side, structure, spot)
  const marginLabel =
    kind === 'covered'
      ? anchor.right === 'C'
        ? 'stock at risk'
        : 'cash secured'
      : side === 'short'
        ? 'margin (approx)'
        : 'debit'
  const maxP = profile?.max_gain
  const atSpotGreeks = greekRows.find((r) => r.atSpot)
  const midD = Math.round(dte / 2)
  const kindName = structure.title

  const thesis =
    side === 'short'
      ? `${kindName}: expects ${sym} to stay ${anchor.right === 'C' ? 'below' : 'above'} ${curves?.breakeven?.toFixed(0) ?? anchor.strike} through ${expiry}.`
      : `${kindName}: expects ${sym} to move ${anchor.right === 'C' ? 'above' : 'below'} ${curves?.breakeven?.toFixed(0) ?? anchor.strike} before ${expiry}.`

  return (
    <div className="space-y-3">
      {/* The structure bar — what is on the bench, and where it came from. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border px-3 py-1.5 mat-card">
        <span className={cap}>Structure</span>
        <SegmentControl
          ariaLabel="Structure"
          size="xs"
          value={kind}
          onChange={(v) => setKind(v as StructureKind)}
          options={[
            { value: 'single', label: 'Single' },
            { value: 'vertical', label: 'Vertical' },
            { value: 'covered', label: anchor.right === 'C' ? 'Covered' : 'CSP' },
          ]}
        />
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className={cap}>Side</span>
        <SegmentControl
          ariaLabel="Side"
          size="xs"
          value={side}
          onChange={(v) => setSide(v as StructureSide)}
          options={[
            { value: 'short', label: 'Short' },
            { value: 'long', label: 'Long' },
          ]}
        />
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className={cap}>Expiry</span>
        <select
          aria-label="Expiry"
          className="h-5.5 border px-1.5 font-mono text-xs text-foreground mat-field"
          value={expiry}
          onChange={(e) =>
            setParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('expiration', e.target.value)
              next.delete('strike')
              next.delete('right')
              return next
            })
          }
        >
          {(expQ.data ?? []).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <span className={cap}>Legs</span>
        {legChips.map((c, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-dense-meta tabular-nums mat-tag"
          >
            <span className={c.pos ? 'text-profit' : 'text-loss'}>{c.sign}</span>
            <span className="text-foreground">{c.name}</span>
            <span className="text-muted-foreground">@ {c.px}</span>
          </span>
        ))}
        <Link
          to={`${SYMBOL_PATH}?symbol=${encodeURIComponent(sym)}&${TAB_PARAM}=chain&expiration=${expiry}`}
          className="ml-auto whitespace-nowrap text-dense-meta text-primary hover:underline"
        >
          {picked
            ? 'from Chain · change →'
            : `default Δ ${Math.abs(anchor.delta ?? 0).toFixed(2)} put · pick in Chain →`}
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <section className={cn(panel, 'flex-[999_1_38.75rem]')} aria-label="P/L">
          <header className={panelHead}>
            <span className={cap}>P/L</span>
            <span className="text-dense-body font-semibold text-foreground">{kindName}</span>
            <span className="whitespace-nowrap text-dense-meta text-muted-foreground">
              {dte} DTE · IV {anchor.iv != null ? `${(anchor.iv * 100).toFixed(1)}%` : '—'}
              {sigma1 ? ` · ±1σ ${sigma1[0].toFixed(0)}–${sigma1[1].toFixed(0)}` : ''}
            </span>
            <span
              className="ml-auto whitespace-nowrap font-mono text-dense-caption text-muted-foreground"
              title="The vendor's end-of-day marks — there is no bid/ask on the data plan, so every price here is the session's last, not a quote."
            >
              at close · {snapQ.data?.expiration ?? expiry}
            </span>
          </header>
          {structure.unquotedWing || !curves ? (
            <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
              Wing unquoted — the adjacent strike has no close on this chain, so Vertical has no
              payoff. Not estimated.
            </p>
          ) : (
            <>
              <div className="px-3 pb-0.5 pt-2.5">
                <PayoffChart curves={curves} spot={spot} />
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(6.875rem,1fr))] gap-2.5 border-t border-border px-3 py-2.5">
                <Kv
                  label="max profit"
                  value={
                    maxP == null
                      ? profile?.risk_type === 'unlimited'
                        ? 'unbounded'
                        : '—'
                      : fmtSigned(maxP)
                  }
                  tone="text-profit"
                />
                <Kv
                  label="max loss"
                  value={
                    profile?.max_loss == null
                      ? profile?.risk_type === 'unlimited'
                        ? 'unbounded'
                        : '—'
                      : fmtSigned(-Math.abs(profile.max_loss))
                  }
                  tone="text-loss"
                />
                <Kv
                  label="loss at −2σ"
                  value={fmtSigned(scen[0]?.atExpiry ?? 0)}
                  tone={scen[0] && scen[0].atExpiry < 0 ? 'text-loss' : undefined}
                />
                <Kv
                  label="break-even"
                  value={curves.breakeven == null ? '—' : curves.breakeven.toFixed(2)}
                />
                <Kv
                  label="P(profit)"
                  value={curves.pop == null ? '—' : `${Math.round(curves.pop * 100)}%`}
                />
                <Kv
                  label={marginLabel}
                  value={margin == null ? '—' : `$${Math.abs(margin).toFixed(0)}`}
                />
                <Kv
                  label="return on risk"
                  value={
                    margin != null && margin > 0 && maxP != null
                      ? `${((maxP / margin) * 100).toFixed(1)}%`
                      : '—'
                  }
                />
                <Kv
                  label="θ / day · Δ"
                  value={
                    atSpotGreeks
                      ? `${atSpotGreeks.theta >= 0 ? '+' : '−'}$${Math.abs(atSpotGreeks.theta * 100).toFixed(2)} · ${(atSpotGreeks.delta * 100).toFixed(0)}`
                      : '—'
                  }
                />
              </div>
              <p className="m-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                {side === 'short'
                  ? 'Solid line is what you keep if it expires here; dashed is the mark tomorrow if spot moved and IV did not. The gap between them is theta you have not earned yet — a seller who closes early keeps only the dashed line. Shaded ±1σ / ±2σ come from the contract’s own IV, so a fat tail on P(profit) is the skew talking, not an edge.'
                  : 'Solid line is the payoff at expiry; dashed is the mark today across spot. Long premium needs the move before the dashed line decays into the solid one.'}
              </p>
            </>
          )}
        </section>

        <aside className="flex min-w-0 max-w-[28.75rem] flex-[1_1_20rem] flex-col gap-3">
          <section className={panel} aria-label="Scenarios">
            <header className={panelHead}>
              <span className={cap}>Scenarios</span>
              <span className="text-dense-body font-semibold text-foreground">where it lands</span>
              <span className="ml-auto text-dense-meta text-muted-foreground">
                σ from IV {anchor.iv != null ? `${(anchor.iv * 100).toFixed(1)}%` : '—'}
              </span>
            </header>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>Scenario</th>
                  <th className={th}>Spot</th>
                  <th className={th}>T+{midD}</th>
                  <th className={th}>Expiry</th>
                  <th className={th}>P</th>
                </tr>
              </thead>
              <tbody>
                {scen.map((r) => (
                  <tr
                    key={r.label}
                    className={r.flat ? 'bg-[rgb(var(--sk-accent-rgb)/0.04)]' : undefined}
                  >
                    <td className={cn(td, 'text-left font-sans')}>{r.label}</td>
                    <td className={cn(td, 'text-secondary-foreground')}>{r.spot.toFixed(0)}</td>
                    <td
                      className={cn(
                        td,
                        r.mid > 0 ? 'text-profit' : r.mid < 0 ? 'text-loss' : undefined
                      )}
                    >
                      {fmtSigned(r.mid)}
                    </td>
                    <td
                      className={cn(
                        td,
                        r.atExpiry > 0 ? 'text-profit' : r.atExpiry < 0 ? 'text-loss' : undefined
                      )}
                    >
                      {fmtSigned(r.atExpiry)}
                    </td>
                    <td className={cn(td, 'text-muted-foreground')}>{Math.round(r.prob * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              P = probability of ending at or beyond that spot under the lognormal the contract’s IV
              implies. The design adds earnings-gap rows when an earnings date sits inside the
              expiry; no forward earnings date is on the data plan, so none is drawn rather than
              guessed.
            </p>
          </section>

          <section className={panel} aria-label="Greeks by spot">
            <header className={panelHead}>
              <span className={cap}>Greeks by spot</span>
              <span className="text-dense-body font-semibold text-foreground">today</span>
            </header>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>Spot</th>
                  <th className={th}>Δ</th>
                  <th className={th}>Γ</th>
                  <th className={th}>Θ</th>
                  <th className={th}>Vega</th>
                </tr>
              </thead>
              <tbody>
                {greekRows.map((g) => (
                  <tr
                    key={g.spot}
                    className={g.atSpot ? 'bg-[rgb(var(--sk-accent-rgb)/0.04)]' : undefined}
                  >
                    <td
                      className={cn(td, g.atSpot ? 'text-foreground' : 'text-secondary-foreground')}
                    >
                      {g.spot.toFixed(0)}
                    </td>
                    <td className={td}>{g.delta.toFixed(2)}</td>
                    <td className={cn(td, 'text-secondary-foreground')}>{g.gamma.toFixed(3)}</td>
                    <td className={td}>{(g.theta * 100).toFixed(2)}</td>
                    <td className={td}>{(g.vega * 100).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="flex flex-wrap items-center gap-1.5">
            <PlanThisButton
              symbol={sym}
              source="symbol:payoff"
              sourceLabel="Symbol · payoff"
              contract={contractLabel}
              note={kindName}
              variant="primary"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={createHyp.isPending}
              title="Writes a hypothesis with this structure's claim; it settles on the Hypothesis Board."
              onClick={() =>
                createHyp.mutate(
                  {
                    title: `${kindName} · ${sym} ${expiry}`,
                    thesis,
                    symbols: [sym],
                    origin_page: 'symbol:payoff',
                    origin_ref: { contract: contractLabel, kind, side },
                  },
                  {
                    onSuccess: (h) =>
                      setHypNote(
                        `Hypothesis recorded · ${h.id} — settles on the Hypothesis Board.`
                      ),
                    onError: (e) => setHypNote(`Hypothesis failed: ${(e as Error).message}`),
                  }
                )
              }
            >
              → Hypothesis
            </Button>
            {hypNote ? (
              <span className="text-dense-meta text-muted-foreground">{hypNote}</span>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
