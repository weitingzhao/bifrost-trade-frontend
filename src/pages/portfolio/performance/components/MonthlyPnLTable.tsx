import { useState, useMemo } from 'react'
import { pnlColorClass } from '@/utils/dailyChange'
import { fmtSignedUsd0 } from '@/pages/portfolio/performance/performanceReading'
import { Skeleton } from '@/components/ui/skeleton'
import { DataStateBlock } from '@/components/data-display'
import { dataState } from '@/lib/dataState'
import type { ByDayRangeData } from '@/types/trading'
import type { OpenOptCashLeg } from '@/utils/ledger/optAsOfPnL'
import OpenOptInventoryDialog from '@/pages/portfolio/performance/components/OpenOptInventoryDialog'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import { perfUi } from '@/pages/portfolio/performance/performanceUi'

interface MonthlyPnLTableProps {
  byDayRangeData: ByDayRangeData | null
  /** Still-open premium cash as of today, keyed by open-fill month (YYYY-MM). */
  optOpenByOpenMonth?: Record<string, number> | null
  /** Still-open OPT fill legs as of Chicago today (for Open drill-down). */
  optOpenLegs?: OpenOptCashLeg[] | null
  asOfDateStr?: string | null
  isLoading?: boolean
  /** The range query failed. Distinct from having no PnL in the range. */
  isError?: boolean
  onRetry?: () => void
  /** Open a day's records beside the calendar. */
  onOpenDay?: (date: string) => void
  /** The day whose records are open, marked in the table. */
  selectedDay?: string | null
  /** Open the R / U / N glossary (the Day cell derivation). */
  onGlossary?: () => void
}

/** Word and code per column: the code is what the calendar and the tooltips call it. */
const COLS: { word: string; code: string; openOnly?: boolean }[] = [
  { word: 'Options realized', code: 'Opt R' },
  { word: 'Unmatched that day', code: 'Opt U' },
  { word: 'Unpaired premium', code: 'Open', openOnly: true },
  { word: 'Stocks net', code: 'Stocks N' },
  { word: 'Stocks realized', code: 'Stocks R' },
  { word: 'FI cash stream', code: 'FI Stream' },
  { word: 'FI realized', code: 'FI R' },
  { word: 'Cash net', code: 'Cash N' },
  { word: 'Cash realized', code: 'Cash R' },
]

const th = 'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom leading-normal'
const td = 'whitespace-nowrap border-b border-border/55 px-2 py-1.25 text-right font-mono text-xs leading-normal tabular-nums'

/** Prototype: whole dollars with a sign; an empty cell is a dash. */
function fmtVal(v: number): string {
  if (Math.abs(v) < 0.5) return '—'
  return fmtSignedUsd0(v)
}

/** The prototype's two greys (`--sk-mute`, `--sk-mute2`) are one colour on the Portfolio skin. */
const dim = 'text-muted-foreground'

/** Realized options, stocks and FI carry direction; Opt U is unrealized orange; inventory and flows are quiet. */
function realizedInk(v: number): string {
  return Math.abs(v) < 0.5 ? dim : pnlColorClass(v)
}

function unrealizedInk(v: number): string {
  return Math.abs(v) < 0.5 ? dim : 'text-unrealized'
}

function quietInk(v: number, tone: 'soft' | 'muted'): string {
  if (Math.abs(v) < 0.5) return dim
  return tone === 'soft' ? 'text-secondary-foreground' : 'text-muted-foreground'
}

interface DayRow {
  date: string
  optR: number
  optU: number
  stocksN: number
  stocksR: number
  fiN: number
  fiR: number
  cashN: number
  cashR: number
}

interface MonthGroup {
  key: string
  label: string
  days: DayRow[]
  sums: Omit<DayRow, 'date'>
}

export default function MonthlyPnLTable({
  byDayRangeData,
  optOpenByOpenMonth,
  optOpenLegs,
  asOfDateStr,
  isLoading,
  isError,
  onRetry,
  onOpenDay,
  selectedDay,
  onGlossary,
}: MonthlyPnLTableProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [showOpen, setShowOpen] = useState(true)
  const [openDrill, setOpenDrill] = useState<{ monthKey: string; monthLabel: string } | null>(null)

  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (!byDayRangeData) return []

    // The range runs to the end of the quarter; a day that has not happened has no session to show.
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    // A weekend is not a session: the prototype lists sessions only.
    const isWeekend = (d: string) => {
      const dow = new Date(`${d}T12:00:00Z`).getUTCDay()
      return dow === 0 || dow === 6
    }
    const dates = Object.keys(byDayRangeData.opt).filter((d) => d <= today && !isWeekend(d)).sort()
    if (dates.length === 0) return []

    const rows: DayRow[] = dates.map((date) => ({
      date,
      optR: byDayRangeData.opt[date]?.realized ?? 0,
      optU: byDayRangeData.opt[date]?.unrealized ?? 0,
      stocksN: byDayRangeData.stkBucketNotional.stocks[date] ?? 0,
      stocksR: byDayRangeData.stocks[date]?.realized ?? 0,
      fiN: byDayRangeData.stkBucketNotional.fixed_income[date] ?? 0,
      fiR: byDayRangeData.fixed_income[date]?.realized ?? 0,
      cashN: byDayRangeData.stkBucketNotional.cash_like[date] ?? 0,
      cashR: byDayRangeData.cash_like[date]?.realized ?? 0,
    }))

    const grouped = new Map<string, DayRow[]>()
    for (const row of rows) {
      const monthKey = row.date.slice(0, 7)
      if (!grouped.has(monthKey)) grouped.set(monthKey, [])
      grouped.get(monthKey)!.push(row)
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const groups: MonthGroup[] = []
    for (const [key, days] of grouped) {
      const [year, month] = key.split('-')
      const label = `${monthNames[parseInt(month, 10) - 1]} ${year}`
      const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date))

      const sums = sorted.reduce(
        (acc, d) => ({
          optR: acc.optR + d.optR,
          optU: acc.optU + d.optU,
          stocksN: acc.stocksN + d.stocksN,
          stocksR: acc.stocksR + d.stocksR,
          fiN: acc.fiN + d.fiN,
          fiR: acc.fiR + d.fiR,
          cashN: acc.cashN + d.cashN,
          cashR: acc.cashR + d.cashR,
        }),
        { optR: 0, optU: 0, stocksN: 0, stocksR: 0, fiN: 0, fiR: 0, cashN: 0, cashR: 0 },
      )

      groups.push({ key, label, days: sorted, sums })
    }

    groups.sort((a, b) => b.key.localeCompare(a.key))
    return groups
  }, [byDayRangeData])

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hasData = monthGroups.length > 0 && monthGroups.some((g) =>
    g.days.some((d) =>
      Math.abs(d.optR) >= 0.005 || Math.abs(d.optU) >= 0.005 ||
      Math.abs(d.stocksN) >= 0.005 || Math.abs(d.stocksR) >= 0.005 ||
      Math.abs(d.fiN) >= 0.005 || Math.abs(d.fiR) >= 0.005 ||
      Math.abs(d.cashN) >= 0.005 || Math.abs(d.cashR) >= 0.005
    ),
  )

  // "No PnL in the range" is a statement about the book. It must not be what a
  // failed range query says.
  const state = dataState({ isPending: isLoading, isError, isEmpty: !hasData })
  if (state === 'loading') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    )
  }

  if (state !== 'ready') {
    return (
      <DataStateBlock
        state={state}
        sourceLabel="Range PnL"
        onRetry={onRetry}
        empty={{ title: 'No Option or Stock PnL in the selected range.' }}
      />
    )
  }

  const cols = COLS.filter((c) => showOpen || !c.openOnly)

  return (
    <section className={perfUi.panel} aria-label="Per-month and per-day P&L">
      <header className={cn(perfUi.panelHead, 'leading-normal')}>
        <span className={cn(perfUi.cap, 'leading-normal')}>Per-month · per-day</span>
        <span className={cn(perfUi.panelTitle, 'leading-normal')}>nine measures</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-dense-meta leading-normal text-muted-foreground">
          <input
            type="checkbox"
            checked={showOpen}
            onChange={() => setShowOpen((v) => !v)}
            className="accent-[var(--primary)]"
          />
          Show unpaired option legs
          <span className={dim}>— inventory, not P&amp;L</span>
        </label>
        <span className={cn(perfUi.note, 'ml-auto leading-normal')}>
          {monthGroups.length} {monthGroups.length === 1 ? 'month' : 'months'} · click a month to open its days
        </span>
      </header>
      <div className="overflow-x-auto">
        {/* §14.6: ten columns, 820 floor. */}
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              <th className={cn(th, 'text-left')}>
                <span className="text-dense-caption leading-normal font-semibold text-secondary-foreground">Date</span>
              </th>
              {cols.map((c) => (
                <th key={c.code} className={th}>
                  <span className="flex flex-col items-end gap-px">
                    <span className="text-dense-caption leading-normal font-semibold text-secondary-foreground">{c.word}</span>
                    <span className="font-mono text-dense-micro leading-normal font-normal text-muted-foreground">{c.code}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGroups.map((group) => {
              const expanded = expandedMonths.has(group.key)
              return (
                <MonthSection
                  key={group.key}
                  group={group}
                  expanded={expanded}
                  showOpen={showOpen}
                  onToggle={() => toggleMonth(group.key)}
                  onOpenDay={onOpenDay}
                  selectedDay={selectedDay ?? null}
                  openAsOfMonth={optOpenByOpenMonth?.[group.key] ?? 0}
                  onOpenDrill={
                    optOpenLegs != null && optOpenLegs.length > 0
                      ? () => setOpenDrill({ monthKey: group.key, monthLabel: group.label })
                      : undefined
                  }
                />
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={cn(perfUi.panelFoot, 'm-0 py-1.75 leading-normal')}>
        Opt U is a path quantity over the period; Unpaired premium is an as-of inventory. They are different kinds of
        number and never add up.{' '}
        {onGlossary ? (
          <button type="button" className={cn(perfUi.link, 'leading-normal')} onClick={onGlossary}>
            glossary · R / U / N →
          </button>
        ) : null}
      </p>

      {openDrill != null && (
        <OpenOptInventoryDialog
          open
          onClose={() => setOpenDrill(null)}
          monthKey={openDrill.monthKey}
          monthLabel={openDrill.monthLabel}
          asOfDateStr={asOfDateStr ?? '—'}
          legs={optOpenLegs ?? []}
        />
      )}
    </section>
  )
}

function MonthSection({
  group,
  expanded,
  showOpen,
  onToggle,
  onOpenDay,
  selectedDay,
  openAsOfMonth,
  onOpenDrill,
}: {
  group: MonthGroup
  expanded: boolean
  showOpen: boolean
  onToggle: () => void
  onOpenDay?: (date: string) => void
  selectedDay: string | null
  openAsOfMonth: number
  onOpenDrill?: () => void
}) {
  const { sums } = group
  const canDrill = onOpenDrill != null && Math.abs(openAsOfMonth) >= 0.5
  const monthCell = 'bg-[var(--sk-raised2)] font-bold'
  return (
    <>
      <tr
        className="cursor-pointer"
        onClick={onToggle}
        title={expanded ? 'Collapse the month' : 'Expand into days'}
        aria-expanded={expanded}
      >
        <td className={cn(td, monthCell, 'pl-2 text-left font-sans text-foreground')}>
          {expanded ? '▾' : '▸'} {group.label}
        </td>
        <td className={cn(td, monthCell, realizedInk(sums.optR))}>{fmtVal(sums.optR)}</td>
        <td className={cn(td, monthCell, unrealizedInk(sums.optU))}>{fmtVal(sums.optU)}</td>
        {showOpen && (
          <td
            className={cn(td, monthCell, 'text-muted-foreground')}
            onClick={
              canDrill
                ? (e) => {
                    e.stopPropagation()
                    onOpenDrill()
                  }
                : undefined
            }
          >
            {canDrill ? (
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-bold text-inherit hover:underline underline-offset-2"
                title="Show still-open option contracts"
                aria-label={`Open option inventory for ${group.label}`}
              >
                {fmtVal(openAsOfMonth)}
              </button>
            ) : (
              fmtVal(openAsOfMonth)
            )}
          </td>
        )}
        <td className={cn(td, monthCell, quietInk(sums.stocksN, 'soft'))}>{fmtVal(sums.stocksN)}</td>
        <td className={cn(td, monthCell, realizedInk(sums.stocksR))}>{fmtVal(sums.stocksR)}</td>
        <td className={cn(td, monthCell, quietInk(sums.fiN, 'muted'))}>{fmtVal(sums.fiN)}</td>
        <td className={cn(td, monthCell, realizedInk(sums.fiR))}>{fmtVal(sums.fiR)}</td>
        <td className={cn(td, monthCell, dim)}>{fmtVal(sums.cashN)}</td>
        <td className={cn(td, monthCell, dim)}>{fmtVal(sums.cashR)}</td>
      </tr>
      {expanded &&
        group.days.map((day) => {
          const active = [day.optR, day.optU, day.stocksN, day.stocksR, day.fiN, day.fiR, day.cashN, day.cashR]
            .some((v) => Math.abs(v) >= 0.005)
          const clickable = active && onOpenDay != null
          const selected = selectedDay === day.date
          const dayCell = selected ? 'bg-[var(--sk-surface)]' : ''
          return (
            <tr
              key={day.date}
              className={cn('hover:[&>td]:bg-[var(--sk-raised2)]', clickable && 'cursor-pointer')}
              onClick={clickable ? () => onOpenDay(day.date) : undefined}
              title={clickable ? "Open this day's records" : 'No fills that day'}
            >
              <td className={cn(td, dayCell, 'pl-6.5 text-left font-sans', selected ? 'text-[var(--sk-accent)]' : 'text-secondary-foreground')}>
                {fmtIsoDateToken(day.date)}
              </td>
              <td className={cn(td, dayCell, realizedInk(day.optR))}>{fmtVal(day.optR)}</td>
              <td className={cn(td, dayCell, unrealizedInk(day.optU))}>{fmtVal(day.optU)}</td>
              {showOpen && <td className={cn(td, dayCell, dim)}>—</td>}
              <td className={cn(td, dayCell, quietInk(day.stocksN, 'soft'))}>{fmtVal(day.stocksN)}</td>
              <td className={cn(td, dayCell, realizedInk(day.stocksR))}>{fmtVal(day.stocksR)}</td>
              <td className={cn(td, dayCell, quietInk(day.fiN, 'muted'))}>{fmtVal(day.fiN)}</td>
              <td className={cn(td, dayCell, realizedInk(day.fiR))}>{fmtVal(day.fiR)}</td>
              <td className={cn(td, dayCell, dim)}>{fmtVal(day.cashN)}</td>
              <td className={cn(td, dayCell, dim)}>{fmtVal(day.cashR)}</td>
            </tr>
          )
        })}
    </>
  )
}
