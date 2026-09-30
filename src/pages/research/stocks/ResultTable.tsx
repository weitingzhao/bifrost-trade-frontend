/**
 * Result (Rev .121 #4, .122 #2): the names that pass the screen, ordered by
 * the chosen model. Columns follow the model; the Models column shows each
 * model's own bar (S / R / P, lit when cleared, — when not covered). Names the
 * model does not cover sit under a "Not rated by X" group, A–Z, never mixed
 * into the ranking.
 */
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  denseTableNumCell,
} from '@/components/data-display'
import { AddToPoolButton } from '@/components/research/AddToPoolButton'
import { DiscoveryCapture } from '@/components/research/DiscoveryCapture'
import { PlanThisButton } from '@/components/research/PlanThisButton'
import { RuleCell } from '@/components/research/RuleCell'
import { rowSelectProps } from '@/hooks/useRowLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { withSymbolParam } from '@/lib/symbolLink'
import { regimeVariant, type VolRule } from '@/lib/research/volRatingsModel'
import { cn } from '@/lib/utils'
import type { SepaDiscoveryHit } from '@/hooks/useResearchHomeData'
import { MODEL_TINT, NOT_RATED, ROW_CAP } from './stockScreenView'
import {
  AGREE_BAR,
  MODEL_LABEL,
  clears,
  covered,
  type AgreeId,
  type ModelKey,
  type NameRow,
  type RankModel,
} from './stockScreenModel'

export interface Scored {
  row: NameRow
  score: number | null
}

export type SortKey = 'score' | 'trend' | 'growth' | 'ivr' | 'vrp'

function pathVariant(p: string): 'success' | 'info' | 'danger' | 'neutral' {
  return p === 'PIVOT' ? 'success' : p === 'SETUP' ? 'info' : p === 'AVOID' ? 'danger' : 'neutral'
}

const MARKS: { id: AgreeId; k: string; m: ModelKey }[] = [
  { id: 'm_sepa', k: 'S', m: 'sepa' },
  { id: 'm_radar', k: 'R', m: 'radar' },
  { id: 'm_prem', k: 'P', m: 'premium' },
]

function ModelMarks({ r }: { r: NameRow }) {
  return (
    <div className="flex gap-[3px]">
      {MARKS.map(({ id, k, m }) => {
        const has = covered(r, id)
        const hit = clears(r, id)
        const text = m === 'sepa' ? r.sepa?.path : m === 'radar' ? r.radar?.grade : r.prem?.serverScore?.toFixed(0)
        const detail =
          m === 'sepa'
            ? r.sepa
              ? `${r.sepa.grade} · ${r.sepa.path} · comp ${r.sepa.comp.toFixed(0)}`
              : 'not evaluated'
            : m === 'radar'
              ? r.radar
                ? `grade ${r.radar.grade} · score ${r.radar.score.toFixed(1)}`
                : 'not graded on the latest session'
              : r.prem
                ? `composite ${r.prem.serverScore?.toFixed(0) ?? '—'} · ${r.prem.regime ?? '—'}`
                : 'not in its 691'
        return (
          <span
            key={id}
            title={`${MODEL_LABEL[m]}: ${detail}${has ? (hit ? ' · clears its bar' : ' · below its bar') : ''} (${AGREE_BAR[id]})`}
            className={cn(
              'inline-flex h-[18px] items-center gap-1 whitespace-nowrap rounded-full px-1.5 font-mono text-dense-caption',
              hit ? 'bg-foreground/[0.13] font-semibold text-foreground' : has ? 'text-muted-foreground' : 'text-[var(--sk-faint)]',
            )}
          >
            <span className="font-bold" style={{ color: MODEL_TINT[m] }}>
              {k}
            </span>
            {has ? text : '—'}
          </span>
        )
      })}
    </div>
  )
}

interface Col {
  label: string
  sort?: SortKey
  title?: string
  num?: boolean
}

function colsOf(model: RankModel): Col[] {
  if (model === 'sepa')
    return [
      { label: 'Comp', sort: 'score', num: true, title: 'SEPA composite at your weights' },
      { label: 'Trend', sort: 'trend', num: true, title: 'Trend-template conditions passed of 11 — the count the Trend template stage tests' },
      { label: 'Growth', sort: 'growth', num: true, title: 'Fundamental conditions passed of 8' },
      { label: 'Mom tier', num: true, title: 'SEPA momentum tier: signals passed of 10. A factor of this composite, not Radar' },
      { label: 'Opt tier', num: true, title: 'SEPA options tier 0–100; — when the name has no options structure (the composite scores it 50)' },
      { label: 'Grade · path', title: 'The mart’s cuts of the server composite' },
    ]
  if (model === 'radar')
    return [
      { label: 'Score', sort: 'score', num: true, title: 'Radar score, latest session' },
      { label: 'Radar grade', title: 'Radar engine letter' },
      { label: 'z_sdt', num: true, title: 'Short-term trend deviation' },
      { label: 'h_52w', num: true, title: 'Distance from 52-week high' },
      { label: 'r_sec', num: true, title: 'Relative strength (own 60d return rank until a sector map exists)' },
      { label: 'a_factor', num: true, title: 'Acceleration: 5d momentum vs 20d' },
    ]
  if (model === 'premium')
    return [
      { label: 'Comp', sort: 'score', num: true, title: 'Premium composite at your weights' },
      { label: 'IV rank', sort: 'ivr', num: true },
      { label: 'VRP pct', sort: 'vrp', num: true, title: 'VRP as its 1-year percentile, as the scan keeps it' },
      { label: 'Slope', num: true, title: '30-day ATM term slope' },
      { label: 'Pin', num: true, title: 'Distance to the pin strike, % of spot' },
      { label: 'Terrain', title: 'Vol regime' },
    ]
  return [
    { label: 'SEPA', title: 'SEPA grade · path' },
    { label: 'Radar', num: true, title: 'Radar grade, if graded' },
    { label: 'IV rank', num: true },
    { label: 'Trend', num: true, title: 'Trend-template conditions passed of 11' },
  ]
}

function Num({ v, strong, dim }: { v: string; strong?: boolean; dim?: boolean }) {
  return (
    <DenseTableCell className={cn(denseTableNumCell, 'max-w-none', strong && 'font-semibold', dim && 'text-[var(--sk-soft)]')}>
      {v}
    </DenseTableCell>
  )
}

function Dash() {
  return <DenseTableCell className={cn(denseTableNumCell, 'max-w-none text-muted-foreground')}>—</DenseTableCell>
}

function Tag({ v, variant }: { v: string; variant: 'success' | 'info' | 'danger' | 'neutral' | 'warning' }) {
  return (
    <DenseTableCell className="max-w-none whitespace-nowrap">
      <DenseTag variant={variant} size="cell">
        {v}
      </DenseTag>
    </DenseTableCell>
  )
}

function cellsOf(model: RankModel, r: NameRow, score: number | null) {
  const s = r.sepa
  if (model === 'sepa') {
    if (!s) return [<Dash key="c" />, <Dash key="t" />, <Dash key="g" />, <Dash key="m" />, <Dash key="o" />, <Tag key="p" v="not rated" variant="neutral" />]
    return [
      <Num key="c" v={score == null ? '—' : score.toFixed(0)} strong />,
      <Num key="t" v={`${s.trendN}/11`} dim={s.trendN < 9} />,
      <Num key="g" v={`${s.growthN}/8`} dim={s.growthN < 5} />,
      <Num key="m" v={`${s.momN}/10`} dim={s.momN < 7} />,
      s.lens.opt == null ? <Dash key="o" /> : <Num key="o" v={s.lens.opt.toFixed(0)} dim />,
      <Tag key="p" v={`${s.grade} · ${s.path}`} variant={pathVariant(s.path)} />,
    ]
  }
  if (model === 'radar') {
    const m = r.radar
    if (!m) return [<Dash key="s" />, <Tag key="g" v="not graded" variant="neutral" />, <Dash key="1" />, <Dash key="2" />, <Dash key="3" />, <Dash key="4" />]
    const f = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(0))
    return [
      <Num key="s" v={m.score.toFixed(1)} strong />,
      <Tag key="g" v={`Radar ${m.grade}`} variant={m.grade === 'A+' || m.grade === 'A' ? 'info' : 'neutral'} />,
      <Num key="1" v={f(m.row.z_sdt)} dim />,
      <Num key="2" v={f(m.row.h_52w)} dim />,
      <Num key="3" v={f(m.row.r_sec)} dim />,
      <Num key="4" v={f(m.row.a_factor)} dim />,
    ]
  }
  if (model === 'premium') {
    const p = r.prem
    if (!p) return [<Dash key="c" />, <Dash key="i" />, <Dash key="v" />, <Dash key="s" />, <Dash key="p" />, <Tag key="t" v="not in 691" variant="neutral" />]
    return [
      <Num key="c" v={score == null ? '—' : score.toFixed(0)} strong />,
      <Num key="i" v={p.raw.ivRank == null ? '—' : p.raw.ivRank.toFixed(0)} />,
      <Num key="v" v={p.raw.vrp == null ? '—' : p.raw.vrp.toFixed(0)} />,
      <Num key="s" v={p.raw.slope == null ? '—' : p.raw.slope.toFixed(3)} dim />,
      <Num key="p" v={p.raw.pinPct == null ? '—' : `${(p.raw.pinPct * 100).toFixed(1)}%`} dim />,
      <Tag key="t" v={p.regime ?? '—'} variant={regimeVariant(p.regime)} />,
    ]
  }
  return [
    s ? <Tag key="s" v={`${s.grade} · ${s.path}`} variant={pathVariant(s.path)} /> : <Tag key="s" v="not rated" variant="neutral" />,
    r.radar ? <Num key="r" v={r.radar.grade} /> : <Dash key="r" />,
    r.prem?.raw.ivRank != null ? <Num key="i" v={r.prem.raw.ivRank.toFixed(0)} /> : <Dash key="i" />,
    s ? <Num key="t" v={`${s.trendN}/11`} dim /> : <Dash key="t" />,
  ]
}

function sepaHit(r: NameRow): SepaDiscoveryHit | null {
  if (!r.sepa) return null
  return {
    symbol: r.sym,
    trade_date: '',
    path: r.sepa.path as SepaDiscoveryHit['path'],
    stage: r.sepa.stage as SepaDiscoveryHit['stage'],
    grade: r.sepa.grade as SepaDiscoveryHit['grade'],
    score: Number(r.sepa.comp.toFixed(2)),
  }
}

function Capture({ r, sepaDate, model, rules }: { r: NameRow; sepaDate: string | null; model: RankModel; rules: readonly VolRule[] | undefined }) {
  const hit = sepaHit(r)
  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {hit ? (
        <DiscoveryCapture target={{ lane: 'sepa', hit: { ...hit, trade_date: sepaDate ?? '' } }} />
      ) : (
        <AddToPoolButton symbol={r.sym} source="stock-screen" tags={['stock-screen', model]} />
      )}
      <span className="mx-[3px] h-3.5 w-px bg-foreground/[0.12]" />
      <PlanThisButton
        symbol={r.sym}
        source="stock-screen"
        sourceLabel="Stock screen"
        rule={rules?.[0]?.name ?? null}
        note={`Stock screen · ranked by ${MODEL_LABEL[model]}`}
        compact
      />
    </div>
  )
}

export function ResultTable({
  model,
  rated,
  unrated,
  showAll,
  onShowAll,
  sort,
  dir,
  onSort,
  selected,
  onSelect,
  bookOf,
  rules,
  sepaDate,
}: {
  model: RankModel
  rated: readonly Scored[]
  unrated: readonly Scored[]
  showAll: boolean
  onShowAll: () => void
  sort: SortKey
  dir: -1 | 1
  onSort: (k: SortKey) => void
  selected: string | null
  onSelect: (sym: string | null) => void
  bookOf: (sym: string) => string
  rules: ReadonlyMap<string, VolRule[]>
  sepaDate: string | null
}) {
  const cols = colsOf(model)
  const cap = showAll ? Infinity : ROW_CAP
  const ratedShown = rated.slice(0, cap)
  const room = Math.max(0, cap - ratedShown.length)
  const unratedShown = unrated.slice(0, room)
  const hidden = rated.length + unrated.length - ratedShown.length - unratedShown.length
  const colSpan = 4 + cols.length + 3
  const row = (x: Scored, rank: number | null) => {
    const on = selected === x.row.sym
    return (
      <DenseTableRow key={x.row.sym} {...rowSelectProps(on, () => onSelect(on ? null : x.row.sym), cn(on && 'bg-primary/[0.08]'))}>
        <DenseTableCell className={cn(denseTableNumCell, 'max-w-none text-dense-meta text-muted-foreground')}>{rank ?? ''}</DenseTableCell>
        <DenseTableCell className="max-w-none whitespace-nowrap">
          <Link
            to={withSymbolParam(SYMBOL_PATH, x.row.sym)}
            onClick={(e) => e.stopPropagation()}
            className={cn('font-mono font-bold text-entity-symbol hover:underline', x.score == null && model !== 'none' && 'opacity-60')}
            title={`Open ${x.row.sym} on Symbol`}
          >
            {x.row.sym}
          </Link>
        </DenseTableCell>
        <DenseTableCell className="max-w-none whitespace-nowrap text-dense-meta text-[var(--sk-mute2)]">{bookOf(x.row.sym)}</DenseTableCell>
        <DenseTableCell className="max-w-none">
          <ModelMarks r={x.row} />
        </DenseTableCell>
        {cellsOf(model, x.row, x.score)}
        <DenseTableCell
          className={cn(denseTableNumCell, 'max-w-none text-muted-foreground')}
          title="No earnings date is served across the universe — see the column header."
        >
          —
        </DenseTableCell>
        <DenseTableCell className="max-w-[150px] whitespace-nowrap text-dense-meta">
          <RuleCell rules={rules.get(x.row.sym)} />
        </DenseTableCell>
        <DenseTableCell className="max-w-none">
          <Capture r={x.row} sepaDate={sepaDate} model={model} rules={rules.get(x.row.sym)} />
        </DenseTableCell>
      </DenseTableRow>
    )
  }
  return (
    <>
      <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead className="w-8 max-w-none text-right">#</DenseTableHead>
            <DenseTableHead className="w-16 max-w-none">Symbol</DenseTableHead>
            <DenseTableHead className="w-20 max-w-none">Book</DenseTableHead>
            <DenseTableHead
              className="w-[150px] max-w-none"
              title="Each model’s own bar, lit when cleared: SEPA SETUP / PIVOT · Radar A+ / A · Premium ≥ 70. — = not covered by that model."
            >
              Models
            </DenseTableHead>
            {cols.map((c) => (
              <DenseTableHead
                key={c.label}
                title={c.title ?? (c.sort ? `Sort by ${c.label}` : undefined)}
                onClick={c.sort ? () => onSort(c.sort!) : undefined}
                className={cn('max-w-none whitespace-nowrap', c.num && 'text-right', c.sort && 'cursor-pointer hover:text-foreground')}
              >
                {c.label}
                {c.sort && sort === c.sort ? (dir === -1 ? ' ↓' : ' ↑') : ''}
              </DenseTableHead>
            ))}
            <DenseTableHead
              className="w-12 max-w-none text-right"
              title="Earnings: no earnings date is served across the universe (the event calendar holds 8 rows); read it on Symbol."
            >
              Earn
            </DenseTableHead>
            <DenseTableHead
              className="w-[150px] max-w-none"
              title="Which active opportunity is registered on this name. It does not say that the opportunity’s entry conditions are met."
            >
              Rule
            </DenseTableHead>
            <DenseTableHead className="w-28 max-w-none">Capture</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {ratedShown.map((x, i) => row(x, model === 'none' ? null : i + 1))}
          {unrated.length && model !== 'none' && unratedShown.length ? (
            <Fragment>
              <DenseTableRow>
                <DenseTableCell colSpan={colSpan} className="max-w-none bg-foreground/[0.03] px-3 py-2 text-dense-meta text-muted-foreground">
                  {NOT_RATED[model]} {unrated.length} of {rated.length + unrated.length} names that passed the screen. Listed A–Z.
                </DenseTableCell>
              </DenseTableRow>
              {unratedShown.map((x) => row(x, null))}
            </Fragment>
          ) : null}
        </DenseTableBody>
      </DenseDataTable>
      {hidden > 0 ? (
        <div className="border-t border-foreground/[0.06] px-3 py-1.5 text-dense-meta text-muted-foreground">
          The list stops at {ROW_CAP} rows; {hidden.toLocaleString('en-US')} more pass.{' '}
          <button type="button" onClick={onShowAll} className="text-primary hover:underline">
            Show all
          </button>
        </div>
      ) : null}
    </>
  )
}
