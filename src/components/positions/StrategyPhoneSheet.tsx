/**
 * A strategy row on a phone (design Rev .163, DESIGN_CONTRACTS §18.6 · §18.8):
 * the page's own sheet, the prototype's `data-sr-bsheet` beside the lines
 * table (`data-sr-detail="page"`).
 *
 * It reads what the desk spreads over the row, the open legs and the slot:
 * every column of the row as a figure · reading line, then the option legs and
 * what covers them, each on one line. Nothing in it writes — the fills and
 * their ledger actions stay on the desk — and it has two ways out, no more:
 * `Trade #NNN` (the instance, when the book holds it) and `Roll or close →`
 * to the Expiry desk, where an order would confirm before it left. Positions
 * writes the ledger and never sends an order, on any device (D10).
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet, type BottomSheetAction } from '@/components/ui/BottomSheet'
import { useTradeIndex } from '@/hooks/useTradeIndex'
import { useOpenTrade } from '@/layout/tradeGo'
import { fmtIsoDateToken } from '@/lib/format'
import { cn } from '@/lib/utils'
import { contractButtonLabel } from '@/utils/openOptionsTab'
import { daysUntilExpiry, fmtUsd } from '@/utils/positions'
import type { OpenOptionPosition } from '@/types/positions'
import { positionsUi } from './positionsUi'

const EXPIRY_DESK = '/trade/expiration'

export interface StrategySheetCover {
  symbol: string
  accountId: string
  direction: 'long' | 'short'
  required: number
  held: number
}

export interface StrategySheetRow {
  name: string
  /** The row's name ink: named, unnamed, or off-track (amber). */
  nameInk: string
  /** `#NNN · label`, or why there is no number. */
  sub: string
  tradeId: number | null
  /** The strategies in table order — what ‹ › step once the instance is open. */
  tradeList: readonly number[]
  /** Every column of the row after the first, in table order: the head, and the cell's reading. */
  facts: readonly { k: string; v: ReactNode }[]
  legs: readonly OpenOptionPosition[]
  cover: readonly StrategySheetCover[]
}

function dteWord(expiry: string | undefined): string | null {
  const d = daysUntilExpiry(expiry)
  if (d == null) return null
  return d < 0 ? `${-d}d ago` : d === 0 ? 'today' : `${d}d`
}

function legMeta(pos: OpenOptionPosition): string {
  const qty = Math.abs(pos.qty)
  const side = pos.qty > 0 ? 'Long' : pos.qty < 0 ? 'Short' : null
  return [
    fmtIsoDateToken(pos.expiry),
    dteWord(pos.expiry),
    side ? `${side} ${qty}` : null,
    pos.unrealized_pnl != null ? `UN ${fmtUsd(pos.unrealized_pnl)}` : null,
    pos.account_id || null,
  ]
    .filter((x): x is string => !!x && x !== '—')
    .join(' · ')
}

function coverMeta(c: StrategySheetCover): { text: string; short: boolean } {
  const status = c.held >= c.required ? 'Covered' : c.held > 0 ? 'Partial' : 'Naked'
  const gap = c.held - c.required
  return {
    text: [
      c.direction === 'long' ? 'Long' : 'Short',
      `required ${c.required}`,
      `held ${c.held}`,
      status,
      `${gap >= 0 ? '+' : ''}${gap}`,
      c.accountId,
    ].join(' · '),
    short: c.held < c.required,
  }
}

function SheetSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col pt-3.5">
      <span className={cn(positionsUi.cap, 'pb-1')}>{title}</span>
      {children}
    </section>
  )
}

function Line({ head, headInk, meta, metaInk }: { head: string; headInk: string; meta: string; metaInk?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] py-2">
      <span className={cn(positionsUi.mono, 'text-dense-label font-semibold', headInk)}>{head}</span>
      <span className={cn(positionsUi.mono, 'text-dense-meta text-pretty', metaInk ?? 'text-[var(--sk-mute2)]')}>{meta}</span>
    </div>
  )
}

export function StrategyPhoneSheet({
  open,
  onOpenChange,
  row,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: StrategySheetRow | null
}) {
  const navigate = useNavigate()
  const openTrade = useOpenTrade()
  const known = useTradeIndex()
  const id = row?.tradeId ?? null
  // A number the book does not hold opens nothing, so it is not offered (TradeRef's rule).
  const tradeOpens = id != null && (known == null || known.has(id))

  const actions: BottomSheetAction[] = []
  if (row && tradeOpens && id != null) {
    actions.push({
      // The number is a trade token, inked as one (the prototype's `ps.tok`).
      label: (
        <>
          Trade <span className="font-mono text-[var(--sk-trade)]">#{id}</span>
        </>
      ),
      onRun: () =>
        openTrade(id, {
          list: row.tradeList.filter((x) => x === id || known == null || known.has(x)),
          from: 'Positions · strategies',
        }),
    })
  }
  actions.push({ label: 'Roll or close →', primary: true, onRun: () => navigate(EXPIRY_DESK) })

  return (
    <BottomSheet
      open={open && row != null}
      onOpenChange={onOpenChange}
      label={row?.name ?? 'Strategy'}
      title={row ? <span className={row.nameInk}>{row.name}</span> : null}
      meta={row?.sub}
      actions={row ? actions : []}
    >
      {row ? (
        <>
          <dl className="m-0 flex flex-col">
            {row.facts.map((f) => (
              <div
                key={f.k}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-b border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)]"
              >
                <dt className="m-0 py-2 pr-3 text-dense-body text-[var(--sk-mute2)]">{f.k}</dt>
                <dd className="m-0 flex flex-col items-end py-2 text-right font-mono text-dense-body tabular-nums">{f.v}</dd>
              </div>
            ))}
          </dl>
          {row.legs.length > 0 ? (
            <SheetSection title={`Options (${row.legs.length})`}>
              {row.legs.map((pos, i) => (
                <Line
                  key={`${i}-${pos.contract_key}-${pos.account_id}`}
                  head={contractButtonLabel(pos)}
                  headInk="text-[var(--color-entity-option)]"
                  meta={legMeta(pos)}
                />
              ))}
            </SheetSection>
          ) : null}
          {row.cover.length > 0 ? (
            <SheetSection title="Coverage">
              {row.cover.map((c, i) => {
                const m = coverMeta(c)
                return (
                  <Line
                    key={`${c.symbol}-${c.accountId}-${i}`}
                    head={c.symbol}
                    headInk="text-entity-symbol"
                    meta={m.text}
                    metaInk={m.short ? 'text-warning' : undefined}
                  />
                )
              })}
            </SheetSection>
          ) : null}
          <p className="mt-3 mb-0 text-dense-meta leading-normal text-muted-foreground text-pretty">
            Positions never sends an order. Roll and close are decided on the Expiry desk, where the order confirms
            before it leaves.
          </p>
        </>
      ) : null}
    </BottomSheet>
  )
}
