/**
 * The 0.11.0 kit as this app receives it (@bifrost/ui 0.11.0, design Rev .146 ·
 * .150 · .151, §17.5 · §17.9 · §17.10). No page uses the new pieces yet — the
 * filter migration and the Calendar page take them next — so this pins what
 * they will rely on: the overlay head and close, the sheet's size, the filter
 * chip / tray / group, the selected segment, and the calendar frame's rules
 * (trading days, today, holidays, keyboard).
 */
import { existsSync, readFileSync } from 'node:fs'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  CalendarGrid,
  Dialog,
  DialogContent,
  DialogTitle,
  FilterChip,
  FilterGroup,
  FilterTray,
  InspectorPanel,
  MiniMonth,
  PanelHead,
  SegmentControl,
  TimeStrip,
  filterGroupState,
  formatRelativeDays,
  formatWeekLabel,
  nextGroupValue,
  segmentButtonClass,
  stripDates,
  type CalendarDayContext,
} from '@bifrost/ui'

describe('overlay head and close (Rev .151)', () => {
  it('PanelHead is the transparent head with the round close', () => {
    const onClose = vi.fn()
    render(<PanelHead title="Plan a trade" meta="Nothing is sent until you create the intent" onClose={onClose} />)
    const head = document.querySelector('[data-slot="panel-head"]')!
    expect(head.hasAttribute('data-sr-head')).toBe(true)
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.hasAttribute('data-sr-close')).toBe(true)
    fireEvent.click(close)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('InspectorPanel wears it, keeping its close label', () => {
    render(<InspectorPanel selection="single" title="R-12" meta="draft" onClose={() => {}} />)
    const panel = document.querySelector('[data-slot="inspector-panel"]')!
    expect(panel.querySelector('[data-sr-head]')).not.toBeNull()
    expect(within(panel as HTMLElement).getByRole('button', { name: 'Close inspector' }).hasAttribute('data-sr-close')).toBe(true)
  })

  it('DialogContent: the built-in close is the round one, and size marks the material', () => {
    render(
      <Dialog open>
        <DialogContent presentation="sheet" size="md">
          <DialogTitle>Edit allocation</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const content = document.querySelector('[data-slot="dialog-content"]')!
    expect(content.getAttribute('data-size')).toBe('md')
    expect(content.className).toMatch(/sm:max-w-\[600px\]/)
    const close = content.querySelector('[data-slot="dialog-close"]')!
    expect(close.hasAttribute('data-sr-close')).toBe(true)
    expect(close.getAttribute('aria-label')).toBe('Close')
  })

  it('no size keeps the glass sheet as it was', () => {
    render(
      <Dialog open>
        <DialogContent presentation="sheet">
          <DialogTitle>Delete?</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    expect(document.querySelector('[data-slot="dialog-content"]')!.hasAttribute('data-size')).toBe(false)
  })
})

describe('SegmentControl selected segment (§17.10, Owner #3)', () => {
  it('is ink 15% with the lens, not the card surface', () => {
    const on = segmentButtonClass(true)
    expect(on).not.toMatch(/\bbg-card\b/)
    expect(on).toMatch(/_15%,transparent\)\]/)
    expect(on).toMatch(/--glass-lens/)
    render(<SegmentControl value="b" onChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('FilterChip · FilterTray · FilterGroup (§17.10)', () => {
  it('a chip is a pressed button with a count, and passes drag props through', () => {
    const onPressedChange = vi.fn()
    const onDragStart = vi.fn()
    render(
      <FilterChip pressed={false} onPressedChange={onPressedChange} count={4} draggable onDragStart={onDragStart}>
        Fills
      </FilterChip>,
    )
    const chip = screen.getByRole('button', { name: /Fills/ })
    expect(chip.getAttribute('aria-pressed')).toBe('false')
    expect(chip.getAttribute('draggable')).toBe('true')
    expect(chip.querySelector('[data-slot="filter-chip-count"]')?.textContent).toBe('4')
    fireEvent.click(chip)
    expect(onPressedChange).toHaveBeenCalledWith(true)
    fireEvent.dragStart(chip)
    expect(onDragStart).toHaveBeenCalled()
    // No accent: on is ink 15%, never the accent token.
    expect(chip.className).not.toMatch(/sk-accent|text-primary/)
  })

  it('0.12.0 (Rev .156): sm, dashed and missing — missing refuses the click and says why', () => {
    const onPressedChange = vi.fn()
    render(
      <>
        <FilterChip pressed={false} size="sm">AVOID</FilterChip>
        <FilterChip pressed dashed>Guidance</FilterChip>
        <FilterChip pressed={false} missing title="No reading in range" onPressedChange={onPressedChange} count="—">
          Earnings
        </FilterChip>
      </>,
    )
    const sm = screen.getByRole('button', { name: 'AVOID' })
    expect(sm.getAttribute('data-size')).toBe('sm')
    expect(sm.className).toMatch(/h-5/)
    const dashed = screen.getByRole('button', { name: 'Guidance' })
    expect(dashed.getAttribute('data-dashed')).toBe('true')
    expect(dashed.className).toMatch(/border-dashed/)
    const missing = screen.getByRole('button', { name: /Earnings/ })
    expect(missing.getAttribute('aria-disabled')).toBe('true')
    expect(missing.getAttribute('title')).toBe('No reading in range')
    expect(missing.className).toMatch(/sk-faint/)
    fireEvent.click(missing)
    expect(onPressedChange).not.toHaveBeenCalled()
  })

  it('a joined tray squares its chips', () => {
    render(
      <FilterTray variant="joined" aria-label="Accounts in scope">
        <FilterChip pressed>Host</FilterChip>
        <FilterChip pressed={false}>Secondary</FilterChip>
      </FilterTray>,
    )
    expect(screen.getByRole('group', { name: 'Accounts in scope' }).getAttribute('data-variant')).toBe('joined')
    expect(screen.getByRole('button', { name: 'Host' }).className).toMatch(/rounded-none/)
  })

  it('the group head is tri-state: all → none, otherwise → all', () => {
    const ids = ['pnl', 'fills', 'expiry']
    expect(filterGroupState(ids, new Set(ids))).toBe('all')
    expect(filterGroupState(ids, new Set(['fills']))).toBe('some')
    expect(filterGroupState(ids, new Set(['notes']))).toBe('none')
    expect([...nextGroupValue(ids, new Set([...ids, 'notes']))]).toEqual(['notes'])
    expect(nextGroupValue(ids, new Set(['fills', 'notes']))).toEqual(new Set(['fills', 'notes', 'pnl', 'expiry']))
    expect(nextGroupValue(ids, new Set())).toEqual(new Set(ids))
  })

  it('renders the head as role=checkbox with aria-checked true | mixed | false', () => {
    function Harness() {
      const [on, setOn] = useState(new Set(['pnl', 'fills', 'notes']))
      return (
        <FilterGroup
          label="Book & market"
          items={[
            { id: 'pnl', label: 'P&L', count: 7 },
            { id: 'fills', label: 'Fills', count: 25 },
          ]}
          value={on}
          onChange={setOn}
        />
      )
    }
    render(<Harness />)
    const head = screen.getByRole('checkbox', { name: /Book & market/ })
    expect(head.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Fills/ }))
    expect(head.getAttribute('aria-checked')).toBe('mixed')
    fireEvent.click(head)
    expect(head.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(head)
    expect(head.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('button', { name: /P&L/ }).getAttribute('aria-pressed')).toBe('false')
  })
})

describe('CalendarGrid (§17.9)', () => {
  const heads = () => screen.getAllByRole('columnheader').map((h) => h.textContent)

  it('draws weekdays only, Monday first, and today with its label', () => {
    render(<CalendarGrid month="2026-09" today="2026-09-11" selected="2026-09-11" />)
    expect(heads()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
    const today = document.querySelector('[data-date="2026-09-11"]')!
    expect(today.getAttribute('data-today')).toBe('true')
    expect(today.textContent).toMatch(/today/)
    expect(today.getAttribute('aria-selected')).toBe('true')
  })

  it('adds the weekend column when today is on it (Owner #19), or something is dated there', () => {
    const { unmount } = render(<CalendarGrid month="2026-10" today="2026-10-04" />)
    expect(heads()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'])
    unmount()
    render(<CalendarGrid month="2026-09" today="2026-09-11" hasContent={(d) => d === '2026-09-19'} />)
    expect(heads()).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })

  it('gives the page the day and its tense; a closed market draws no content', () => {
    const seen: CalendarDayContext[] = []
    render(
      <CalendarGrid
        month="2026-09"
        today="2026-09-11"
        holidays={{ '2026-09-07': 'Labor Day', '2026-09-10': { label: '', kind: 'early' } }}
        renderCell={(ctx) => {
          seen.push(ctx)
          return <span>{`${ctx.tense} cell`}</span>
        }}
      />,
    )
    expect(seen.find((c) => c.date === '2026-09-11')?.tense).toBe('today')
    expect(seen.find((c) => c.date === '2026-09-10')?.tense).toBe('past')
    expect(seen.some((c) => c.date === '2026-09-07')).toBe(false)
    expect(document.querySelector('[data-date="2026-09-07"]')!.textContent).toMatch(/Labor Day · market closed/)
    const early = document.querySelector('[data-date="2026-09-10"]')!
    expect(early.textContent).toMatch(/early close/)
    expect(early.textContent).toMatch(/past cell/)
    // Out-of-month days get no content.
    expect(seen.some((c) => c.date === '2026-08-31')).toBe(false)
  })

  it('keyboard: ← → skip the weekend, ↑ ↓ a week, T today, [ ] a month, Enter opens', () => {
    const onSelect = vi.fn()
    const onMonthChange = vi.fn()
    const onOpen = vi.fn()
    render(
      <CalendarGrid
        month="2026-09"
        today="2026-09-11"
        selected="2026-09-18"
        onSelect={onSelect}
        onMonthChange={onMonthChange}
        onOpen={onOpen}
      />,
    )
    const grid = screen.getByRole('grid')
    const fri = document.querySelector('[data-date="2026-09-18"]') as HTMLElement
    fireEvent.keyDown(fri, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-21')
    fireEvent.keyDown(fri, { key: 'ArrowDown' })
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-25')
    fireEvent.keyDown(fri, { key: 'T' })
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-11')
    fireEvent.keyDown(grid, { key: ']' })
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-10')
    fireEvent.keyDown(fri, { key: 'Enter' })
    expect(onOpen).toHaveBeenCalledWith('2026-09-18')
    // Moving out of the month asks for the month too.
    const last = document.querySelector('[data-date="2026-09-30"]') as HTMLElement
    fireEvent.keyDown(last, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith('2026-10-01')
    expect(onMonthChange).toHaveBeenLastCalledWith('2026-10')
  })

  it('text fields keep their keys', () => {
    const onSelect = vi.fn()
    render(<CalendarGrid month="2026-09" today="2026-09-11" onSelect={onSelect} renderCell={() => <input aria-label="note" />} />)
    fireEvent.keyDown(screen.getAllByRole('textbox', { name: 'note' })[0], { key: 'ArrowRight' })
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('MiniMonth (§17.9, ASK option 3)', () => {
  it('dims weekends and refuses them; status draws a dot or a ring', () => {
    const onSelect = vi.fn()
    render(
      <MiniMonth
        month="2026-09"
        onMonthChange={() => {}}
        today="2026-09-18"
        selected="2026-09-17"
        onSelect={onSelect}
        status={(d) => (d === '2026-09-17' ? 'pending' : d === '2026-09-16' ? 'done' : null)}
        statusLabels={{ done: 'distilled', pending: 'not distilled yet' }}
      />,
    )
    const sat = document.querySelector('[data-date="2026-09-19"]') as HTMLElement
    expect(sat.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(sat)
    expect(onSelect).not.toHaveBeenCalled()
    expect(document.querySelector('[data-date="2026-09-17"]')!.getAttribute('aria-label')).toBe('Thu 17 Sep · not distilled yet')
    fireEvent.click(document.querySelector('[data-date="2026-09-16"]')!)
    expect(onSelect).toHaveBeenCalledWith('2026-09-16')
  })

  it('arrows skip disabled days; Enter is done', () => {
    const onSelect = vi.fn()
    const onDone = vi.fn()
    render(<MiniMonth month="2026-09" onMonthChange={() => {}} selected="2026-09-18" onSelect={onSelect} onDone={onDone} />)
    const fri = document.querySelector('[data-date="2026-09-18"]') as HTMLElement
    fireEvent.keyDown(fri, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenLastCalledWith('2026-09-21')
    fireEvent.keyDown(fri, { key: 'Enter' })
    expect(onDone).toHaveBeenCalled()
  })
})

describe('TimeStrip (§17.9)', () => {
  it('stripDates: weekdays, plus a weekend day only when something is on it', () => {
    expect(stripDates('2026-09-11', '2026-09-15')).toEqual(['2026-09-11', '2026-09-14', '2026-09-15'])
    expect(stripDates('2026-09-11', '2026-09-14', { include: (d) => d === '2026-09-12' })).toEqual([
      '2026-09-11',
      '2026-09-12',
      '2026-09-14',
    ])
    expect(formatRelativeDays('2026-09-18', '2026-09-11')).toBe('in 7d')
    expect(formatWeekLabel('2026-09-07', '2026-09-11')).toBe('Mon 7 – Fri 11 Sep')
  })

  it('lanes: today is marked; cells are the page’s', () => {
    render(
      <TimeStrip
        dates={['2026-09-11', '2026-09-14']}
        today="2026-09-11"
        lanes={[{ id: 'macro', label: 'Macro' }]}
        renderLane={(_lane, d) => (d === '2026-09-14' ? <span>CPI</span> : null)}
        aria-label="Next 30 days"
      />,
    )
    const grid = screen.getByRole('grid', { name: 'Next 30 days' })
    expect(within(grid).getAllByRole('columnheader')[1].textContent).toMatch(/today/)
    expect(within(grid).getByRole('rowheader', { name: 'Macro' })).toBeTruthy()
    expect(within(grid).getByText('CPI')).toBeTruthy()
  })

  it('bars: a lead column carries today; ← → move the selection; [ ] page', () => {
    const onSelect = vi.fn()
    const onPage = vi.fn()
    const vals: Record<string, number> = { '2026-09-18': 3, '2026-09-25': 6, '2026-10-02': 0 }
    render(
      <TimeStrip
        dates={Object.keys(vals)}
        today="2026-09-11"
        barValue={(d) => vals[d]}
        selected="2026-09-18"
        onSelect={onSelect}
        onPage={onPage}
        aria-label="Expiry ladder"
      />,
    )
    const grid = screen.getByRole('grid', { name: 'Expiry ladder' })
    expect(grid.textContent).toMatch(/today/)
    const bars = grid.querySelectorAll<HTMLElement>('[data-slot="time-strip-bar"]')
    expect(bars[1].style.height).toBe('88px')
    expect(bars[2].style.height).toBe('2px')
    fireEvent.keyDown(grid, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('2026-09-25')
    fireEvent.keyDown(grid, { key: ']' })
    expect(onPage).toHaveBeenCalledWith(1)
  })
})

/** The stylesheet half: the overlay values the registry moved to, behind their attributes. */
describe('the 0.11.0 stylesheets', () => {
  const read = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '')
  const patterns = read('node_modules/@bifrost/ui/dist/styles/patterns.css')
  const materials = read('node_modules/@bifrost/ui/dist/styles/materials.css')

  it('patterns: the head rule, the 14% scrim, the detached sheet; no retired names', () => {
    if (!patterns) return
    expect(patterns).toMatch(/\[data-sr-head\]\s*\{[^}]*padding: 12px 16px/)
    expect(patterns).toMatch(/\[data-sr-scrim\]\s*\{[^}]*rgb\(4 6 9 \/ 0\.14\)/)
    expect(patterns).toMatch(/\[data-sr-sheet\]\s*\{[^}]*border-radius: 14px/)
    expect(patterns).not.toMatch(/--glass-border/)
  })

  it('materials: md / lg sheets are opaque, and every sheet wears the drop', () => {
    if (!materials) return
    expect(materials).toMatch(/\[data-presentation='sheet'\]:is\(\[data-size='md'\], \[data-size='lg'\]\)\s*\{[^}]*backdrop-filter: none/)
    expect(materials).not.toMatch(/0 30px 80px -20px/)
  })
})
