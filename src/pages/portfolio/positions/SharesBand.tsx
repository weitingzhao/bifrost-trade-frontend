/**
 * Positions › Shares (design Rev .115, §5.1.4b): stocks, fixed income and
 * cash-like, on the page that now holds the whole book — Accounts' Holdings
 * band retired into this.
 *
 * Type chips (All · Stocks · Fixed income · Cash-like, with counts), grouping
 * (Category · Type · None) with subtotals, a totals row. Category is the
 * Owner's own bucket: retagged inline and managed from ◫ Categories, both
 * store writes and never an order (D10). The arithmetic is `utils/sharesBook`.
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { scrollWhenPresent, flashFound } from '@/lib/scrollWhenPresent'
import { useQueryClient } from '@tanstack/react-query'
import { SegmentControl } from '@/components/data-display'
import { positionsUi } from '@/components/positions/positionsUi'
import { PositionsTier } from '@/components/positions/PositionsTier'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { createPositionCategory, deletePositionCategory, tagPosition, updatePositionCategory } from '@/api/portfolio'
import { useDistributionYields } from '@/hooks/useDistributionYields'
import { usePositionCategories } from '@/hooks/usePositionCategories'
import { cn } from '@/lib/utils'
import { fmtPctSigned } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtUsd, formatLastUpdate } from '@/utils/positions'
import {
  buildShareRows,
  groupShareRows,
  SHARE_BUCKETS,
  sharesTotal,
  TYPE_INFERRED,
  UNCATEGORISED,
  unrealizedPctText,
  type ShareBucket,
  type ShareGroup,
  type ShareGrouping,
  type ShareRow,
} from '@/utils/sharesBook'
import type { CoverRow } from '@/utils/bookVsBase'
import type { LivePositionRow } from '@/types/positions'
import type { DailyBenchmark, QuoteItem } from '@/types/market'

const HEAD_ROW = 'bg-[color-mix(in_srgb,var(--sk-ink)_4%,transparent)]'
const WARN_EDGE = { borderColor: 'color-mix(in srgb, var(--color-warning) 45%, transparent)' }

function callsText(n: number | null): string {
  return n == null ? '—' : `${n > 0 ? `+${n}` : '0'} calls spare`
}

function signedUsd(n: number | null): string {
  return n == null ? '—' : `${n > 0 ? '+' : ''}${fmtUsd(n)}`
}

export function SharesBand({
  stocks,
  quotesBySymbol,
  benchBySymbol,
  cover,
  accountLabel,
  filterSymbol,
  onOpenStock,
}: {
  /** Stock-like holdings in the page's account scope. */
  stocks: readonly LivePositionRow[]
  quotesBySymbol: Readonly<Record<string, QuoteItem>>
  benchBySymbol: Readonly<Record<string, DailyBenchmark>>
  cover: readonly CoverRow[]
  accountLabel: (accountId: string) => string
  filterSymbol: string
  onOpenStock: (symbol: string, accountId: string) => void
}) {
  const qc = useQueryClient()
  const cats = usePositionCategories()
  const [bucket, setBucket] = useState<'all' | ShareBucket>('all')
  const [grouping, setGrouping] = useState<ShareGrouping>('cat')
  const [manage, setManage] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [pending, setPending] = useState<{ id: number; name: string } | null>(null)
  // Rename came with Accounts' Categories face; the design's bar only adds and deletes, and a weaker home drops nothing (§15.6).
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [today] = useState(() => new Date().toISOString().slice(0, 10))

  const all = useMemo(
    () => buildShareRows({ stocks, quotesBySymbol, benchBySymbol, cover }),
    [stocks, quotesBySymbol, benchBySymbol, cover],
  )
  const q = filterSymbol.trim().toUpperCase()
  const rows = all.filter((r) => (bucket === 'all' || r.bucket === bucket) && (!q || r.symbol.startsWith(q)))
  const categoryItems = cats.data?.items ?? []
  const groups = groupShareRows(rows, grouping, categoryItems.map((c) => c.name))
  const total = sharesTotal(rows)
  const count = (k: 'all' | ShareBucket) => all.filter((r) => k === 'all' || r.bucket === k).length

  // The menu bar's Book sends a stock-like row here (`#shares`, Rev .115). Scroll once the rows
  // are in — the bands above are still filling in before that and would push the section down.
  const location = useLocation()
  const ready = all.length > 0
  useEffect(() => {
    if (location.hash !== '#shares' || !ready) return
    return scrollWhenPresent('#shares', 6_000, flashFound)
  }, [location.hash, ready])

  const marks = useMemo(
    () => new Map(all.filter((r) => r.bucket !== 'stk').map((r) => [r.symbol, r.mark])),
    [all],
  )
  const yields = useDistributionYields(marks, today)

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.portfolio.positionCategories })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.monitor.status })
  }
  const write = async (op: () => Promise<{ ok: boolean; error?: string }>) => {
    setWriteError(null)
    const r = await op().catch((e: Error) => ({ ok: false, error: e.message }))
    if (!r.ok) setWriteError(r.error ?? 'The category store refused the write.')
    refresh()
  }
  const retag = (r: ShareRow, name: string) => {
    const id = categoryItems.find((c) => c.name === name)?.id ?? null
    void write(() => tagPosition({ account_id: r.accountId, contract_key: r.contractKey, category_id: id }))
  }

  const headline = `${rows.length} ${rows.length === 1 ? 'holding' : 'holdings'} · ${fmtUsd(total.value, true)} market value${
    total.callsSpare ? ` · +${total.callsSpare} calls spare` : ''
  }`

  return (
    <>
    <PositionsTier label="Shares" note="Stocks, fixed income and cash-like, as the broker reports them" summary={headline} />
    <section id="shares" className={cn(positionsUi.panel, 'sk-rise')} aria-label="Shares">
      <header className={positionsUi.panelHead}>
        <SegmentControl
          size="xs"
          ariaLabel="Share type"
          value={bucket}
          onChange={(v) => setBucket(v as 'all' | ShareBucket)}
          options={[
            { value: 'all', label: `All · ${count('all')}` },
            ...SHARE_BUCKETS.map(([k, label]) => ({
              value: k,
              label: `${label} · ${count(k)}`,
              disabled: count(k) === 0,
              title: TYPE_INFERRED,
            })),
          ]}
        />
        <span className="inline-flex items-center gap-1.5">
          <span className={positionsUi.cap}>Group</span>
          <SegmentControl
            size="xs"
            ariaLabel="Group by"
            value={grouping}
            onChange={(v) => setGrouping(v as ShareGrouping)}
            options={[
              { value: 'cat', label: 'Category' },
              { value: 'type', label: 'Type', title: TYPE_INFERRED },
              { value: 'none', label: 'None' },
            ]}
          />
        </span>
        <button
          type="button"
          className={cn(positionsUi.btn, 'ml-auto', manage && 'text-primary')}
          aria-pressed={manage}
          onClick={() => {
            setManage((v) => !v)
            setPending(null)
          }}
          title="Your own buckets — they group this table and the Category ring on Accounts"
        >
          ◫ Categories
        </button>
      </header>

      {manage ? (
        <div className="flex flex-col gap-2 border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryItems.map((c) => (
              <span key={c.id} className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)] pr-1 pl-2.5">
                {renaming?.id === c.id ? (
                  <input
                    autoFocus
                    className={cn(positionsUi.input, 'h-5 w-28 font-sans text-dense-meta')}
                    value={renaming.name}
                    aria-label={`Rename ${c.name}`}
                    onChange={(e) => setRenaming({ id: c.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setRenaming(null)
                      if (e.key !== 'Enter') return
                      const name = renaming.name.trim()
                      setRenaming(null)
                      if (name && name !== c.name) void write(() => updatePositionCategory(c.id, name))
                    }}
                    onBlur={() => setRenaming(null)}
                  />
                ) : (
                  <button
                    type="button"
                    className="cursor-text border-0 bg-transparent p-0 text-dense-meta text-foreground"
                    title={`Rename ${c.name}`}
                    onClick={() => setRenaming({ id: c.id, name: c.name })}
                  >
                    {c.name}
                  </button>
                )}
                <span className={cn(positionsUi.mono, 'text-dense-micro text-muted-foreground')}>
                  {all.filter((r) => r.category === c.name).length}
                </span>
                <button
                  type="button"
                  className={positionsUi.q}
                  onClick={() => setPending({ id: c.id, name: c.name })}
                  title={`Delete ${c.name}`}
                  aria-label={`Delete ${c.name}`}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              className={cn(positionsUi.input, 'w-36 font-sans')}
              placeholder="New category"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              aria-label="New category"
            />
            <button
              type="button"
              className={cn(positionsUi.btn, 'text-primary')}
              disabled={!newCat.trim() || categoryItems.some((c) => c.name === newCat.trim())}
              onClick={() => {
                const name = newCat.trim()
                setNewCat('')
                void write(() => createPositionCategory(name))
              }}
            >
              Add
            </button>
          </div>
          {pending ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2" style={WARN_EDGE}>
              <span className="text-dense-meta font-semibold text-warning">Delete {pending.name}?</span>
              <span className="min-w-0 flex-[1_1_15rem] text-dense-meta text-secondary-foreground text-pretty">
                Holdings tagged with it fall into {UNCATEGORISED}. The holdings themselves are untouched.
              </span>
              <button
                type="button"
                className={cn(positionsUi.btn, 'text-warning')}
                onClick={() => {
                  const id = pending.id
                  setPending(null)
                  void write(() => deletePositionCategory(id))
                }}
              >
                Delete category
              </button>
              <button type="button" className={positionsUi.btn} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          ) : null}
          <span className="text-dense-meta text-muted-foreground text-pretty">
            Click a name to rename it; retag a holding from its Category cell. A category is a store write, never an order (D10).
          </span>
        </div>
      ) : null}
      {writeError ? <p className="m-0 border-b border-border px-3 py-1.5 text-dense-meta text-warning">{writeError}</p> : null}

      {rows.length === 0 ? (
        <p className="m-0 px-4 py-5 text-center text-dense-meta text-muted-foreground">
          {/* Rev .120: say the filter, so an empty band never reads as missing data. */}
          {q
            ? `Filtered to ${q} — no ${bucket === 'all' ? 'shares' : SHARE_BUCKETS.find(([k]) => k === bucket)?.[1].toLowerCase()} of it held in the accounts in scope.`
            : `No ${bucket === 'all' ? 'shares' : SHARE_BUCKETS.find(([k]) => k === bucket)?.[1].toLowerCase()} held in the accounts in scope.`}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr>
                <th className={cn(positionsUi.th, 'pl-3 text-left')}>Symbol</th>
                <th className={cn(positionsUi.th, 'text-left')}>Category</th>
                <th className={positionsUi.th}>Qty</th>
                <th className={positionsUi.th}>Mark</th>
                <th className={positionsUi.th}>Value</th>
                <th className={positionsUi.th}>Daily</th>
                <th className={positionsUi.th} title="Market value − cost: the broker's Chg">
                  Unrealized
                </th>
                <th className={positionsUi.th} title="Shares standing behind short calls · what is left">
                  Backing
                </th>
                <th className={positionsUi.th} title="Trailing twelve months of distributions over the mark — not an SEC yield">
                  Yield (TTM)
                </th>
                <th className={positionsUi.th}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows
                  key={g.key}
                  g={g}
                  head={grouping !== 'none'}
                  headTitle={grouping === 'type' ? TYPE_INFERRED : undefined}
                  categories={categoryItems.map((c) => c.name)}
                  yields={yields}
                  accountLabel={accountLabel}
                  onRetag={retag}
                  onOpenStock={onOpenStock}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={cn(positionsUi.td, 'pl-3 text-left font-sans border-b-0')} colSpan={4}>
                  {bucket === 'all' ? 'Shares total' : `${SHARE_BUCKETS.find(([k]) => k === bucket)?.[1]} total`}
                </td>
                <td className={cn(positionsUi.td, 'border-b-0 text-foreground')}>{fmtUsd(total.value)}</td>
                <td className={cn(positionsUi.td, 'border-b-0', pnlColorClass(total.daily))}>{signedUsd(total.daily)}</td>
                <td className={cn(positionsUi.td, 'border-b-0 text-[var(--color-unrealized)]')}>{signedUsd(total.unreal)}</td>
                <td className={cn(positionsUi.td, 'border-b-0 text-[var(--sk-soft)]')}>{callsText(total.callsSpare)}</td>
                <td className={cn(positionsUi.td, 'border-b-0')} colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="m-0 border-t border-border px-3 py-1.5 text-dense-meta leading-normal text-muted-foreground text-pretty">
        Unrealized = market value − cost (the broker&rsquo;s Chg). Backing = shares standing behind short calls on the same
        account × symbol; the spare shares, in whole calls, are what Room to add counts. Fixed income and cash-like back puts
        through buying power, so they carry no call backing. Yield (TTM) is the trailing twelve months of distributions on file
        over the mark, not an SEC yield; no source serves a duration, so it reads —. Type is inferred from the holding&rsquo;s
        category until the instrument class is stored — the broker books these funds as stock.
      </p>
    </section>
    </>
  )
}

function GroupRows({
  g,
  head,
  headTitle,
  categories,
  yields,
  accountLabel,
  onRetag,
  onOpenStock,
}: {
  g: ShareGroup
  head: boolean
  headTitle?: string
  categories: readonly string[]
  yields: ReadonlyMap<string, number | null | undefined>
  accountLabel: (accountId: string) => string
  onRetag: (r: ShareRow, name: string) => void
  onOpenStock: (symbol: string, accountId: string) => void
}) {
  return (
    <>
      {head ? (
        <tr className={HEAD_ROW}>
          <td className={cn(positionsUi.td, 'pl-3 text-left font-sans')} colSpan={4}>
            <span className="text-dense-meta font-bold text-[var(--sk-soft)]" title={headTitle}>
              {g.label}
            </span>{' '}
            <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
              {g.rows.length} {g.rows.length === 1 ? 'holding' : 'holdings'}
            </span>
          </td>
          <td className={cn(positionsUi.td, 'text-[var(--sk-soft)]')}>{fmtUsd(g.value)}</td>
          <td className={cn(positionsUi.td, pnlColorClass(g.daily))}>{signedUsd(g.daily)}</td>
          <td className={cn(positionsUi.td, 'text-[var(--color-unrealized)]')}>{signedUsd(g.unreal)}</td>
          <td className={cn(positionsUi.td, 'text-[var(--sk-mute2)]')}>{callsText(g.callsSpare)}</td>
          <td className={positionsUi.td} colSpan={2} />
        </tr>
      ) : null}
      {g.rows.map((r) => {
        const y = r.bucket === 'stk' ? null : yields.get(r.symbol)
        const b = r.backing
        return (
          <tr key={r.key}>
            <td className={cn(positionsUi.td, 'pl-3 text-left')}>
              <button
                type="button"
                className="block cursor-pointer border-0 bg-transparent p-0 font-mono font-bold text-entity-symbol hover:underline"
                onClick={() => onOpenStock(r.symbol, r.accountId)}
                title={`Open ${r.symbol}`}
              >
                {r.symbol}
              </button>
              <span className="block font-sans text-dense-micro text-muted-foreground">{accountLabel(r.accountId)}</span>
            </td>
            <td className={cn(positionsUi.td, 'text-left font-sans')}>
              <select
                className={cn(positionsUi.input, 'font-sans text-dense-meta', r.category ? 'text-[var(--sk-soft)]' : 'text-muted-foreground')}
                value={r.category && categories.includes(r.category) ? r.category : ''}
                onChange={(e) => onRetag(r, e.target.value)}
                aria-label={`Category for ${r.symbol}`}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="">{UNCATEGORISED}</option>
              </select>
            </td>
            <td className={cn(positionsUi.td, 'text-[var(--sk-soft)]')}>
              {r.qty.toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </td>
            <td className={positionsUi.td}>
              <span className="block">{r.mark == null ? '—' : `$${r.mark.toFixed(2)}`}</span>
              <span className="block text-dense-micro text-muted-foreground" title="When this price was stamped — a live quote, or the account snapshot's price time">
                {formatLastUpdate(r.markAt)}
              </span>
            </td>
            <td className={cn(positionsUi.td, 'text-foreground')}>{fmtUsd(r.value)}</td>
            <td className={cn(positionsUi.td, pnlColorClass(r.daily))}>
              <span className="block">{signedUsd(r.daily)}</span>
              <span className="block text-dense-micro">{fmtPctSigned(r.dailyPct)}</span>
            </td>
            <td className={cn(positionsUi.td, 'text-[var(--color-unrealized)]')}>
              <span className="block">{signedUsd(r.unreal)}</span>
              <span className="block text-dense-micro" title={unrealizedPctText(r.unrealPct).title}>
                {unrealizedPctText(r.unrealPct).text}
              </span>
            </td>
            <td
              className={positionsUi.td}
              title={b ? `${b.held} held · ${b.behindCalls} behind short calls · ${b.spare} spare` : 'Backs puts through buying power, not calls'}
            >
              {b ? (
                <>
                  <span className={cn('block', b.behindCalls ? 'text-[var(--sk-soft)]' : 'text-muted-foreground')}>
                    {b.behindCalls ? `${b.behindCalls.toLocaleString('en-US')} sh · ${b.behindCalls / 100} calls` : 'none'}
                  </span>
                  <span className={cn('block text-dense-micro', b.spareCalls ? 'text-[var(--color-profit)]' : 'text-muted-foreground')}>
                    spare {b.spare.toLocaleString('en-US')}
                    {b.spareCalls ? ` · +${b.spareCalls} calls` : b.spare > 0 ? ' · under 100' : ''}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td
              className={cn(positionsUi.td, y == null ? 'text-muted-foreground' : 'text-[var(--sk-soft)]')}
              title={
                r.bucket === 'stk'
                  ? 'Yield is read for fixed income and cash-like only'
                  : y === undefined
                    ? 'Reading the distributions on file'
                    : y == null
                      ? 'No distribution on file for the last twelve months'
                      : 'Trailing twelve months of distributions over the mark'
              }
            >
              {y == null ? '—' : `${y.toFixed(1)}%`}
            </td>
            <td
              className={cn(positionsUi.td, 'text-muted-foreground')}
              title={r.bucket === 'stk' ? 'Duration is read for fixed income and cash-like only' : 'No source serves a fund’s duration'}
            >
              —
            </td>
          </tr>
        )
      })}
    </>
  )
}
