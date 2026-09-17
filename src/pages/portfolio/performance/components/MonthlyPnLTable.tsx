import { useState, useMemo } from 'react'
import { pnlColorClass, unrealizedPnlColorClass } from '@/utils/dailyChange'
import { Skeleton } from '@/components/ui/skeleton'
import { DataStateBlock } from '@/components/data-display'
import { dataState } from '@/lib/dataState'
import type { ByDayRangeData } from '@/types/trading'
import type { OpenOptCashLeg } from '@/utils/ledger/optAsOfPnL'
import OpenOptInventoryDialog from '@/pages/portfolio/performance/components/OpenOptInventoryDialog'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import { perfUi } from '@/pages/portfolio/performance/performanceUi'
import styles from '@/pages/portfolio/performance/components/performanceCalendar.module.css'

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
}

/** Word and code per column: the code is what the calendar and the tooltips call it. */
const COLS: { word: string; code: string; openOnly?: boolean }[] = [
  { word: 'Options realized', code: 'Opt R' },
  { word: 'Unmatched that day', code: 'Opt U' },
  { word: 'Still open today', code: 'Open', openOnly: true },
  { word: 'Stocks net', code: 'Stocks N' },
  { word: 'Stocks realized', code: 'Stocks R' },
  { word: 'FI cash stream', code: 'FI Stream' },
  { word: 'FI realized', code: 'FI R' },
  { word: 'Cash net', code: 'Cash N' },
  { word: 'Cash realized', code: 'Cash R' },
]

const th = 'whitespace-nowrap border-b border-border px-2 py-1 text-right align-bottom'
const td = 'whitespace-nowrap border-b border-border/50 px-2 py-1.25 text-right font-mono text-dense-body tabular-nums'

function fmtVal(v: number): string {
  if (Math.abs(v) < 0.005) return '—'
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function unrealizedColorClass(value: number): string {
  if (Math.abs(value) < 0.005) return 'text-muted-foreground'
  return unrealizedPnlColorClass(value)
}

function signedNotionalClass(val: number): string {
  if (Math.abs(val) < 0.005) return ''
  if (val > 0) return styles.notionalPos
  if (val < 0) return styles.notionalNeg
  return ''
}

function cashNotionalClass(val: number): string {
  if (Math.abs(val) < 0.005) return ''
  return styles.notionalCashLike
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
}: MonthlyPnLTableProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [showOpen, setShowOpen] = useState(true)
  const [openDrill, setOpenDrill] = useState<{ monthKey: string; monthLabel: string } | null>(null)

  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (!byDayRangeData) return []

    // The range runs to the end of the quarter; a day that has not happened has no session to show.
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const dates = Object.keys(byDayRangeData.opt).filter((d) => d <= today).sort()
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
      <header className={perfUi.panelHead}>
        <span className={perfUi.cap}>Per-month · per-day</span>
        <span className={perfUi.panelTitle}>nine measures</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-dense-meta text-muted-foreground">
          <input
            type="checkbox"
            checked={showOpen}
            onChange={() => setShowOpen((v) => !v)}
            className="accent-[var(--primary)]"
          />
          Show still-open option premium
          <span className="text-muted-foreground/80">— inventory, not P&amp;L</span>
        </label>
        <span className={cn(perfUi.note, 'ml-auto')}>
          {monthGroups.length} {monthGroups.length === 1 ? 'month' : 'months'} · click a month to open its days
          {onOpenDay ? ', a day to open its records' : ''}
        </span>
      </header>
      <div className="overflow-x-auto">
        {/* §14.6: ten columns, 820 floor. */}
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              <th className={cn(th, 'text-left')}>
                <span className="text-dense-caption font-semibold text-foreground/85">Date</span>
              </th>
              {cols.map((c) => (
                <th key={c.code} className={th}>
                  <span className="flex flex-col items-end gap-px">
                    <span className="text-dense-caption font-semibold text-foreground/85">{c.word}</span>
                    <span className="font-mono text-dense-micro font-normal text-muted-foreground">{c.code}</span>
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
      <p className={cn(perfUi.panelFoot, 'm-0')}>
        Opt U is a path figure — premium left unmatched on each day. Still open today is an as-of inventory — what is
        unmatched now, by the month it opened. Different kinds of number; they never add up.
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
  openAsOfMonth,
  onOpenDrill,
}: {
  group: MonthGroup
  expanded: boolean
  showOpen: boolean
  onToggle: () => void
  onOpenDay?: (date: string) => void
  openAsOfMonth: number
  onOpenDrill?: () => void
}) {
  const { sums } = group
  const canDrill = onOpenDrill != null && Math.abs(openAsOfMonth) >= 0.005
  return (
    <>
      <tr
        className="cursor-pointer bg-secondary/40 hover:bg-secondary"
        onClick={onToggle}
        title={expanded ? 'Collapse the month' : 'Expand into days'}
        aria-expanded={expanded}
      >
        <td className={cn(td, 'text-left font-sans font-bold text-foreground')}>
          <span className="mr-1.5 inline-block w-3 text-center text-muted-foreground">{expanded ? '▾' : '▸'}</span>
          {group.label}
        </td>
        <td className={cn(td, 'font-bold', pnlColorClass(sums.optR))}>{fmtVal(sums.optR)}</td>
        <td className={cn(td, 'font-bold', unrealizedColorClass(sums.optU))}>{fmtVal(sums.optU)}</td>
        {showOpen && (
          <td
            className={cn(td, 'font-bold', unrealizedColorClass(openAsOfMonth))}
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
                className="cursor-pointer border-0 bg-transparent p-0 font-semibold hover:underline underline-offset-2"
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
        <td className={cn(td, 'font-bold', signedNotionalClass(sums.stocksN))}>{fmtVal(sums.stocksN)}</td>
        <td className={cn(td, 'font-bold', pnlColorClass(sums.stocksR))}>{fmtVal(sums.stocksR)}</td>
        <td className={cn(td, 'font-bold', signedNotionalClass(sums.fiN))}>{fmtVal(sums.fiN)}</td>
        <td className={cn(td, 'font-bold', pnlColorClass(sums.fiR))}>{fmtVal(sums.fiR)}</td>
        <td className={cn(td, 'font-bold', cashNotionalClass(sums.cashN))}>{fmtVal(sums.cashN)}</td>
        <td className={cn(td, 'font-bold', pnlColorClass(sums.cashR))}>{fmtVal(sums.cashR)}</td>
      </tr>
      {expanded &&
        group.days.map((day) => {
          const active = [day.optR, day.optU, day.stocksN, day.stocksR, day.fiN, day.fiR, day.cashN, day.cashR]
            .some((v) => Math.abs(v) >= 0.005)
          const clickable = active && onOpenDay != null
          return (
            <tr
              key={day.date}
              className={cn(clickable && 'cursor-pointer hover:bg-secondary/40')}
              onClick={clickable ? () => onOpenDay(day.date) : undefined}
              title={clickable ? "Open this day's records" : active ? undefined : 'No fills that day'}
            >
              <td className={cn(td, 'pl-7 text-left text-foreground/80')}>{fmtIsoDateToken(day.date)}</td>
              <td className={cn(td, pnlColorClass(day.optR))}>{fmtVal(day.optR)}</td>
              <td className={cn(td, unrealizedColorClass(day.optU))}>{fmtVal(day.optU)}</td>
              {showOpen && <td className={cn(td, 'text-muted-foreground')}>—</td>}
              <td className={cn(td, signedNotionalClass(day.stocksN))}>{fmtVal(day.stocksN)}</td>
              <td className={cn(td, pnlColorClass(day.stocksR))}>{fmtVal(day.stocksR)}</td>
              <td className={cn(td, signedNotionalClass(day.fiN))}>{fmtVal(day.fiN)}</td>
              <td className={cn(td, pnlColorClass(day.fiR))}>{fmtVal(day.fiR)}</td>
              <td className={cn(td, cashNotionalClass(day.cashN))}>{fmtVal(day.cashN)}</td>
              <td className={cn(td, pnlColorClass(day.cashR))}>{fmtVal(day.cashR)}</td>
            </tr>
          )
        })}
    </>
  )
}
