/**
 * The instance face (design Rev .101, `_Part InstanceRecord`; DESIGN_CONTRACTS
 * §14.4): one record wherever an instance is opened — inline as Trading › Rules'
 * record, or a right sheet over any page (the list behind it stays live, ‹ ›
 * and [ ] step the rows it came from, Esc closes). It replaces the old
 * five-box instance detail (Owner 2026-09-28).
 *
 * Every figure is the instance's own fills (`useInstanceRecord`); where a
 * reading has no source it says so rather than drawing a number.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { positionsUi } from '@/components/positions/positionsUi'
import { fmtPctSigned, fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { useTradeRecord } from '@/hooks/useTradeRecord'
import { useOpenTrade } from '@/layout/tradeGo'
import { useSymbolGo } from '@/layout/symbolGo'
import type { StrategyInstance } from '@/types/positions'
import { d3 } from '@/utils/tradeRecord/tradeRecordModel'
import { TradeRiskSection } from './TradeRiskSection'
import { TradeExecSection } from './TradeExecSection'
import { TradePositionSection } from './TradePositionSection'
import { InstanceKlineSection } from '@/components/strategy/instanceDetail/InstanceKlineSection'

export interface TradeRecordAction {
  label: string
  onClick?: () => void
  to?: string
  disabled?: boolean
  title?: string
}

type Section = 'all' | 'overview' | 'pnl' | 'risk' | 'chart' | 'exec'

const UNREALIZED = 'text-[var(--color-unrealized)]'
const stamp = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
const signed = (v: number | null | undefined) => (v == null ? '—' : v > 0 ? `+${fmtUsdRound(v)}` : fmtUsdRound(v))

export function TradeRecord({
  instance,
  mode,
  title,
  opportunity,
  structure,
  pos,
  from,
  onPrev,
  onNext,
  onFull,
  fullLabel = 'Full page ↗',
  list,
  ranUnder,
  actions = [],
}: {
  instance: StrategyInstance
  /**
   * Rev .103's three hosts: `panel` — the Instance surface's compact face (the
   * panel's own chrome closes it); `inline` — Trading › Rules' picked record;
   * `rail` — the Instance page's side column, Position and Risk only.
   */
  mode: 'panel' | 'inline' | 'rail'
  /** `#160 · MU +1`, as the page names it. */
  title: string
  opportunity: string
  structure: string
  pos?: string
  from?: string
  onPrev?: () => void
  onNext?: () => void
  /** Default: the Instance page. */
  onFull?: () => void
  fullLabel?: string
  /** The rows it came from — carried to the page. */
  list?: readonly number[]
  ranUnder?: { alloc: string; warn: boolean; onOpp?: () => void }
  actions?: TradeRecordAction[]
}) {
  const [section, setSection] = useState<Section>('all')
  const [source, setSource] = useState<'perf' | 'tws'>('perf')
  const [withShares, setWithShares] = useState(true)
  const r = useTradeRecord(instance, { tws: source === 'tws', withShares })
  const d = r.detail
  const isSheet = mode === 'panel'
  const openInstance = useOpenTrade()
  const symbolGo = useSymbolGo()
  const show = (k: Section) => section === 'all' || section === k
  const closed = r.life.closed
  const hasFills = r.legs.length > 0
  const inkFor = (v: number | null | undefined) => (closed ? pnlColorClass(v ?? 0) : UNREALIZED)

  const id = instance.strategy_instance_id
  const positionsTo = `/portfolio/positions?inst=${id}`
  const sym = r.legs[0]?.root ?? null
  // The face's own ways out (Rev .102): where its open legs are held, or its
  // review once flat; and the Ledger rows its fills are booked to.
  const footer: TradeRecordAction[] = [
    closed
      ? { label: 'Review this trade →', to: '/review/trade', title: 'Review › Trade review' }
      : { label: 'Position →', to: positionsTo, title: 'Portfolio › Positions — this trade’s open legs' },
    {
      label: 'Ledger →',
      to: hasFills ? `/portfolio/ledger?inst=${id}` : undefined,
      disabled: !hasFills,
      title: hasFills ? `Portfolio › Ledger — every fill booked to #${id}` : 'No fill booked yet',
    },
    ...(sym
      ? [{ label: `${sym} →`, onClick: () => symbolGo.go(sym, 'compare'), title: `Symbol · ${sym} beside — its chart and every trade on it` }]
      : []),
    ...actions,
  ]
  const full = onFull ?? (() => openInstance(id, { page: true, list, from }))
  const openLegs = r.legs.filter((l) => l.open)
  const contractLine = (closed ? r.legs : openLegs)
    .map((l) => `${l.side === 'Short' ? '−' : '+'}${closed ? l.qty : Math.abs(l.openQty)} ${l.strike}${l.right}`)
    .join(' / ')
  const expiries = [...new Set((closed ? r.legs : openLegs).map((l) => d3(l.expiry)))].join(' · ')
  const lifePct =
    r.life.totalDays && r.life.elapsed != null ? Math.min(100, Math.round((r.life.elapsed / r.life.totalDays) * 100)) : 0

  if (mode === 'rail') {
    // The page draws the rest wider; the rail keeps what is held and what it risks.
    return (
      <aside aria-label="Trade position and risk" className="flex min-w-0 flex-col gap-3">
        {r.loading ? (
          <p className="m-0 text-dense-meta text-muted-foreground">Reading its fills…</p>
        ) : (
          <>
            {r.position ? <TradePositionSection p={r.position} pending={r.positionPending} positionsTo={positionsTo} /> : null}
            <TradeRiskSection
              payoffs={r.payoffs}
              canCover={r.canCover}
              withShares={withShares}
              onWithShares={setWithShares}
              closed={closed}
            />
          </>
        )}
      </aside>
    )
  }

  return (
    <aside aria-label="Trade record" className={cn('flex min-w-0 flex-col gap-3', isSheet ? 'min-h-0 px-3.5 pt-2.5 pb-4' : '')}>
      {isSheet ? (
        <header className="flex flex-wrap items-center gap-2 border-b border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] pb-2">
          <span className="font-mono type-section font-semibold text-[var(--sk-trade,#c084fc)]">{title}</span>
          <span className="min-w-0 truncate text-dense-label text-[var(--sk-mute2)]">{opportunity}</span>
          <span className="ml-auto flex flex-none items-center gap-1">
            <button type="button" className={positionsUi.btn} onClick={onPrev} disabled={!onPrev} title="Previous row · [" aria-label="Previous trade">
              ‹
            </button>
            {pos ? <span className="font-mono text-dense-micro text-muted-foreground">{pos}</span> : null}
            <button type="button" className={positionsUi.btn} onClick={onNext} disabled={!onNext} title="Next row · ]" aria-label="Next trade">
              ›
            </button>
            <button
              type="button"
              className={positionsUi.btn}
              onClick={full}
              title={
                onFull
                  ? "Open as the page's record — Back returns to this list"
                  : 'The trade page: price chart, legs timeline, every fill, the ledger and the journal'
              }
            >
              {fullLabel}
            </button>
          </span>
        </header>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SegmentControl
          size="xs"
          ariaLabel="Section"
          value={section}
          onChange={(v) => setSection(v as Section)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'overview', label: 'Overview' },
            { value: 'pnl', label: 'P&L' },
            { value: 'risk', label: 'Risk' },
            { value: 'chart', label: 'Chart' },
            { value: 'exec', label: 'Executions' },
          ]}
        />
        {isSheet && from ? <span className="ml-auto text-dense-micro text-muted-foreground">from {from}</span> : null}
      </div>

      {r.loading ? (
        <p className="m-0 text-dense-meta text-muted-foreground">Reading its fills…</p>
      ) : !hasFills ? (
        <div className="flex flex-col gap-1 rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-3.5 py-3">
          <span className="text-dense-body font-semibold">No fill has claimed {title}</span>
          <span className="text-dense-label text-[var(--sk-mute2)] text-pretty">
            It has no legs, no P&amp;L and no risk. Link a fill to it on the Ledger, or delete it — nothing
            references it.
          </span>
        </div>
      ) : (
        <>
          {show('overview') ? (
            <>
              <div className="flex flex-col gap-2 rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <DenseTag variant={closed ? 'neutral' : 'success'} size="cell">
                    {closed ? 'Closed' : 'Open'}
                  </DenseTag>
                  <span className="text-dense-label font-semibold text-[var(--sk-soft)]">{structure}</span>
                  <span className="font-mono text-dense-label text-[var(--sk-contract,#7dd3fc)]">
                    {contractLine}
                    {expiries ? ` · ${expiries}` : ''}
                  </span>
                </div>
                <div data-sr-kpi="strip-inset" className="!p-0">
                  <PositionsStat
                    cap={closed ? 'Realised' : 'Net P&L · unrealized'}
                    value={signed(d?.displayNetPnl)}
                    ink={inkFor(d?.displayNetPnl)}
                    sub={closed ? 'flat by its own fills, fees in' : 'open legs at their marks'}
                  />
                  <PositionsStat cap="Return" value={fmtPctSigned(d?.returnPct)} ink={inkFor(d?.displayNetPnl)} sub={`${fmtPctSigned(d?.annualReturnPct)} annualised`} />
                  <PositionsStat
                    cap="Risk · cost"
                    value={d?.capitalAtRisk ? fmtUsdRound(d.capitalAtRisk) : '—'}
                    sub={d?.costPerDay != null ? `${fmtUsdRound(d.costPerDay)} / day` : ''}
                  />
                  <PositionsStat
                    cap={closed ? 'Held' : 'Day'}
                    value={
                      closed
                        ? r.life.totalDays != null
                          ? `${r.life.totalDays}d`
                          : '—'
                        : r.life.elapsed != null && r.life.totalDays != null
                          ? `${r.life.elapsed} / ${r.life.totalDays}`
                          : '—'
                    }
                    sub={
                      closed
                        ? 'open to close'
                        : r.life.expired
                          ? 'past expiry'
                          : r.life.totalDays != null && r.life.elapsed != null
                            ? `${r.life.totalDays - r.life.elapsed}d to expiry`
                            : ''
                    }
                  />
                </div>
              </div>

              {r.position ? (
                <TradePositionSection p={r.position} pending={r.positionPending} positionsTo={positionsTo} />
              ) : null}

              <div className="flex flex-col gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-3.5 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-dense-body font-semibold">Life</span>
                  <span className="text-dense-micro text-[var(--sk-mute2)]">
                    {closed
                      ? `opened ${d3(r.life.from)}, closed ${d3(r.life.to)} · ${r.life.totalDays ?? '—'} days`
                      : r.life.expired
                        ? 'past expiry and still open by its fills'
                        : `day ${r.life.elapsed ?? '—'} of ${r.life.totalDays ?? '—'}`}
                  </span>
                </div>
                <div className="relative h-[6px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)]">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full',
                      closed
                        ? 'bg-[color-mix(in_srgb,var(--sk-ink)_30%,transparent)]'
                        : r.life.expired
                          ? 'bg-[var(--sk-warn)]'
                          : 'bg-[color-mix(in_srgb,var(--color-unrealized)_70%,transparent)]',
                    )}
                    style={{ width: `${lifePct}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-dense-micro text-muted-foreground">
                  <span>{d3(r.life.from)} · opened</span>
                  <span>
                    {d3(r.life.to)} · {closed ? 'closed' : 'expiry'}
                  </span>
                </div>
                {r.life.expired ? (
                  <p className="m-0 text-dense-label text-warning text-pretty">
                    Past expiry with a leg still open — settle it on Trading › Expiration, or the book keeps marking a
                    contract that no longer trades.
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]">
                <div className="px-3.5 pt-2.5 pb-0.5 text-dense-body font-semibold">Legs</div>
                <div className="overflow-x-auto">
                  <table data-sr-table="" className="w-full">
                    <thead>
                      <tr>
                        <th>Contract</th>
                        <th>Side</th>
                        <th data-sr-col="num">Qty</th>
                        <th data-sr-col="num">Entry</th>
                        <th data-sr-col="num">{closed ? 'Exit' : 'Mark'}</th>
                        <th data-sr-col="num">P&amp;L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.legs.map((l) => (
                        <tr key={l.key}>
                          <td className="font-mono text-[var(--sk-contract,#7dd3fc)]">{l.label}</td>
                          <td className="text-[var(--sk-mute2)]">
                            {l.side}
                            {l.open ? '' : ' · flat'}
                          </td>
                          <td data-sr-col="num">{l.qty}</td>
                          <td data-sr-col="num">{l.entry != null ? `$${l.entry.toFixed(2)}` : '—'}</td>
                          <td
                            data-sr-col="num"
                            title={
                              l.exitKind === 'mark'
                                ? l.mark?.source === 'live'
                                  ? 'Live quote'
                                  : l.mark?.source === 'snap'
                                    ? `The vendor's snapshot of the contract, ${stamp(l.mark.asOf)} — the day's close only once the evening capture has run`
                                    : `The contract's last daily close, ${l.mark?.asOf}`
                                : l.exitKind === 'none'
                                  ? 'No quote now and no daily close on file for this contract'
                                  : 'Average of the closing fills'
                            }
                          >
                            {l.exit != null ? `$${l.exit.toFixed(2)}` : '—'}
                            {l.exitKind === 'mark' && l.mark?.source === 'eod' ? (
                              <span className="ml-1 text-dense-micro text-muted-foreground">EOD {l.mark.asOf?.slice(5)}</span>
                            ) : l.exitKind === 'mark' && l.mark?.source === 'snap' ? (
                              <span className="ml-1 text-dense-micro text-muted-foreground">snap {stamp(l.mark.asOf)}</span>
                            ) : null}
                          </td>
                          <td data-sr-col="num" className={l.pnl == null ? 'text-muted-foreground' : l.open ? UNREALIZED : pnlColorClass(l.pnl)}>
                            {l.pnl != null ? fmtUsd(l.pnl) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {r.marksPending ? (
                  <p className="m-0 px-3.5 pb-2 text-dense-micro text-muted-foreground">Reading marks for the open legs…</p>
                ) : null}
              </div>
            </>
          ) : null}

          {show('pnl') && d ? (
            <div className="flex flex-col gap-2 rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-3.5 py-3">
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="text-dense-body font-semibold">P&amp;L &amp; commission</span>
                <span className="text-dense-micro text-muted-foreground">
                  {closed ? 'closed — every figure is realised' : 'open — net includes the mark on open legs'}
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-x-4 gap-y-2">
                {(
                  [
                    ['Gross', d.displayNetPnl != null && d.totalCommission != null ? d.displayNetPnl + d.totalCommission : null, true],
                    ['Commission', d.totalCommission, false],
                    ['Net P&L', d.displayNetPnl, true],
                    ['Net / day', d.netPnlPerDay, true],
                    ['Risk · cost', d.capitalAtRisk || null, false],
                    ['Cost / day', d.costPerDay, false],
                  ] as const
                ).map(([k, v, pnl]) => (
                  <div key={k} className="flex min-w-0 flex-col gap-px">
                    <span className="text-dense-micro font-semibold text-muted-foreground">{k}</span>
                    <span className={cn('font-mono text-dense-body tabular-nums', v == null ? 'text-muted-foreground' : pnl ? inkFor(v) : 'text-foreground')}>
                      {v != null ? fmtUsd(v) : '—'}
                    </span>
                  </div>
                ))}
                {(
                  [
                    ['Return', d.returnPct],
                    ['Annualised', d.annualReturnPct],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex min-w-0 flex-col gap-px">
                    <span className="text-dense-micro font-semibold text-muted-foreground">{k}</span>
                    <span className={cn('font-mono text-dense-body tabular-nums', inkFor(d.displayNetPnl))}>{fmtPctSigned(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {show('risk') ? (
            <TradeRiskSection
              payoffs={r.payoffs}
              canCover={r.canCover}
              withShares={withShares}
              onWithShares={setWithShares}
              closed={closed}
            />
          ) : null}

          {show('chart') && r.legs[0]?.root ? (
            <div className="flex flex-col gap-2 rounded-xl bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-3.5 py-3">
              <span className="text-dense-body font-semibold">Chart · fills on the price</span>
              <InstanceKlineSection
                symbol={r.legs[0].root}
                executions={d?.executionsFinal ?? []}
                strategyInstanceId={instance.strategy_instance_id}
              />
            </div>
          ) : null}

          {show('exec') ? (
            <TradeExecSection groups={r.execGroups} source={source} onSource={setSource} tws={r.tws} twsLoading={r.twsLoading} />
          ) : null}
        </>
      )}

      {isSheet && ranUnder ? (
        <div className="flex flex-wrap items-baseline gap-2 text-dense-label">
          <span className="text-dense-micro font-semibold text-muted-foreground">Ran under</span>
          {ranUnder.onOpp ? (
            <button type="button" className={positionsUi.link} onClick={ranUnder.onOpp}>
              {opportunity}
            </button>
          ) : (
            <span>{opportunity}</span>
          )}
          <span className={ranUnder.warn ? 'text-warning' : 'text-[var(--sk-mute2)]'}>{ranUnder.alloc}</span>
        </div>
      ) : null}

      {isSheet ? (
        <footer className="flex flex-wrap gap-1.5 border-t border-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] pt-2">
          {footer.map((a) =>
            a.to ? (
              <Link key={a.label} to={a.to} className={cn(positionsUi.btn, 'no-underline')} title={a.title}>
                {a.label}
              </Link>
            ) : (
              <button key={a.label} type="button" className={positionsUi.btn} disabled={a.disabled} title={a.title} onClick={a.onClick}>
                {a.label}
              </button>
            ),
          )}
        </footer>
      ) : null}
    </aside>
  )
}
