import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Button } from '@/components/ui/button'
import type { MarketHolidayRow } from '@/api/monitor'

export interface CoverageStockHolidaysSectionProps {
  currentYear: number
  holidays: MarketHolidayRow[]
  holidaysYear: string
  setHolidaysYear: (v: string) => void
  holidaysLoading: boolean
  loadHolidays: () => void
}

export function CoverageStockHolidaysSection({
  currentYear,
  holidays,
  holidaysYear,
  setHolidaysYear,
  holidaysLoading,
  loadHolidays,
}: CoverageStockHolidaysSectionProps) {
  return (
    <div className="space-y-4" id="settings-holidays">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">US market holidays (NYSE)</h3>
        <InfoTooltip text="Calendar maintained automatically by Market Data Plugin (Polygon.io). Manual editing is no longer available. Used to decide trading days (e.g. coverage yellow end)." />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Year</span>
          <select
            value={holidaysYear}
            onChange={e => setHolidaysYear(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            aria-label="Filter holidays by year"
          >
            <option value="">All</option>
            {Array.from({ length: currentYear + 2 - 2020 + 1 }, (_, i) => 2020 + i).map(y => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={loadHolidays} disabled={holidaysLoading}>
          Refresh
        </Button>
      </div>

      {holidaysLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No holidays in Golden Source yet. Plugin calendar ingest will populate upcoming sessions.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm" aria-label="US market holidays">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Exchange</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map(h => (
                <tr key={`${h.exchange}-${h.holiday_date}`} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{h.holiday_date}</td>
                  <td className="px-3 py-2">{h.exchange}</td>
                  <td className="px-3 py-2">{h.label ?? h.name ?? '—'}</td>
                  <td className="px-3 py-2">{h.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
