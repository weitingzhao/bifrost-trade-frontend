/**
 * The list kit as this app receives it (@bifrost/ui 0.10.0, design Rev .150–.154,
 * §17.2 "a grid on glass"). No page opens the list scope yet — the shell and the
 * pilot pages take it next — so this pins the behaviour they will rely on: the
 * markup each component writes, the stuck measurement, and that the stylesheet
 * keeps every new rule behind its own attribute.
 */
import { existsSync, readFileSync } from 'node:fs'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import {
  DenseDataTable,
  DenseList,
  DenseListHead,
  DenseListRow,
  DenseTableBody,
  DenseTableCell,
  DenseTableRow,
  DenseTableSubheadRow,
  FilterBar,
  IconActionButton,
  isHeadStuck,
  isScrolledX,
  isStuck,
  markStuck,
  useStuckMarks,
} from '@bifrost/ui'

afterEach(() => vi.restoreAllMocks())

/** jsdom has no layout: give an element a box and a scroller a scroll offset. */
function place(el: Element, top: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 20,
    left: 0,
    right: 100,
    width: 100,
    height: 20,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect)
}
function scroll(el: Element, top: number, left = 0) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: top })
  Object.defineProperty(el, 'scrollLeft', { configurable: true, value: left })
}
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

describe('DenseDataTable variant="list"', () => {
  it('opens the list scope on its frame; the default table does not', () => {
    const { container } = render(
      <>
        <DenseDataTable variant="list">
          <tbody />
        </DenseDataTable>
        <DenseDataTable>
          <tbody />
        </DenseDataTable>
      </>,
    )
    const frames = container.querySelectorAll('[data-slot="dense-table-frame"]')
    expect(frames[0].hasAttribute('data-sr-list')).toBe(true)
    expect(frames[1].hasAttribute('data-sr-list')).toBe(false)
  })

  it('writes row state as attributes and a variable, not as a background', () => {
    render(
      <DenseDataTable variant="list">
        <DenseTableBody>
          <DenseTableSubheadRow>
            <DenseTableCell colSpan={2}>Shares</DenseTableCell>
          </DenseTableSubheadRow>
          <DenseTableRow data-testid="breach" rowTint="rgb(248 113 113 / 0.14)" style={{ height: 24 }}>
            <DenseTableCell>NVDA</DenseTableCell>
          </DenseTableRow>
          <DenseTableRow data-testid="open" selected>
            <DenseTableCell>AMD</DenseTableCell>
          </DenseTableRow>
          <DenseTableRow data-testid="plain">
            <DenseTableCell>TSLA</DenseTableCell>
          </DenseTableRow>
        </DenseTableBody>
      </DenseDataTable>,
    )
    const breach = screen.getByTestId('breach')
    expect(breach.style.getPropertyValue('--sr-row')).toBe('rgb(248 113 113 / 0.14)')
    expect(breach.style.height).toBe('24px')
    expect(breach.getAttribute('data-selected')).toBeNull()
    expect(screen.getByTestId('open').getAttribute('data-selected')).toBe('true')
    const plain = screen.getByTestId('plain')
    expect(plain.getAttribute('data-selected')).toBeNull()
    expect(plain.style.getPropertyValue('--sr-row')).toBe('')
    expect(screen.getByText('Shares').closest('tr')?.hasAttribute('data-sr-group')).toBe(true)
  })
})

describe('DenseList', () => {
  it('gives hover, focus and keys only to a row that opens something', () => {
    const open = vi.fn()
    render(
      <DenseList aria-label="Signals">
        <DenseListHead>Lens</DenseListHead>
        <DenseListRow onClick={open} selected tint="rgb(250 204 21 / 0.12)">
          IV rank <button type="button">Pin</button>
        </DenseListRow>
        <DenseListRow>Skew</DenseListRow>
      </DenseList>,
    )
    const list = screen.getByRole('list', { name: 'Signals' })
    expect(list.hasAttribute('data-sr-list')).toBe(true)
    expect(screen.getByText('Lens').hasAttribute('data-sr-rowhead')).toBe(true)

    const [clickable, still] = screen.getAllByRole('listitem')
    expect(clickable.hasAttribute('data-sr-row')).toBe(true)
    expect(clickable.hasAttribute('data-sr-click')).toBe(true)
    expect(clickable.tabIndex).toBe(0)
    expect(clickable.getAttribute('data-selected')).toBe('true')
    expect(clickable.style.getPropertyValue('--sr-row')).toBe('rgb(250 204 21 / 0.12)')
    expect(still.hasAttribute('data-sr-click')).toBe(false)
    expect(still.hasAttribute('tabindex')).toBe(false)
    expect(still.getAttribute('data-selected')).toBeNull()

    fireEvent.keyDown(clickable, { key: 'Enter' })
    fireEvent.keyDown(clickable, { key: ' ' })
    expect(open).toHaveBeenCalledTimes(2)
    // Enter on a button inside the row is the button's, not the row's.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Pin' }), { key: 'Enter' })
    expect(open).toHaveBeenCalledTimes(2)
    fireEvent.click(clickable)
    expect(open).toHaveBeenCalledTimes(3)
  })
})

describe('IconActionButton variant="close"', () => {
  it('is the one round close, labelled Close unless told otherwise', () => {
    const close = vi.fn()
    render(
      <>
        <IconActionButton variant="close" onClick={close} />
        <IconActionButton variant="close" size="sm" ariaLabel="Remove NVDA" onClick={close} />
        <IconActionButton title="Edit" ariaLabel="Edit plan" onClick={close}>
          ✎
        </IconActionButton>
      </>,
    )
    const md = screen.getByRole('button', { name: 'Close' })
    expect(md.getAttribute('data-sr-close')).toBe('')
    expect(md.querySelector('svg')).not.toBeNull()
    const sm = screen.getByRole('button', { name: 'Remove NVDA' })
    expect(sm.getAttribute('data-sr-close')).toBe('sm')
    expect(sm.getAttribute('title')).toBe('Remove NVDA')
    expect(screen.getByRole('button', { name: 'Edit plan' }).hasAttribute('data-sr-close')).toBe(false)
    fireEvent.click(md)
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe('stuck marks', () => {
  it('a bar is stuck only once its scroller has moved and it sits at the top', () => {
    const scroller = document.createElement('div')
    const bar = document.createElement('div')
    scroller.appendChild(bar)
    place(scroller, 100)
    place(bar, 100)
    scroll(scroller, 0)
    expect(isStuck(bar, scroller)).toBe(false) // at rest: no band
    scroll(scroller, 40)
    expect(isStuck(bar, scroller)).toBe(true)
    place(bar, 140) // scrolled, but the bar is still below the top
    expect(isStuck(bar, scroller)).toBe(false)
  })

  it('counts the scroller padding and the bar\'s own top offset, where a sticky box parks', () => {
    const scroller = document.createElement('div')
    scroller.style.paddingTop = '16px'
    const bar = document.createElement('div')
    bar.style.top = '8px'
    scroller.appendChild(bar)
    document.body.appendChild(scroller)
    place(scroller, 100)
    scroll(scroller, 40)
    place(bar, 124) // 100 + 16 padding + 8 top: parked
    expect(isStuck(bar, scroller)).toBe(true)
    place(bar, 140)
    expect(isStuck(bar, scroller)).toBe(false)
    scroller.remove()
  })

  it('marks bars, heads and wide boxes in one pass, and clears them again', () => {
    const root = document.createElement('div')
    root.innerHTML = `
      <div data-testid="sc" style="overflow-y: auto">
        <div data-sr-toolbar data-sticky></div>
        <div data-sr-edge="solid"></div>
        <div data-sr-hscroll><table><thead><tr><th>Symbol</th></tr></thead><tbody></tbody></table></div>
      </div>`
    document.body.appendChild(root)
    const sc = root.querySelector('[data-testid="sc"]')!
    const bar = root.querySelector('[data-sr-toolbar]')!
    const edge = root.querySelector('[data-sr-edge]')!
    const box = root.querySelector('[data-sr-hscroll]')!
    const thead = root.querySelector('thead')!
    place(sc, 0)
    place(bar, 0)
    place(edge, 0)
    place(root.querySelector('table')!, -60)
    place(root.querySelector('th')!, 0)
    scroll(sc, 60)
    scroll(box, 0, 24)

    markStuck(root)
    expect(bar.getAttribute('data-stuck')).toBe('1')
    expect(edge.getAttribute('data-stuck')).toBe('1')
    expect(thead.hasAttribute('data-stuck')).toBe(true)
    expect(isHeadStuck(thead)).toBe(true)
    expect(box.hasAttribute('data-sx')).toBe(true)
    expect(isScrolledX(box)).toBe(true)

    scroll(sc, 0)
    scroll(box, 0, 0)
    place(root.querySelector('table')!, 0)
    markStuck(root)
    expect(bar.getAttribute('data-stuck')).toBe('0')
    expect(edge.getAttribute('data-stuck')).toBe('0')
    expect(thead.hasAttribute('data-stuck')).toBe(false)
    expect(box.hasAttribute('data-sx')).toBe(false)
    root.remove()
  })

  it('useStuckMarks re-marks on scroll inside the surface', async () => {
    function Surface() {
      const ref = useRef<HTMLDivElement>(null)
      useStuckMarks(ref)
      return (
        <div ref={ref} data-testid="surface" style={{ overflowY: 'auto' }}>
          <div data-sr-edge="fade" data-testid="edge" />
        </div>
      )
    }
    render(<Surface />)
    const surface = screen.getByTestId('surface')
    const edge = screen.getByTestId('edge')
    place(surface, 0)
    place(edge, 0)
    scroll(surface, 30)
    await act(async () => {
      fireEvent.scroll(surface)
      await frame()
    })
    expect(edge.getAttribute('data-stuck')).toBe('1')
  })

  it('a sticky FilterBar measures itself; a plain one carries no mark', async () => {
    render(
      <div data-testid="sc" style={{ overflowY: 'auto' }}>
        <FilterBar sticky aria-label="Plans filters">
          <FilterBar.Label>Status</FilterBar.Label>
        </FilterBar>
        <FilterBar aria-label="Static">x</FilterBar>
      </div>,
    )
    const bar = screen.getByRole('toolbar', { name: 'Plans filters' })
    expect(bar.getAttribute('data-stuck')).toBe('0')
    expect(screen.getByRole('toolbar', { name: 'Static' }).hasAttribute('data-stuck')).toBe(false)
    const sc = screen.getByTestId('sc')
    place(sc, 0)
    place(bar, 0)
    scroll(sc, 80)
    await act(async () => {
      fireEvent.scroll(sc)
      await frame()
    })
    expect(bar.getAttribute('data-stuck')).toBe('1')
  })
})

/**
 * The stylesheet half. Ops builds against the same package and opens no list
 * scope, so every rule this release adds must sit behind an attribute nobody
 * writes by accident; a variable the grammar introduces must carry a fallback.
 */
describe('the 0.10.0 patterns layer', () => {
  const file = 'node_modules/@bifrost/ui/dist/styles/patterns.css'
  const css = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    sel: m[1].trim(),
    body: m[2],
  }))

  /** Selector list → selectors, splitting only on top-level commas (not inside :is()). */
  const selectors = (list: string) => {
    const out: string[] = []
    let depth = 0
    let cur = ''
    for (const ch of list) {
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (ch === ',' && depth === 0) {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    return [...out, cur.trim()]
  }

  it('keeps the list grammar inside [data-sr-list]', () => {
    if (!css) return
    // The §17.2 standard (0.4.17) — data-sr-table, data-sr-hscroll, column types — is unchanged.
    const standard = /^\[data-sr-(table|hscroll)\]|^(td|th)?\[data-sr-col/
    const outside = rules
      .flatMap((r) => selectors(r.sel).map((sel) => ({ sel, body: r.body })))
      .filter((r) => /(^|[\s>(])(table|thead|tbody|tr|td|th)\b|data-sr-row|data-sx|--sr-/.test(r.sel + r.body))
      .filter((r) => !standard.test(r.sel) && !r.sel.startsWith('[data-sr-list]'))
      .map((r) => r.sel)
    expect(outside).toEqual([])
  })

  it('neutralises DenseTableRow hover on footer rows (a total reads by weight alone)', () => {
    if (!css) return
    const sels = rules.flatMap((r) => selectors(r.sel).map((sel) => ({ sel, body: r.body })))
    const rowHover = sels.find((r) => r.sel === '[data-sr-list] table > tfoot > tr:hover')
    expect(rowHover?.body).toMatch(/background:\s*transparent/)
    expect(sels.find((r) => r.sel === '[data-sr-list] table > tfoot > tr')?.body).toMatch(/background:\s*transparent/)
    const cells = sels.find((r) => r.sel === '[data-sr-list] table > tfoot > tr > :is(td, th)')
    expect(cells?.body).toMatch(/border-bottom-color:\s*transparent/)
    // The row's own hover class is still written; the scope rule is what clears it.
    const { container } = render(
      <DenseDataTable variant="list">
        <tfoot>
          <DenseTableRow>
            <DenseTableCell>Total</DenseTableCell>
          </DenseTableRow>
        </tfoot>
      </DenseDataTable>,
    )
    expect(container.querySelector('[data-sr-list] table > tfoot > tr')).not.toBeNull()
  })

  it('gives every --sr-* reference a fallback', () => {
    if (!css) return
    expect(css.match(/var\(--sr-[a-z-]+\)/g) ?? []).toEqual([])
  })

  it('clears a measured sticky toolbar at rest, and fades its band over the last 8px only', () => {
    if (!css) return
    const base = rules.find((r) => r.sel === '[data-sr-toolbar][data-sticky]')!
    // Unmeasured (nothing has marked it yet): keeps a band, with the corrected geometry.
    expect(base.body).toMatch(/calc\(100% - 8px\)/)
    expect(base.body).not.toMatch(/margin-bottom/)
    expect(base.body).not.toMatch(/60%|70%/)
    const rest = rules.find((r) => r.sel === "[data-sr-toolbar][data-sticky][data-stuck='0']")!
    expect(rest.body).toMatch(/background:\s*transparent/)
    expect(rules.some((r) => r.sel === "[data-sr-edge][data-stuck='1']")).toBe(true)
    expect(rules.some((r) => r.sel === "[data-sr-edge='fade'][data-stuck='1']")).toBe(true)
  })

  it('steps the hero reading 30 / 26 / 24 with its row', () => {
    if (!css) return
    expect(css).toMatch(/@container \(max-width: 1400px\)\s*\{\s*\[data-sr-kpi='hero'\] \[data-sr-kpi-v\]\s*\{\s*font-size: 26px/)
    expect(css).toMatch(/@container \(max-width: 860px\)\s*\{\s*\[data-sr-kpi='hero'\] \[data-sr-kpi-v\]\s*\{\s*font-size: 24px/)
  })
})
