/**
 * One bet or many (design Rev .107): every name held, grouped by the asset-mix
 * bucket Backing and Accounts draw (core → Equity · income · cash-like).
 *
 * The matrix is Research's, over the window the header names. Rows and columns
 * run block by block with a gap between blocks and the block's name on its
 * first row. Options are not a block — a contract moves on its underlying's
 * return series — so they mark how the name is held (`opt` / `sh+opt`, hover
 * for the legs) and weigh through β-Δ. Beside it: the average ρ between
 * blocks with one sentence on whether the income sleeve diversifies equity,
 * and the clusters, each saying whether it stays in one block or crosses.
 */
import { cn } from '@/lib/utils'
import { positionsUi } from '@/components/positions/positionsUi'
import { RISK_CLUSTER_RHO, RISK_UNRECORDED, type RiskCluster } from '@/utils/riskExposure'
import type { RiskCorrelationCell } from '@/api/research/riskStats'

export type CorrBlock = 'core' | 'income' | 'cash'

export const CORR_BLOCKS: readonly { id: CorrBlock; label: string }[] = [
  { id: 'core', label: 'Equity' },
  { id: 'income', label: 'Income' },
  { id: 'cash', label: 'Cash-like' },
]

/** Income ↔ Equity at or above this reads as "does not diversify". */
export const INCOME_EQUITY_LINKED = 0.35

export interface HeldAs {
  /** '' for shares only. */
  tag: '' | 'opt' | 'sh+opt'
  title: string
}

type Matrix = Readonly<Record<string, Record<string, RiskCorrelationCell>>>

const FOOT = 'm-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty'

/** A correlation cell's ink: amber deepens with ρ, and the diagonal is not a reading. */
function rhoTone(rho: number | null, self: boolean): { text: string; style?: React.CSSProperties } {
  if (self) return { text: 'text-[var(--sk-line2)]' }
  if (rho == null) return { text: 'text-muted-foreground' }
  const a = Math.max(0, rho - 0.2) * 0.42
  return {
    text: rho > 0.7 ? 'text-foreground' : 'text-secondary-foreground',
    style: { background: `color-mix(in oklab, var(--color-warning) ${Math.round(a * 100)}%, transparent)` },
  }
}

/** Average pairwise ρ between two sets, the diagonal left out; null when no pair filled. */
export function blockAverage(a: readonly string[], b: readonly string[], matrix: Matrix): number | null {
  let t = 0
  let k = 0
  for (const x of a) {
    for (const y of b) {
      if (x === y) continue
      const rho = matrix[x]?.[y]?.rho
      if (rho == null) continue
      t += rho
      k += 1
    }
  }
  return k > 0 ? t / k : null
}

function minPairwise(members: readonly string[], matrix: Matrix): number | null {
  let mn: number | null = null
  for (const a of members) {
    for (const b of members) {
      if (a === b) continue
      const rho = matrix[a]?.[b]?.rho
      if (rho != null) mn = mn == null ? rho : Math.min(mn, rho)
    }
  }
  return mn
}

export function CorrelationPanel({
  symbols,
  matrix,
  clusters,
  window: corrWindow,
  enp,
  names,
  blockOf,
  heldAs,
}: {
  symbols: readonly string[]
  matrix: Matrix | null
  clusters: readonly RiskCluster[]
  window: number
  enp: { n: number | null; counted: number; unfilled: number }
  /** Names carrying a β-weighted Δ$ — what the spread is measured over. */
  names: number
  blockOf: (symbol: string) => CorrBlock
  heldAs: (symbol: string) => HeldAs
}) {
  const blocks = CORR_BLOCKS.map((b) => ({ ...b, names: symbols.filter((s) => blockOf(s) === b.id) })).filter(
    (b) => b.names.length > 0,
  )
  const order = blocks.flatMap((b) => b.names)
  const firstOfBlock = new Set(blocks.slice(1).map((b) => b.names[0]))
  const labelAt = new Map(blocks.map((b) => [b.names[0], b.label]))
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const income = byId.get('income')
  const core = byId.get('core')
  const cash = byId.get('cash')
  const ie = matrix && income && core ? blockAverage(income.names, core.names, matrix) : null
  const ce = matrix && cash && core ? blockAverage(cash.names, core.names, matrix) : null

  const shownClusters = clusters
    // A cluster of two names carrying nothing is not a bet worth a row.
    .filter((c) => c.members.length > 1 && c.share >= 0.01)
    .map((c) => {
      const spans = CORR_BLOCKS.filter((b) => c.members.some((m) => blockOf(m) === b.id)).map((b) => b.label)
      return { ...c, spans, min: matrix ? minPairwise(c.members, matrix) : null }
    })

  return (
    <section className={cn(positionsUi.panel, 'col-span-full')} aria-label="One bet or many">
      <header className={positionsUi.panelHead}>
        <span className={positionsUi.cap}>One bet or many</span>
        <span className={positionsUi.panelTitle}>correlation · {corrWindow}d daily returns</span>
        <span className="text-dense-meta text-muted-foreground">
          grouped by asset mix · <span className="font-mono text-[var(--sk-contract)]">opt</span> = held through options
        </span>
        <span className="ml-auto text-dense-meta text-muted-foreground">
          effective independent positions{' '}
          <span
            className={cn(
              positionsUi.mono,
              'font-bold',
              enp.n != null && enp.n < enp.counted * 0.4 ? 'text-warning' : 'text-foreground',
            )}
          >
            {enp.n == null ? '—' : enp.n.toFixed(1)}
          </span>{' '}
          of {order.length}
        </span>
      </header>
      {order.length > 1 && matrix ? (
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4 p-3">
          <div className="max-w-full min-w-0 flex-[0_1_auto] overflow-x-auto">
            <table data-sr-table="" style={{ width: 'auto' }}>
              <thead>
                <tr>
                  <th data-sr-col="entity" className="border-b-0" />
                  {order.map((s) => (
                    <th
                      key={s}
                      data-sr-col="tag"
                      className={cn('border-b-0 px-1.5 text-center', firstOfBlock.has(s) && 'border-l-8 border-l-transparent')}
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.map((a) => {
                  const held = heldAs(a)
                  const gap = firstOfBlock.has(a)
                  return (
                    <tr key={a} className={cn(gap && '[&>td]:border-t-8 [&>td]:border-t-transparent')}>
                      <td data-sr-col="entity" className="border-b-0 whitespace-nowrap pr-2.5" title={held.title}>
                        <span className="inline-block w-16 font-sans text-dense-caption font-semibold text-muted-foreground">
                          {labelAt.get(a) ?? ''}
                        </span>
                        <span className="font-mono font-bold text-entity-symbol">{a}</span>
                        {held.tag ? (
                          <span className="ml-1 font-mono text-dense-caption text-[var(--sk-contract)]">{held.tag}</span>
                        ) : null}
                      </td>
                      {order.map((b) => {
                        const cell = matrix[a]?.[b]
                        const self = a === b
                        const tone = rhoTone(cell?.rho ?? null, self)
                        return (
                          <td
                            key={b}
                            data-sr-col="tag"
                            className={cn(
                              'border border-[var(--sk-raised2)] px-1.5 text-center font-mono tabular-nums',
                              firstOfBlock.has(b) && 'border-l-8 border-l-transparent',
                              tone.text,
                            )}
                            style={tone.style}
                            title={`${a} / ${b} · ${corrWindow}d${cell?.n ? ` · n ${cell.n}` : ''}`}
                          >
                            {self ? '—' : cell?.rho == null ? '·' : cell.rho.toFixed(2)}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex min-w-[min(100%,18.75rem)] flex-[1_1_18.75rem] flex-col gap-3.5">
            <p className="m-0 text-xs leading-relaxed text-secondary-foreground text-pretty">
              β-weighting says the book is spread over {names} names;{' '}
              {enp.n == null
                ? 'correlation has no reading for this scope.'
                : `correlation says it is ${enp.n.toFixed(1)} ${enp.n < 2 ? 'bet' : 'bets'}.`}
              {ie != null
                ? ` Income ↔ Equity averages ρ ${ie.toFixed(2)}${
                    ie >= INCOME_EQUITY_LINKED
                      ? ' — the income sleeve moves with the equity block, so it does not diversify it.'
                      : ' — the income sleeve does diversify the equity block.'
                  }`
                : ''}
              {ce != null ? ` Cash-like sits at ρ ${ce.toFixed(2)} against Equity.` : ''} A genuine diversifier here is
              short-beta or long-vol, not another name.
            </p>

            {blocks.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <span className={positionsUi.cap}>Between blocks · avg ρ</span>
                <table data-sr-table="" style={{ width: 'auto' }}>
                  <thead>
                    <tr>
                      <th data-sr-col="entity" className="border-b-0" />
                      {blocks.map((b) => (
                        <th key={b.id} data-sr-col="tag" className="border-b-0 px-2 text-center">
                          {b.label} · {b.names.length}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {blocks.map((ba) => (
                      <tr key={ba.id}>
                        <td data-sr-col="entity" className="border-b-0 pr-2.5 text-dense-meta font-semibold text-secondary-foreground">
                          {ba.label}
                        </td>
                        {blocks.map((bb) => {
                          const v = blockAverage(ba.names, bb.names, matrix)
                          const tone = rhoTone(v, false)
                          return (
                            <td
                              key={bb.id}
                              data-sr-col="num"
                              className={cn('border border-[var(--sk-raised2)] px-2.5 text-center', tone.text)}
                              style={tone.style}
                              title={`${ba.label} ↔ ${bb.label} · average pairwise ρ`}
                            >
                              {v == null ? '—' : v.toFixed(2)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {shownClusters.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className={positionsUi.cap}>Clusters</span>
                {shownClusters.map((c) => (
                  <div
                    key={c.members.join('-')}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)] px-2.5 py-1.75"
                  >
                    <span className="min-w-0 font-mono text-xs font-semibold text-entity-symbol">{c.members.join(' · ')}</span>
                    <span className={cn(positionsUi.mono, 'text-xs font-bold whitespace-nowrap', c.share > 0.5 ? 'text-warning' : 'text-muted-foreground')}>
                      {Math.round(c.share * 100)}% <span className="font-normal text-muted-foreground">of β-Δ</span>
                    </span>
                    <span className="col-span-full text-dense-meta text-muted-foreground">
                      {c.members.length} names · linked at ρ ≥ {(c.min ?? RISK_CLUSTER_RHO).toFixed(2)} ·{' '}
                      <span className={c.spans.length > 1 ? 'text-warning' : undefined}>
                        {c.spans.length > 1 ? `crosses ${c.spans.join(' ↔ ')}` : `${c.spans[0]} only`}
                      </span>
                      {c.oneWay ? ' · all of it one way' : ' · it can offset itself'}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="m-0 px-3 py-3 text-dense-meta text-muted-foreground">
          A matrix needs two names Research can fill; this scope has {order.length}.
        </p>
      )}
      <p className={FOOT}>
        {enp.unfilled > 0 ? `${enp.unfilled} pairs the matrix could not fill are left out rather than read as uncorrelated. ` : ''}
        {RISK_UNRECORDED.cluster}
      </p>
    </section>
  )
}
