/**
 * Trade · Expiration Desk — what expires next, and what each leg is worth.
 *
 * The design leads with "this Friday". The book rarely has a leg there, so the
 * page leads with the nearest expiry it actually holds and says how far away
 * that is: a desk with nothing to decide should say so, not show an empty
 * Friday.
 *
 * A leg's mark is the vendor's dated close — the same snapshot Positions
 * prices its Greeks from (§14.2). The attribution service's own `price_mid` is
 * empty outside the session, so quoting it would blank the page after the close
 * instead of dating it.
 *
 * Nothing here writes. A decision belongs to Trade Plans, which already owns
 * that write; this page carries the leg to it (D10).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtUsd } from '@/utils/positions'
import { fmtCushionPct } from '@/utils/optionMoneyness'
import { fmtSignedUsd0 } from '@/utils/performanceReading'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { buildOptionTicker } from '@/utils/optionTicker'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchModelAnalysis } from '@/api/portfolio'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { usePositionAttribution } from '@/hooks/usePositionAttribution'
import { useOptionGreeks, type GreekLeg } from '@/hooks/useOptionGreeks'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { createStrategyPlan } from '@/api/strategyPlans'
import {
  DECISION_OPTIONS,
  EXPIRATION_NEAR_DAYS,
  EXPIRATION_UNRECORDED,
  buildExpiryLegs,
  decisionEffect,
  groupByExpiry,
  settleImpact,
  type ExpiryLeg,
  type LegDecision,
} from './expirationModel'

const PAGE_LEAD =
  'What expires next, what each leg is worth if it does, and what closing it would cost. A decision is written in Trade Plans; this page carries the leg there.'

const FOOT =
  'border-t border-border bg-[var(--sk-raised2)] px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty'

function ImpactRow({ k, v, tone, note }: { k: string; v: string; tone: 'up' | 'down' | 'warn' | 'muted'; note: string | null }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="min-w-0 flex-1 text-dense-meta leading-normal text-muted-foreground text-pretty">
        {k}
        {note ? <span className="ml-1.5 text-dense-caption">· {note}</span> : null}
      </span>
      <span
        className={cn(
          positionsUi.mono,
          'text-dense-body font-semibold',
          tone === 'up' && 'text-success',
          tone === 'down' && 'text-danger',
          tone === 'warn' && 'text-warning',
          tone === 'muted' && 'text-secondary-foreground',
        )}
      >
        {v}
      </span>
    </div>
  )
}

function isoDay(expiry: string): string {
  return `${expiry.slice(0, 4)}-${expiry.slice(4, 6)}-${expiry.slice(6, 8)}`
}

export default function ExpirationPage() {
  const { data: status, isLoading: statusLoading } = useMonitorStatus()
  const attrQuery = usePositionAttribution()
  const [pickedExpiry, setPickedExpiry] = useState<string | null>(null)

  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  const attributions = useMemo(() => attrQuery.data?.items ?? [], [attrQuery.data?.items])

  const accountIds = useMemo(
    () => (status?.portfolio?.accounts ?? []).map((a) => (a.account_id ?? '').trim()).filter(Boolean),
    [status],
  )
  const modelQueries = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: [...QUERY_KEYS.portfolio.modelAnalysis, id],
      queryFn: () => fetchModelAnalysis(id),
      enabled: Boolean(id),
    })),
  })
  const modelStamp = modelQueries.map((q) => q.dataUpdatedAt).join(',')

  /** Spot per underlying, as the model service prices it. */
  const spotBySymbol = useMemo(() => {
    const by = new Map<string, number | null>()
    for (const q of modelQueries) {
      for (const u of q.data?.per_underlying ?? []) {
        const symbol = (u.symbol ?? '').trim().toUpperCase()
        if (symbol && u.spot != null) by.set(symbol, u.spot)
      }
    }
    return by
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelStamp])

  /** One chain request per symbol × expiry the book holds — the same fetch Positions makes. */
  const greekLegs = useMemo<GreekLeg[]>(
    () =>
      attributions
        .filter((a) => (a.sec_type ?? '').toUpperCase() === 'OPT')
        .map((a) => ({
          underlying: (a.symbol ?? '').trim().toUpperCase().split(/\s+/)[0] ?? '',
          expiry: a.expiry ?? '',
          strike: Number(a.strike ?? 0),
          right: a.option_right ?? '',
          qty: Number(a.position_qty ?? 0),
        })),
    [attributions],
  )
  const greeks = useOptionGreeks(greekLegs)

  /**
   * Keyed by contract, and safe to key that way.
   *
   * `useOptionGreeks`'s `byTicker` holds *position* greeks keyed by contract,
   * so when the same contract is held more than once the last leg written wins
   * — which is why the Positions sub-table and Research › Contract Greeks scale
   * from `perShareByTicker` instead. This page cannot show one holding's greeks
   * on another holding's row, because it never draws a row per holding:
   * `buildExpiryLegs` nets every attribution row into one `ExpiryLeg` per
   * contract key and the table renders `key={l.contractKey}`. A desk decides a
   * contract once.
   *
   * It reads the per-share row all the same. The netted quantity can exceed any
   * single holding's — one contract in two accounts is summed — and only an
   * unscaled θ can then be scaled to match the Qty printed beside it.
   */
  const { markByKey, thetaPerShareByKey } = useMemo(() => {
    const marks = new Map<string, { close: number | null; asOf: string | null }>()
    const thetas = new Map<string, number>()
    for (const a of attributions) {
      if ((a.sec_type ?? '').toUpperCase() !== 'OPT') continue
      const ticker = buildOptionTicker({
        underlying: (a.symbol ?? '').trim().toUpperCase().split(/\s+/)[0] ?? '',
        expiry: a.expiry ?? '',
        strike: Number(a.strike ?? 0),
        right: a.option_right ?? '',
      })
      if (!ticker) continue
      const hit = greeks.closeByTicker.get(ticker)
      if (hit) marks.set(a.contract_key ?? '', hit)
      const theta = greeks.perShareByTicker.get(ticker)?.theta
      if (theta != null) thetas.set(a.contract_key ?? '', theta)
    }
    return { markByKey: marks, thetaPerShareByKey: thetas }
  }, [attributions, greeks.closeByTicker, greeks.perShareByTicker])

  const legs = useMemo(
    () => buildExpiryLegs({ attributions, markByKey, spotBySymbol, thetaPerShareByKey }),
    [attributions, markByKey, spotBySymbol, thetaPerShareByKey],
  )

  /**
   * Scratch until Create plans writes it. Keyed by contract, so switching the
   * picked expiry keeps what was already decided elsewhere.
   */
  const [decisions, setDecisions] = useState<Record<string, LegDecision>>({})
  const decisionMap = useMemo(() => new Map(Object.entries(decisions)), [decisions])
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  /**
   * One draft Trade Plan per leg decided roll or close, through the same call
   * the Plans form makes — the plan store keeps its one write path, and a
   * draft is a rulebook entry, not an order (D10: the desk copies, TWS
   * places). A roll's new contract is chosen on the plan itself, because the
   * vendor snapshot has no bid or ask to price one here.
   */
  async function createPlans(planLegs: ExpiryLeg[]) {
    setCreating(true)
    setCreateError(null)
    try {
      for (const leg of planLegs) {
        const d = decisionMap.get(leg.contractKey)
        const closing = d === 'close'
        await createStrategyPlan({
          account_id: leg.accounts[0] ?? '',
          symbol: leg.symbol,
          structure_label: `${closing ? 'Close' : 'Roll out of'} ${shortOptContractKey(leg.contractKey)}`,
          qty: Math.abs(leg.qty),
          legs: [
            {
              side: leg.qty < 0 ? 'buy' : 'sell',
              sec_type: 'OPT',
              right: leg.right === '' ? null : leg.right,
              strike: leg.strike,
              // The attribution's compact YYYYMMDD; the plan store wants ISO.
              expiry: isoDay(leg.expiry),
              ratio: 1,
              contract_key: leg.contractKey,
              mid_at_plan: leg.mark,
              quote_asof: leg.markAsOf,
            },
          ],
          price_effect: leg.qty < 0 ? 'debit' : 'credit',
          rationale: `${closing ? 'Close before expiry' : 'Roll'} — drafted from the Expiration Desk on ${today}. ${
            closing ? 'Priced off the dated vendor mark.' : 'Pick the new contract on this plan; no live quote exists on the desk.'
          }`,
          source_kind: 'manual',
          source_ref: `expiration:${leg.expiry}`,
        })
      }
      await queryClient.invalidateQueries({ queryKey: ['strategy', 'plans'] })
      navigate('/trade/plans?status=draft')
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }
  const groups = useMemo(() => groupByExpiry(legs, today), [legs, today])
  const nearest = groups[0] ?? null
  const selected = groups.find((g) => g.expiry === pickedExpiry) ?? nearest
  /** What the chosen paths add up to, over the picked expiry's decided legs. */
  const impact = useMemo(() => settleImpact(selected?.legs ?? [], decisionMap), [selected?.legs, decisionMap])
  const markAsOf = legs.find((l) => l.markAsOf)?.markAsOf ?? null

  const loading = statusLoading || attrQuery.isLoading
  const error = attrQuery.error ?? modelQueries.find((q) => q.error)?.error ?? null

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Expiration Desk">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Trade / Expiration</p>}
          title="Expiration"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              {nearest ? (
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  next {fmtIsoDateToken(isoDay(nearest.expiry))} ·{' '}
                  <span className={nearest.dte != null && nearest.dte <= EXPIRATION_NEAR_DAYS ? 'text-warning' : ''}>
                    {nearest.dte}d
                  </span>{' '}
                  away
                </span>
              ) : null}
              {markAsOf ? (
                <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
                  marks {fmtIsoDateToken(markAsOf.slice(0, 10))} close
                </span>
              ) : null}
              <Link to="/trade/plans" className={positionsUi.link}>
                Trade Plans →
              </Link>
            </span>
          }
        />

        {error ? <QueryErrorAlert error={error} onRetry={() => void attrQuery.refetch()} /> : null}
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-56 w-full rounded-md" />
          </div>
        ) : groups.length === 0 ? (
          <p className="m-0 border px-3 py-3 text-dense-meta text-muted-foreground mat-card">
            No option leg is open, so nothing expires.
          </p>
        ) : (
          <>
            <PositionsTier
              label={selected ? `Legs expiring ${fmtIsoDateToken(isoDay(selected.expiry))}` : 'Legs'}
              note="tightest first — the one nearest its strike is the one to decide"
            />
            <section className={positionsUi.panel} aria-label="Legs expiring">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.panelTitle}>
                  {impact.decided} of {selected?.legs.length ?? 0} decided
                </span>
                {selected && selected.unpriced < selected.legs.length ? (
                  <span className={cn(positionsUi.mono, 'text-dense-body font-bold', pnlColorClass(-selected.closeCost))}>
                    {fmtSignedUsd0(-selected.closeCost)} to close
                  </span>
                ) : null}
                <span className="text-dense-meta text-muted-foreground">
                  pin / flip and early assignment have no source — see the notes
                </span>
                <button
                  type="button"
                  className={cn(positionsUi.btn, 'ml-auto', impact.planCount > 0 && 'border-primary text-primary')}
                  disabled={impact.planCount === 0 || creating}
                  title={
                    impact.planCount === 0
                      ? 'Decide a leg as Roll or Close first — Expire and Assign need no plan'
                      : 'Write one draft Trade Plan per rolled or closed leg — a draft, not an order'
                  }
                  onClick={() =>
                    void createPlans(
                      (selected?.legs ?? []).filter((l) => {
                        const d = decisionMap.get(l.contractKey)
                        return d === 'close' || d === 'roll'
                      }),
                    )
                  }
                >
                  {creating ? 'Writing…' : `Create plans (${impact.planCount})`}
                </button>
              </header>
              {createError ? (
                <p className="m-0 border-b border-border/55 px-3 py-2 text-dense-meta text-danger text-pretty">
                  {createError}
                </p>
              ) : null}
              <div className="overflow-x-auto">
                {/* §14.6: eight columns since Decision and If chosen joined —
                    the design's own pair — at a 1180 floor. */}
                <table className="w-full min-w-[1180px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '17%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '23%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Leg</th>
                      <th className={positionsUi.th}>Qty</th>
                      <th className={positionsUi.th}>Mark</th>
                      <th className={positionsUi.th}>Spot</th>
                      <th className={positionsUi.th}>To strike</th>
                      <th className={positionsUi.th}>Cost to close</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Decision</th>
                      <th className={cn(positionsUi.th, 'text-left')}>If chosen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected?.legs ?? []).map((l) => (
                      <tr key={l.contractKey} className="hover:[&>td]:bg-[var(--sk-raised2)]">
                        <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                          {shortOptContractKey(l.contractKey)}
                          {l.accounts.length > 1 ? (
                            <span className="ml-1.5 font-normal text-dense-meta text-muted-foreground">
                              · {l.accounts.length} accounts
                            </span>
                          ) : null}
                        </td>
                        <td className={cn(positionsUi.td, l.qty < 0 ? 'text-warning' : 'text-secondary-foreground')}>
                          {l.qty > 0 ? `+${l.qty}` : l.qty}
                        </td>
                        <td className={cn(positionsUi.td, l.mark == null ? 'text-muted-foreground' : 'text-foreground')}>
                          {l.mark == null ? '—' : fmtUsd(l.mark)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-muted-foreground')}>
                          {l.spot == null ? '—' : fmtUsd(l.spot)}
                        </td>
                        <td
                          className={cn(
                            positionsUi.td,
                            l.cushionPct == null
                              ? 'text-muted-foreground'
                              : l.itm
                                ? 'text-warning'
                                : l.cushionPct < 0.05
                                  ? 'text-warning'
                                  : 'text-secondary-foreground',
                          )}
                        >
                          {fmtCushionPct(l.cushionPct)}
                          {l.itm ? ' ITM' : ''}
                        </td>
                        <td className={cn(positionsUi.td, l.closeCost == null ? 'text-muted-foreground' : pnlColorClass(-l.closeCost))}>
                          {l.closeCost == null ? '—' : fmtSignedUsd0(-l.closeCost)}
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans')}>
                          <SegmentControl
                            size="xs"
                            ariaLabel={`Decision for ${shortOptContractKey(l.contractKey)}`}
                            value={decisionMap.get(l.contractKey) ?? ''}
                            onChange={(v) =>
                              setDecisions((prev) => ({
                                ...prev,
                                [l.contractKey]: (prev[l.contractKey] === v ? '' : v) as LegDecision,
                              }))
                            }
                            options={DECISION_OPTIONS}
                          />
                        </td>
                        <td className={cn(positionsUi.td, 'text-left font-sans whitespace-normal')}>
                          {(() => {
                            const d = decisionMap.get(l.contractKey) ?? ''
                            if (d === '') {
                              return <span className="text-dense-meta text-muted-foreground">undecided</span>
                            }
                            const eff = decisionEffect(l, d)
                            return (
                              <span
                                className={cn(
                                  'text-dense-meta leading-normal text-pretty',
                                  eff.tone === 'up' && 'text-success',
                                  eff.tone === 'down' && 'text-danger',
                                  eff.tone === 'warn' && 'text-warning',
                                  eff.tone === 'muted' && 'text-muted-foreground',
                                )}
                              >
                                {eff.text}
                              </span>
                            )
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                To strike is signed towards trouble, so both rights read the same way: a short call is troubled by spot
                rising to the strike, a short put by spot falling to it. {EXPIRATION_UNRECORDED.decide}
              </p>
            </section>

            <div className={positionsUi.bandGrid}>
              <section className={positionsUi.panel} aria-label="If it all settles as chosen">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>If it all settles as chosen</span>
                  <span className={positionsUi.panelTitle}>cash &amp; backing</span>
                </header>
                {impact.decided === 0 ? (
                  <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">
                    Nothing is decided yet. Choose a path per leg above and this band adds up what those choices do —
                    undecided legs stay outside the numbers rather than being assumed to expire.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 px-3 py-2.5">
                    <ImpactRow
                      k="Credits kept by expiring / assigning"
                      v={
                        impact.creditsKept > 0
                          ? `+${fmtUsd(impact.creditsKept)}`
                          : impact.creditsUnknown > 0
                            ? '—'
                            : '$0'
                      }
                      tone={impact.creditsKept > 0 ? 'up' : 'muted'}
                      note={impact.creditsUnknown > 0 ? `${impact.creditsUnknown} without an entry cost` : null}
                    />
                    <ImpactRow
                      k="Paid to close, at the dated mark"
                      v={impact.closePaid !== 0 ? fmtSignedUsd0(-impact.closePaid) : '$0'}
                      tone={impact.closePaid > 0 ? 'down' : 'muted'}
                      note={impact.closeUnpriced > 0 ? `${impact.closeUnpriced} without a mark` : null}
                    />
                    <ImpactRow
                      k="Cash needed if assigned"
                      v={impact.assignCash > 0 ? `−${fmtUsd(impact.assignCash)}` : '$0'}
                      tone={impact.assignCash > 0 ? 'warn' : 'muted'}
                      note={impact.assignShareLegs > 0 ? `${impact.assignShareLegs} short call${impact.assignShareLegs === 1 ? '' : 's'} deliver shares, not cash` : null}
                    />
                    <ImpactRow
                      k="Θ lost by closing early"
                      v={impact.thetaLost > 0 ? `−${fmtUsd(impact.thetaLost)}/d` : '$0'}
                      tone="muted"
                      note={impact.thetaUnknown > 0 ? `${impact.thetaUnknown} without a vendor θ` : null}
                    />
                    <ImpactRow
                      k="Backing after"
                      v="n/c"
                      tone="muted"
                      note="the pool re-priced is Backing & Model’s computation — read it there"
                    />
                  </div>
                )}
                <p className={cn(FOOT, 'm-0')}>
                  Numbers move with the decisions above. Nothing here places an order — Create plans writes draft Trade
                  Plans with the leg and the dated mark filled in, and the desk copies them into TWS (D10).
                </p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Early assignment watch">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Early assignment watch</span>
                  <span className={positionsUi.panelTitle}>a dividend before expiry</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ needs a corporate-action feed
                  </DenseTag>
                </header>
                <p className="m-0 px-3 py-2.5 text-xs leading-normal text-secondary-foreground text-pretty">
                  A short call goes early when the dividend it gives up is worth more than the time value it keeps. That
                  is a comparison between one number this page has — the mark — and one it does not: the next ex-date.
                </p>
                <p className={cn(FOOT, 'm-0')}>{EXPIRATION_UNRECORDED.assign}</p>
              </section>

              <section className={cn(positionsUi.panel, 'border-warning/40')} aria-label="Pin and roll">
                <header className={positionsUi.panelHead}>
                  <span className={positionsUi.cap}>Pin, flip and the roll</span>
                  <DenseTag variant="warning" size="cell">
                    ⚠ no reading
                  </DenseTag>
                </header>
                {[
                  { what: 'Pin / flip level', why: EXPIRATION_UNRECORDED.pin },
                  { what: 'Roll candidate and its credit', why: EXPIRATION_UNRECORDED.roll },
                ].map((row) => (
                  <div key={row.what} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border/55 px-3 py-1.75 last:border-b-0">
                    <span className="inline-flex items-center gap-1.5 text-xs leading-normal text-foreground">
                      <StatusLamp lamp="gray" variant="dot" title="No reading — not a fault" />
                      {row.what}
                    </span>
                    <span className="min-w-0 flex-[1_1_14rem] text-dense-meta leading-normal text-muted-foreground text-pretty">
                      {row.why}
                    </span>
                  </div>
                ))}
              </section>
            </div>

            {/* Last, where the design files it: after Friday is what the
                desk reads once today is decided. */}
            <PositionsTier
              label="Next expiries"
              note={
                nearest?.dte != null && nearest.dte > EXPIRATION_NEAR_DAYS
                  ? `nothing inside ${EXPIRATION_NEAR_DAYS} days — the desk has nothing to decide today`
                  : 'a leg inside the week is the desk’s business'
              }
            />
            <section className={positionsUi.panel} aria-label="Next expiries">
              <header className={positionsUi.panelHead}>
                <span className={positionsUi.cap}>Ladder</span>
                <span className={positionsUi.panelTitle}>
                  {groups.length} {groups.length === 1 ? 'expiry' : 'expiries'} · {legs.length} legs
                </span>
                <SegmentControl
                  size="xs"
                  ariaLabel="Expiry"
                  value={selected?.expiry ?? ''}
                  onChange={setPickedExpiry}
                  options={groups.map((g) => ({
                    value: g.expiry,
                    label: `${fmtIsoDateToken(isoDay(g.expiry))} · ${g.dte}d`,
                  }))}
                />
                {greeks.unmatched > 0 ? (
                  <span className="ml-auto inline-flex items-center gap-1.5 text-dense-meta text-muted-foreground">
                    <StatusLamp lamp="gray" variant="dot" title="No vendor row — not a fault" />
                    {greeks.unmatched} {greeks.unmatched === 1 ? 'leg' : 'legs'} the vendor could not price
                  </span>
                ) : null}
              </header>
              <div className="overflow-x-auto">
                {/* §14.6: six columns, the design's 720 floor. */}
                <table className="w-full min-w-[720px] table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '16%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '22%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className={cn(positionsUi.th, 'text-left')}>Expiry</th>
                      <th className={positionsUi.th}>Legs</th>
                      <th className={positionsUi.th}>ITM</th>
                      <th className={positionsUi.th}>Tightest</th>
                      <th className={positionsUi.th}>Cost to close</th>
                      <th className={cn(positionsUi.th, 'text-left')}>Reading</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => {
                      const on = g.expiry === selected?.expiry
                      const near = g.dte != null && g.dte <= EXPIRATION_NEAR_DAYS
                      return (
                        <tr
                          key={g.expiry}
                          className={cn('cursor-pointer', on ? '[&>td]:bg-[var(--sk-surface)]' : 'hover:[&>td]:bg-[var(--sk-raised2)]')}
                          onClick={() => setPickedExpiry(g.expiry)}
                        >
                          <td className={cn(positionsUi.td, 'pl-2 text-left font-bold text-[var(--color-entity-option)]')}>
                            {fmtIsoDateToken(isoDay(g.expiry))}{' '}
                            <span className={cn('font-normal', near ? 'text-warning' : 'text-muted-foreground')}>
                              {g.dte}d
                            </span>
                          </td>
                          <td className={cn(positionsUi.td, 'text-secondary-foreground')}>{g.legs.length}</td>
                          <td className={cn(positionsUi.td, g.itm > 0 ? 'text-warning' : 'text-muted-foreground')}>
                            {g.itm > 0 ? g.itm : '—'}
                          </td>
                          <td className={cn(positionsUi.td, (g.tightest ?? 1) < 0.05 ? 'text-warning' : 'text-secondary-foreground')}>
                            {fmtCushionPct(g.tightest)}
                          </td>
                          <td className={cn(positionsUi.td, g.unpriced === g.legs.length ? 'text-muted-foreground' : pnlColorClass(-g.closeCost))}>
                            {g.unpriced === g.legs.length ? '—' : fmtSignedUsd0(-g.closeCost)}
                          </td>
                          <td className={cn(positionsUi.td, 'text-left font-sans text-muted-foreground')}>
                            {g.unpriced > 0 ? `${g.unpriced} unpriced · ` : ''}
                            {near ? 'inside the week' : 'not yet the desk’s'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className={cn(FOOT, 'm-0')}>
                Cost to close is what buying every priced leg back would cost at the vendor&rsquo;s dated close — a credit
                when the book is long. A leg the vendor could not price is counted, never summed as zero.
              </p>
            </section>


            <p className="m-0 border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty mat-card">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> This page says what is about to
              expire and what it would cost to act. What the position is, and what backs it, is{' '}
              <Link to="/portfolio/positions" className={positionsUi.link}>
                Positions&rsquo;
              </Link>
              ; the decision itself is written in{' '}
              <Link to="/trade/plans" className={positionsUi.link}>
                Trade Plans
              </Link>
              , never here.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
