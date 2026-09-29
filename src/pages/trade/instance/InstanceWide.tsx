/**
 * The Instance page, wide (design Rev .103, `Instance.dc.html`): six blocks.
 *
 * The head reads it (Net P&L · return · risk · day · fills); Symbol's own price
 * chart draws it lit against its name's other trades; the legs run open to
 * close on a timeline with the roll seams; every fill booked to it; the ledger
 * by leg. The rail carries its lineage and siblings, the shared record's
 * Position and Risk, and the notes written about it.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHead, PageHeadAction } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { PositionsStat } from '@/components/positions/PositionsStat'
import { positionsUi } from '@/components/positions/positionsUi'
import { SymbolPriceChart } from '@/components/symbolChart/SymbolPriceChart'
import { instanceTracksFor } from '@/components/symbolChart/symbolPriceModel'
import { InstanceRecord } from '@/components/instanceRecord/InstanceRecord'
import { useInstanceRecord } from '@/hooks/useInstanceRecord'
import { useSymbolGo } from '@/layout/symbolGo'
import { withSymbolParam } from '@/lib/symbolLink'
import { todayIso } from '@/lib/researchFreshness'
import { fmtPctSigned, fmtUsd, fmtUsdRound } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { d3 } from '@/utils/instanceRecord/instanceRecordModel'
import type { RanUnder } from '@/utils/instanceRecord/ranUnder'
import type { StrategyInstance } from '@/types/positions'
import { byOpening, fillRows, ledgerRows, timelineRows } from './instancePageModel'
import { InstanceJournal, InstanceLineage } from './InstanceRail'
import { InstanceBlock } from './InstanceBlock'

const UNREALIZED = 'text-[var(--color-unrealized)]'
const signed = (v: number | null | undefined) => (v == null ? '—' : v > 0 ? `+${fmtUsdRound(v)}` : fmtUsdRound(v))
const px = (v: number | null) => (v == null ? '—' : `$${v.toFixed(2)}`)


export function InstanceWide({
  instance,
  list,
  from,
  pos,
  onPrev,
  onNext,
  ranUnder,
}: {
  instance: StrategyInstance
  list?: readonly number[]
  from: string
  pos?: string
  onPrev?: () => void
  onNext?: () => void
  ranUnder: RanUnder | null
}) {
  const navigate = useNavigate()
  const symbolGo = useSymbolGo()
  const id = instance.strategy_instance_id
  const today = todayIso()
  const r = useInstanceRecord(instance, { withShares: true })
  const d = r.detail
  const execs = useMemo(() => d?.executionsFinal ?? [], [d?.executionsFinal])
  const legs = useMemo(() => byOpening(r.legs), [r.legs])
  const sym = legs[0]?.root ?? null
  const closed = r.life.closed
  const expired = r.life.expired
  const joints = useMemo(() => (sym ? (instanceTracksFor(execs, sym, [])[0]?.joints ?? []) : []), [execs, sym])
  const fills = useMemo(
    () => fillRows(execs, (ck) => legs.find((l) => l.key === ck)?.label ?? ck.split('|')[0], today),
    [execs, legs, today],
  )
  const ledger = useMemo(() => ledgerRows(legs, r.execGroups, joints), [legs, r.execGroups, joints])
  const timeline = useMemo(() => timelineRows(legs, joints, today), [legs, joints, today])

  const openLegs = legs.filter((l) => l.open)
  const contract = (closed ? legs : openLegs)
    .map((l) => `${l.side === 'Short' ? '−' : '+'}${closed ? l.qty : Math.abs(l.openQty)} ${l.strike}${l.right}`)
    .join(' / ')
  const lastExp = openLegs.map((l) => l.expiry).filter(Boolean).sort().pop() ?? null
  const inkFor = (v: number | null | undefined) => (closed ? pnlColorClass(v ?? 0) : UNREALIZED)
  const total = r.life.totalDays
  const el = r.life.elapsed
  const lifeNote = !legs.length
    ? 'no fill yet'
    : closed
      ? `${d3(r.life.from)} → ${d3(r.life.to)} · ${total ?? '—'} days`
      : expired
        ? 'past expiry, still open by its fills'
        : `day ${el ?? '—'} of ${total ?? '—'} · ${total != null && el != null ? total - el : '—'}d to expiry`

  return (
    <>
      <PageHead
        title={`#${id}${sym ? ` · ${sym}` : ''}`}
        info="One strategy instance, whole: its price path, every leg and roll, every fill booked to it, the ledger by leg and the notes written about it. Reached from any #NNN token; beside any page it opens as the 440 panel."
        meta={`${instance.strategy_opportunity_name ?? '—'} · ${closed ? 'closed' : 'open'}`}
        actions={
          <>
            {sym ? (
              <PageHeadAction title={`Research › Symbol on ${sym} — the full detail page`} onClick={() => navigate(withSymbolParam('/research/symbol', sym))}>
                {sym} · Symbol page →
              </PageHeadAction>
            ) : null}
            <PageHeadAction title="Portfolio › Positions — where its open legs are marked" onClick={() => navigate(`/portfolio/positions?inst=${id}`)}>
              Positions →
            </PageHeadAction>
            <PageHeadAction title={`Portfolio › Trade Ledger — every fill booked to #${id}`} onClick={() => navigate(`/portfolio/ledger?inst=${id}`)}>
              Ledger →
            </PageHeadAction>
            {closed ? (
              <PageHeadAction title="Review › Single trade" onClick={() => navigate('/review/fit')}>
                Review →
              </PageHeadAction>
            ) : null}
          </>
        }
      />

      <div data-sr-toolbar="">
        <DenseTag variant={closed ? 'neutral' : expired ? 'warning' : 'success'} size="cell">
          {closed ? 'Closed' : expired ? 'Past expiry' : 'Open'}
        </DenseTag>
        {sym ? (
          <button
            type="button"
            onClick={() => symbolGo.go(sym, 'compare')}
            title={`Symbol · ${sym} beside — its chart and every instance on it`}
            className="cursor-pointer rounded border-0 bg-transparent px-0.5 font-mono text-dense-body font-bold text-[var(--sk-ticker)] hover:underline"
          >
            {sym}
          </button>
        ) : null}
        <span className="text-dense-label font-semibold text-[var(--sk-soft)]">{instance.strategy_structure_name ?? '—'}</span>
        <span className="font-mono text-dense-label text-[var(--sk-contract,#7dd3fc)]">
          {contract}
          {!closed && lastExp ? ` ${d3(lastExp)}` : ''}
        </span>
        {pos ? (
          <>
            <span data-sr-tb="sep" />
            <span className="text-dense-micro text-muted-foreground">from {from}</span>
            <span className="inline-flex items-center gap-1">
              <button type="button" className={positionsUi.btn} onClick={onPrev} disabled={!onPrev} title="Previous in the list · [" aria-label="Previous instance">
                ‹
              </button>
              <span className="font-mono text-dense-micro text-muted-foreground">{pos}</span>
              <button type="button" className={positionsUi.btn} onClick={onNext} disabled={!onNext} title="Next in the list · ]" aria-label="Next instance">
                ›
              </button>
            </span>
          </>
        ) : null}
        <span className="ml-auto text-dense-micro text-muted-foreground">{lifeNote}</span>
      </div>

      <div data-sr-kpi="strip">
        <PositionsStat
          cap={closed ? 'Realised' : 'Net P&L · unrealized'}
          value={signed(d?.displayNetPnl)}
          ink={inkFor(d?.displayNetPnl)}
          sub={closed ? 'flat by its own fills, fees in' : 'open legs at their marks'}
        />
        <PositionsStat cap="Return" value={fmtPctSigned(d?.returnPct)} ink={inkFor(d?.displayNetPnl)} sub={`${fmtPctSigned(d?.annualReturnPct)} annualised`} />
        <PositionsStat cap="Risk · cost" value={d?.capitalAtRisk ? fmtUsdRound(d.capitalAtRisk) : '—'} sub={d?.costPerDay != null ? `${fmtUsdRound(d.costPerDay)} / day` : ''} />
        <PositionsStat
          cap={closed ? 'Held' : 'Day'}
          value={closed ? `${total ?? '—'}d` : `${el ?? '—'} / ${total ?? '—'}`}
          ink={expired ? 'text-warning' : undefined}
          sub={closed ? 'open to close' : expired ? 'past expiry' : total != null && el != null ? `${total - el}d to expiry` : ''}
        />
        <PositionsStat
          cap="Fills"
          value={String(fills.rows.length)}
          sub={legs.length ? `${legs.length} ${legs.length === 1 ? 'leg' : 'legs'}${joints.length ? ' · rolled' : ''}` : 'nothing booked'}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-3">
          {sym ? <SymbolPriceChart symbol={sym} instanceId={id} /> : null}

          <InstanceBlock cap="Legs" title="Timeline" note="open to close · ↻ a roll seam, net beside it · dashed = held to expiry">
            <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3">
              <div className="grid grid-cols-[minmax(160px,240px)_minmax(0,1fr)] gap-3">
                <span />
                <div className="relative h-3.5 font-mono text-dense-micro text-muted-foreground">
                  <span className="absolute left-0">{d3(timeline.from)}</span>
                  {timeline.todayAt != null && timeline.todayAt > 12 && timeline.todayAt < 88 ? (
                    <span className="absolute -translate-x-1/2 text-foreground" style={{ left: `${timeline.todayAt}%` }}>
                      today
                    </span>
                  ) : null}
                  <span className="absolute right-0">{d3(timeline.to)}</span>
                </div>
              </div>
              {timeline.rows.map((row) => (
                <div key={row.key} className="grid grid-cols-[minmax(160px,240px)_minmax(0,1fr)] items-center gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-mono text-dense-label text-[var(--sk-contract,#7dd3fc)]">{row.label}</span>
                    <span className="truncate text-dense-micro text-[var(--sk-mute2)]" title={row.side}>
                      {row.side}
                    </span>
                  </div>
                  <div className="relative h-5.5 rounded bg-[color-mix(in_srgb,var(--sk-ink)_3%,transparent)]">
                    {timeline.todayAt != null ? (
                      <span className="absolute inset-y-0 border-l border-dashed border-[color-mix(in_srgb,var(--sk-ink)_35%,transparent)]" style={{ left: `${timeline.todayAt}%` }} />
                    ) : null}
                    {row.segs.map((sg, i) => (
                      <span
                        key={i}
                        className="absolute top-2.5 h-0"
                        style={{
                          left: `${sg.left}%`,
                          width: `${sg.width}%`,
                          borderTop:
                            sg.kind === 'held'
                              ? '3px solid var(--sk-contract)'
                              : '2px dashed color-mix(in srgb, var(--sk-contract) 55%, transparent)',
                        }}
                      />
                    ))}
                    {row.marks.map((mk, i) => (
                      <span
                        key={i}
                        title={mk.title}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none"
                        style={{
                          left: `${mk.at}%`,
                          fontSize: mk.glyph === '↻' ? 13 : 9,
                          color: mk.glyph === '↻' ? 'var(--sk-instance)' : 'var(--sk-contract)',
                        }}
                      >
                        {mk.glyph}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </InstanceBlock>

          <InstanceBlock
            cap="Fills"
            title={`${fills.rows.length} ${fills.rows.length === 1 ? 'fill' : 'fills'} booked to #${id}`}
            note="Flex is the statement of record; today's fills come from TWS until it lands"
            action={
              <button type="button" className={positionsUi.link} onClick={() => navigate('/trade/fills')}>
                Orders &amp; Fills →
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table data-sr-table="" className="w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fill</th>
                    <th>Contract</th>
                    <th>Side</th>
                    <th data-sr-col="num">Qty</th>
                    <th data-sr-col="num">Price</th>
                    <th data-sr-col="num">Comm</th>
                    <th data-sr-col="num">Cash</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {fills.rows.map((f) => (
                    <tr key={f.key}>
                      <td className="font-mono whitespace-nowrap">{d3(f.date)}</td>
                      <td className="font-mono text-dense-micro text-muted-foreground">{f.id}</td>
                      <td className="font-mono whitespace-nowrap text-[var(--sk-contract,#7dd3fc)]" title={f.occ}>
                        {f.label}
                      </td>
                      <td className="font-mono font-semibold">{f.side}</td>
                      <td data-sr-col="num">{f.qty}</td>
                      <td data-sr-col="num">{f.price.toFixed(2)}</td>
                      <td data-sr-col="num" className="text-[var(--sk-mute2)]">
                        {fmtUsd(f.comm)}
                      </td>
                      <td data-sr-col="num" className={pnlColorClass(f.cash)}>
                        {fmtUsd(f.cash)}
                      </td>
                      <td className="text-dense-micro text-[var(--sk-mute2)]">{f.source}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={6} className="font-semibold">
                      Net cash
                    </td>
                    <td data-sr-col="num" className="text-[var(--sk-mute2)]">
                      {fmtUsd(fills.comm)}
                    </td>
                    <td data-sr-col="num" className={cn('font-semibold', pnlColorClass(fills.cash))}>
                      {fmtUsd(fills.cash)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </InstanceBlock>

          <InstanceBlock
            cap="Ledger"
            title="P&L by leg"
            note={closed ? 'closed — every leg realised' : 'open legs marked at their mark · a rolled leg is realised at its buy-back'}
            action={
              <button type="button" className={positionsUi.link} onClick={() => navigate(`/portfolio/ledger?inst=${id}`)}>
                Trade Ledger →
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table data-sr-table="" className="w-full">
                <thead>
                  <tr>
                    <th>Leg</th>
                    <th>Opened</th>
                    <th>Closed</th>
                    <th data-sr-col="num">Qty</th>
                    <th data-sr-col="num">Entry</th>
                    <th data-sr-col="num">Exit · mark</th>
                    <th data-sr-col="num">Gross</th>
                    <th data-sr-col="num">Comm</th>
                    <th data-sr-col="num">Net</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.rows.map((l) => {
                    const ink = (v: number | null) => (v == null ? 'text-muted-foreground' : l.realised ? pnlColorClass(v) : UNREALIZED)
                    return (
                      <tr key={l.key}>
                        <td className="font-mono whitespace-nowrap text-[var(--sk-contract,#7dd3fc)]">{l.label}</td>
                        <td className="font-mono whitespace-nowrap">{l.opened}</td>
                        <td className="font-mono whitespace-nowrap text-[var(--sk-mute2)]">{l.closed}</td>
                        <td data-sr-col="num">{l.qty}</td>
                        <td data-sr-col="num">{px(l.entry)}</td>
                        <td data-sr-col="num">{px(l.exit)}</td>
                        <td data-sr-col="num" className={ink(l.gross)}>
                          {l.gross == null ? '—' : fmtUsd(l.gross)}
                        </td>
                        <td data-sr-col="num" className="text-[var(--sk-mute2)]">
                          {fmtUsd(l.comm)}
                        </td>
                        <td data-sr-col="num" className={cn('font-semibold', ink(l.net))}>
                          {l.net == null ? '—' : fmtUsd(l.net)}
                        </td>
                        <td>
                          <DenseTag variant={l.realised ? 'neutral' : 'warning'} size="cell">
                            {l.realised ? 'Realised' : 'Unrealized'}
                          </DenseTag>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-x-4.5 gap-y-1 border-t border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 pt-2 pb-2.5 font-mono text-dense-label text-[var(--sk-mute2)]">
              <span>
                Realised <span className={cn('font-semibold', pnlColorClass(ledger.realised))}>{fmtUsd(ledger.realised)}</span>
              </span>
              {!closed ? (
                <span>
                  Unrealized <span className={cn('font-semibold', UNREALIZED)}>{ledger.unrealized == null ? '—' : fmtUsd(ledger.unrealized)}</span>
                </span>
              ) : null}
              <span>
                Commission <span className="font-semibold">{fmtUsd(ledger.comm)}</span>
              </span>
              <span>
                Net P&amp;L{' '}
                <span className={cn('font-semibold', closed ? pnlColorClass(ledger.realised) : UNREALIZED)}>
                  {ledger.unrealized == null && !closed ? '—' : fmtUsd(ledger.realised + (ledger.unrealized ?? 0))}
                </span>
              </span>
            </div>
          </InstanceBlock>
        </div>

        <aside className="flex min-w-0 max-w-[440px] flex-[1_1_340px] flex-col gap-3">
          <InstanceLineage instance={instance} sym={sym} ranUnder={ranUnder} from={from} list={list} />
          <InstanceRecord
            instance={instance}
            mode="rail"
            title={`#${id}`}
            opportunity={instance.strategy_opportunity_name ?? '—'}
            structure={instance.strategy_structure_name ?? '—'}
          />
          <InstanceJournal id={id} sym={sym} />
        </aside>
      </div>
    </>
  )
}
