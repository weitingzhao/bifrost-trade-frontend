import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ByDayRangeData } from '@/types/trading'

interface MonthlyPnLTableProps {
  byDayRangeData: ByDayRangeData | null
  isLoading?: boolean
}

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
  return 'text-cyan-600 dark:text-cyan-400'
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

export default function MonthlyPnLTable({ byDayRangeData, isLoading }: MonthlyPnLTableProps) {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (!byDayRangeData) return []

    const dates = Object.keys(byDayRangeData.opt).sort()
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

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]

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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly PnL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly PnL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No Option or Stock PnL in the selected range.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly PnL</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-medium">DATE</th>
              <th className="px-2 py-1.5 text-right font-medium">OPT R</th>
              <th className="px-2 py-1.5 text-right font-medium">OPT U</th>
              <th className="px-2 py-1.5 text-right font-medium">STOCKS N</th>
              <th className="px-2 py-1.5 text-right font-medium">STOCKS R</th>
              <th className="px-2 py-1.5 text-right font-medium">FI N</th>
              <th className="px-2 py-1.5 text-right font-medium">FI R</th>
              <th className="px-2 py-1.5 text-right font-medium">CASH N</th>
              <th className="px-2 py-1.5 text-right font-medium">CASH R</th>
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
                  onToggle={() => toggleMonth(group.key)}
                />
              )
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

function MonthSection({
  group,
  expanded,
  onToggle,
}: {
  group: MonthGroup
  expanded: boolean
  onToggle: () => void
}) {
  const { sums } = group
  return (
    <>
      <tr
        className="cursor-pointer border-b bg-muted/50 hover:bg-muted/80 font-semibold"
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 whitespace-nowrap">
          <span className="mr-1.5 inline-block w-3 text-center">
            {expanded ? '▼' : '►'}
          </span>
          {group.label}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.optR))}>
          {fmtVal(sums.optR)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', unrealizedColorClass(sums.optU))}>
          {fmtVal(sums.optU)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.stocksN))}>
          {fmtVal(sums.stocksN)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.stocksR))}>
          {fmtVal(sums.stocksR)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.fiN))}>
          {fmtVal(sums.fiN)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.fiR))}>
          {fmtVal(sums.fiR)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.cashN))}>
          {fmtVal(sums.cashN)}
        </td>
        <td className={cn('px-2 py-1.5 text-right tabular-nums', pnlColorClass(sums.cashR))}>
          {fmtVal(sums.cashR)}
        </td>
      </tr>
      {expanded &&
        group.days.map((day) => (
          <tr key={day.date} className="border-b border-border/50 hover:bg-accent/30">
            <td className="px-2 py-1 pl-7 whitespace-nowrap text-muted-foreground">
              {day.date}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.optR))}>
              {fmtVal(day.optR)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', unrealizedColorClass(day.optU))}>
              {fmtVal(day.optU)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.stocksN))}>
              {fmtVal(day.stocksN)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.stocksR))}>
              {fmtVal(day.stocksR)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.fiN))}>
              {fmtVal(day.fiN)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.fiR))}>
              {fmtVal(day.fiR)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.cashN))}>
              {fmtVal(day.cashN)}
            </td>
            <td className={cn('px-2 py-1 text-right tabular-nums', pnlColorClass(day.cashR))}>
              {fmtVal(day.cashR)}
            </td>
          </tr>
        ))}
    </>
  )
}
