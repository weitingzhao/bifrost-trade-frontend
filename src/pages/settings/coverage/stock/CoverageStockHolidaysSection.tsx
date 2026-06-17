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
  addDate: string
  setAddDate: (v: string) => void
  addLabel: string
  setAddLabel: (v: string) => void
  holidayMsg: { text: string; isErr: boolean }
  onAddHoliday: () => void
  onDeleteHoliday: (dateStr: string) => void
}

export function CoverageStockHolidaysSection({
  currentYear,
  holidays,
  holidaysYear,
  setHolidaysYear,
  holidaysLoading,
  loadHolidays,
  addDate,
  setAddDate,
  addLabel,
  setAddLabel,
  holidayMsg,
  onAddHoliday,
  onDeleteHoliday,
}: CoverageStockHolidaysSectionProps) {
  return (
    <div className="space-y-4" id="settings-holidays">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">US market holidays (NYSE)</h3>
        <InfoTooltip text="Holidays used to decide trading days (e.g. Settings → Status → Feed → Interactive Brokers coverage yellow (end)). Add or delete as needed." />
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

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Date</span>
          <input
            type="date"
            value={addDate}
            onChange={e => setAddDate(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            aria-label="Holiday date"
          />
        </label>
        <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Label</span>
          <input
            type="text"
            value={addLabel}
            onChange={e => setAddLabel(e.target.value)}
            placeholder="e.g. New Year's Day"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            aria-label="Holiday label"
          />
        </label>
        <Button type="button" size="sm" onClick={onAddHoliday} disabled={holidaysLoading}>
          Add
        </Button>
      </div>

      {holidayMsg.text ? (
        <p className={`text-sm ${holidayMsg.isErr ? 'text-destructive' : 'text-muted-foreground'}`}>
          {holidayMsg.text}
        </p>
      ) : null}

      {holidaysLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holidays in database. Add a date and label above.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full border-collapse text-sm" aria-label="US market holidays">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Exchange</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {holidays.map(h => (
                <tr key={`${h.exchange}-${h.holiday_date}`} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{h.holiday_date}</td>
                  <td className="px-3 py-2">{h.exchange}</td>
                  <td className="px-3 py-2">{h.label ?? h.name ?? '—'}</td>
                  <td className="px-3 py-2">{h.status ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{h.source ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteHoliday(h.holiday_date)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
