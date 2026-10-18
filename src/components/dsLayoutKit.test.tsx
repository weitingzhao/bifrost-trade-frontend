/**
 * The layout layer as this app receives it (@bifrost/ui 0.15.0 → 0.15.1, design
 * Rev .174 A–C · Rev .175, DESIGN_CONTRACTS §18). Since D2 the app runs on it
 * (`layout/LayoutHost`), so this pins what it relies on: the class boundaries, `dock` measured on `main`, the input axis,
 * the three places of a detail, the sheet's grip, the band's per-class memory —
 * and that without a `LayoutProvider` every DS component behaves as in 0.14.0.
 */
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  BottomSheet,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableRow,
  DetailPane,
  Dialog,
  DialogContent,
  DialogTitle,
  LAYOUT_EVENT,
  LayoutProvider,
  SHEET_DRAG_DOWN_PX,
  SHEET_DRAG_UP_PX,
  SectionBand,
  ShellNavSidebar,
  SidebarProvider,
  TooltipProvider,
  dockOf,
  docksAt,
  heightTier,
  sheetRelease,
  useLayout,
  widthTier,
  type ShellNavGroup,
} from '@bifrost/ui'
import { memoryStorage } from '@/test/memoryStorage'

// ── jsdom has no layout, no ResizeObserver and no matchMedia ─────────────

let mainWidth = 0
const observers = new Set<() => void>()

class FakeResizeObserver {
  private readonly cb: () => void
  constructor(cb: () => void) {
    this.cb = cb
  }
  observe() {
    observers.add(this.cb)
  }
  unobserve() {
    observers.delete(this.cb)
  }
  disconnect() {
    observers.delete(this.cb)
  }
}

function setViewport(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: h })
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

/** `main` changes width (the sidebar opened, a column docked): the observer fires. */
function setMain(w: number) {
  mainWidth = w
  act(() => {
    for (const cb of [...observers]) cb()
  })
}

const html = () => document.documentElement

beforeEach(() => {
  mainWidth = 0
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  vi.stubGlobal(
    'matchMedia',
    vi.fn((q: string) => ({
      matches: /max-width:\s*767px/.test(q) ? window.innerWidth < 768 : false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  )
  // `main` is the only box with a width; a scroller inside it is narrower.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.tagName === 'MAIN') return mainWidth
    if (this.hasAttribute('data-scroller')) return 700
    return 0
  })
  // Node's own (file-less) storage shadows jsdom's: give both names a working one.
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    const store = memoryStorage()
    vi.stubGlobal(name, store)
    if (window[name] !== store) Object.defineProperty(window, name, { configurable: true, value: store })
  }
  document.cookie = 'sidebar_state=; max-age=0; path=/'
  setViewport(1600, 1000)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function Probe() {
  const l = useLayout()
  return <output data-testid="layout">{`${l.w} ${l.h} ${l.input} ${l.keys ? 'keys' : '-'} ${l.dock ? 'dock' : '-'}`}</output>
}

const probe = () => screen.getByTestId('layout').textContent

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <LayoutProvider>
      <main>
        <div data-scroller="">{children}</div>
      </main>
      <Probe />
    </LayoutProvider>
  )
}

// ── A1: the axes ───────────────────────────────────────────────────────

describe('layout classes', () => {
  it('cuts width at 600 / 1024 / 1440 and height at 900', () => {
    expect([599, 600, 1023, 1024, 1439, 1440].map(widthTier)).toEqual([
      'compact',
      'medium',
      'medium',
      'expanded',
      'expanded',
      'wide',
    ])
    expect([899, 900].map(heightTier)).toEqual(['short', 'tall'])
    expect([dockOf('wide', 1199), dockOf('wide', 1200), dockOf('expanded', 1400)]).toEqual([false, true, false])
  })

  it('writes the classes on <html> at each boundary and announces a crossing', () => {
    const seen: string[] = []
    const on = (e: Event) => seen.push((e as CustomEvent<{ w: string }>).detail.w)
    window.addEventListener(LAYOUT_EVENT, on)
    render(<Shell />)
    const cases: Array<[number, number, string, string]> = [
      [599, 899, 'compact', 'short'],
      [600, 900, 'medium', 'tall'],
      [1023, 900, 'medium', 'tall'],
      [1024, 900, 'expanded', 'tall'],
      [1439, 899, 'expanded', 'short'],
      [1440, 899, 'wide', 'short'],
    ]
    for (const [w, h, wc, hc] of cases) {
      setViewport(w, h)
      expect(html().getAttribute('data-w')).toBe(wc)
      expect(html().getAttribute('data-h')).toBe(hc)
      expect(probe()?.startsWith(`${wc} ${hc}`)).toBe(true)
    }
    window.removeEventListener(LAYOUT_EVENT, on)
    expect(seen).toEqual(['compact', 'medium', 'expanded', 'expanded', 'wide'])
  })

  it('docks on the width of main, not of the scroller inside it', () => {
    setViewport(1600, 1000)
    mainWidth = 1300
    render(<Shell />)
    // The scroller is 700 wide: measuring it would never dock.
    expect(probe()).toBe('wide tall pointer - dock')
    expect(html().getAttribute('data-dock')).toBe('1')
    setMain(1100)
    expect(probe()).toBe('wide tall pointer - -')
    expect(html().hasAttribute('data-dock')).toBe(false)
    setMain(1200)
    expect(probe()?.endsWith('dock')).toBe(true)
    // Wide only: a 1300 main on an expanded window does not dock.
    setViewport(1400, 1000)
    expect(probe()).toBe('expanded tall pointer - -')
  })

  it('follows the last pointerType, and a key outside a text field', () => {
    const { container } = render(
      <Shell>
        <input aria-label="Search" />
      </Shell>,
    )
    expect(html().getAttribute('data-input')).toBe('pointer')
    fireEvent.pointerDown(document.body, { pointerType: 'touch' })
    expect(html().getAttribute('data-input')).toBe('touch')
    fireEvent.pointerDown(document.body, { pointerType: 'pen' })
    expect(html().getAttribute('data-input')).toBe('pointer')
    fireEvent.pointerDown(document.body, { pointerType: 'touch' })
    // A trackpad hovering (no button down) is a pointer again.
    fireEvent.pointerMove(document.body, { pointerType: 'mouse', buttons: 0 })
    expect(html().getAttribute('data-input')).toBe('pointer')

    fireEvent.keyDown(container.querySelector('input')!, { key: 'j' })
    expect(html().hasAttribute('data-keys')).toBe(false)
    fireEvent.keyDown(document.body, { key: 'j' })
    expect(html().getAttribute('data-keys')).toBe('1')
    expect(probe()).toContain('keys')
  })

  it('takes ?layout= as a preview of the width class, and leaves <html> clean on unmount', () => {
    window.history.replaceState(null, '', '/?layout=compact')
    const { unmount } = render(<Shell />)
    expect(html().getAttribute('data-w')).toBe('compact')
    unmount()
    expect(html().hasAttribute('data-w')).toBe(false)
    window.history.replaceState(null, '', '/?layout=auto')
    render(<Shell />)
    expect(html().getAttribute('data-w')).toBe('wide')
    window.history.replaceState(null, '', '/')
  })
})

// ── No provider: 0.14.0 behaviour ─────────────────────────────────────

const NAV: ShellNavGroup[] = [{ label: 'Portfolio', items: [{ id: 'positions', label: 'Positions', to: '/portfolio/positions' }] }]

function Nav() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <ShellNavSidebar productName="Bifrost" navGroups={NAV} activeId="positions" onSelect={() => {}} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

const sidebar = () => document.querySelector('[data-slot="sidebar"]')

describe('without a LayoutProvider nothing changes', () => {
  it('Dialog keeps its placement on a narrow window', () => {
    setViewport(400, 800)
    render(
      <Dialog open>
        <DialogContent size="md" aria-describedby={undefined}>
          <DialogTitle>Edit</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('data-presentation')).toBe('centered')
    expect(dialog.hasAttribute('data-place')).toBe(false)
    expect(dialog.querySelector('[data-sheet-grip]')).toBeNull()
  })

  it('SectionBand ignores foldAt and remembers under the page alone', () => {
    setViewport(400, 800)
    render(
      <div>
        <SectionBand id="book" title="Book" foldAt={['compact']} persistKey="/p" />
        <div>body</div>
      </div>,
    )
    const band = screen.getByRole('button', { name: /Book/ })
    expect(band.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(band)
    expect(JSON.parse(localStorage.getItem('bifrost.band') ?? '{}')).toEqual({ '/p': { book: 0 } })
  })

  it('Sidebar is the drawer under 768 and the open column above it, writing the cookie', () => {
    setViewport(700, 900)
    const { unmount } = render(<Nav />)
    // Under 768 the sidebar is the (closed) drawer: no column, no rail.
    expect(sidebar()).toBeNull()
    unmount()
    setViewport(1200, 900)
    render(<Nav />)
    expect(sidebar()?.getAttribute('data-state')).toBe('expanded')
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    expect(sidebar()?.getAttribute('data-state')).toBe('collapsed')
    expect(document.cookie).toContain('sidebar_state=false')
    expect(localStorage.length).toBe(0)
  })
})

// ── Under the provider ────────────────────────────────────────────────

describe('Dialog on compact', () => {
  it('lands as a bottom sheet with the grip; md / lg open full', () => {
    setViewport(400, 800)
    render(
      <LayoutProvider>
        <Dialog open>
          <DialogContent size="md" aria-describedby={undefined}>
            <DialogTitle>Edit</DialogTitle>
          </DialogContent>
        </Dialog>
      </LayoutProvider>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('data-place')).toBe('bottom')
    expect(dialog.getAttribute('data-sr-bsheet')).toBe('edit')
    expect(dialog.getAttribute('data-sr-detent')).toBe('full')
    expect(dialog.querySelector('[data-sheet-grip]')).not.toBeNull()
  })
})

describe('ShellNavSidebar by class', () => {
  it('is gone on compact, an icon rail on medium (600–767 included), and remembers medium apart', () => {
    setViewport(400, 900)
    render(
      <LayoutProvider>
        <Nav />
      </LayoutProvider>,
    )
    expect(sidebar()).toBeNull()
    setViewport(700, 900)
    // Not the < 768 drawer: medium is the rail.
    expect(sidebar()?.getAttribute('data-state')).toBe('collapsed')
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    expect(sidebar()?.getAttribute('data-state')).toBe('expanded')
    expect(localStorage.getItem('sidebar_state@medium')).toBe('true')
    expect(document.cookie).not.toContain('sidebar_state=')
    // expanded has its own memory: the rail again.
    setViewport(1100, 900)
    expect(sidebar()?.getAttribute('data-state')).toBe('collapsed')
    setViewport(800, 900)
    expect(sidebar()?.getAttribute('data-state')).toBe('expanded')
  })
})

describe('BottomSheet grip', () => {
  it('reads its thresholds: up past 48 goes full, down past 72 drops a detent or closes', () => {
    expect([SHEET_DRAG_UP_PX, SHEET_DRAG_DOWN_PX]).toEqual([48, 72])
    expect(sheetRelease(2, false)).toBe('toggle')
    expect(sheetRelease(-48, false)).toBe('stay')
    expect(sheetRelease(-49, false)).toBe('full')
    expect(sheetRelease(72, true)).toBe('stay')
    expect(sheetRelease(73, true)).toBe('half')
    expect(sheetRelease(73, false)).toBe('close')
  })

  it('pins to the bottom on compact and drags between detents; a form sheet elsewhere', () => {
    setViewport(400, 800)
    const onOpenChange = vi.fn()
    render(
      <LayoutProvider>
        <BottomSheet open onOpenChange={onOpenChange} title="Row" actions={[{ label: 'Open', primary: true }]}>
          body
        </BottomSheet>
      </LayoutProvider>,
    )
    const sheet = document.querySelector('[data-slot="bottom-sheet"]')!
    const grip = sheet.querySelector('[data-sheet-grip]')!
    expect(sheet.getAttribute('data-place')).toBe('bottom')
    expect(sheet.hasAttribute('data-sr-detent')).toBe(false)
    fireEvent.pointerDown(grip, { button: 0, clientY: 500 })
    fireEvent.pointerMove(grip, { clientY: 440 })
    fireEvent.pointerUp(grip, { clientY: 440 })
    expect(sheet.getAttribute('data-sr-detent')).toBe('full')
    fireEvent.pointerDown(grip, { button: 0, clientY: 200 })
    fireEvent.pointerMove(grip, { clientY: 280 })
    fireEvent.pointerUp(grip, { clientY: 280 })
    expect(sheet.hasAttribute('data-sr-detent')).toBe(false)
    fireEvent.pointerDown(grip, { button: 0, clientY: 500 })
    fireEvent.pointerMove(grip, { clientY: 580 })
    fireEvent.pointerUp(grip, { clientY: 580 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    setViewport(1200, 900)
    expect(sheet.getAttribute('data-place')).toBe('form')
    expect(sheet.querySelector('[data-sheet-grip]')).toBeNull()
  })
})

let mounts = 0
function Detail() {
  const [text, setText] = useState('')
  useEffect(() => {
    mounts += 1
  }, [])
  return <input aria-label="Note" value={text} onChange={(e) => setText(e.target.value)} />
}

describe('DetailPane', () => {
  it('docks, floats, then sheets — without unmounting its content', () => {
    mounts = 0
    mainWidth = 1300
    render(
      <Shell>
        <DetailPane open onClose={() => {}} title="Contract">
          <Detail />
        </DetailPane>
      </Shell>,
    )
    const pane = document.querySelector('[data-slot="detail-pane"]')!
    const note = () => screen.getByLabelText('Note') as HTMLInputElement
    expect(pane.getAttribute('data-place')).toBe('dock')
    expect(pane.contains(note())).toBe(true)
    fireEvent.change(note(), { target: { value: 'roll in May' } })

    setMain(1100)
    expect(pane.getAttribute('data-place')).toBe('overlay')
    expect(pane.contains(note())).toBe(true)

    setViewport(500, 800)
    expect(pane.getAttribute('data-place')).toBe('sheet')
    expect(pane.hasAttribute('hidden')).toBe(true)
    const slot = document.querySelector('[data-slot="bottom-sheet"] [data-slot="detail-pane-slot"]')!
    expect(slot.contains(note())).toBe(true)

    setViewport(1600, 1000)
    setMain(1300)
    expect(pane.getAttribute('data-place')).toBe('dock')
    expect(pane.contains(note())).toBe(true)
    expect(note().value).toBe('roll in May')
    expect(mounts).toBe(1)
  })

  it('floats with no provider', () => {
    render(
      <DetailPane open onClose={() => {}}>
        <span>detail</span>
      </DetailPane>,
    )
    expect(document.querySelector('[data-slot="detail-pane"]')?.getAttribute('data-place')).toBe('overlay')
  })
})

describe('SectionBand foldAt', () => {
  it('folds by default where listed and remembers compact and short apart from the desk', () => {
    setViewport(500, 800)
    render(
      <LayoutProvider>
        <div>
          <SectionBand id="book" title="Book" foldAt={['compact']} persistKey="/p" />
          <div>body</div>
        </div>
      </LayoutProvider>,
    )
    const band = () => screen.getByRole('button', { name: /Book/ })
    expect(band().getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(band())
    expect(JSON.parse(localStorage.getItem('bifrost.band') ?? '{}')).toEqual({ '/p@compact': { book: 1 } })

    // short, not listed: open by default, remembered under its own key.
    setViewport(1600, 800)
    expect(band().getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(band())
    expect(JSON.parse(localStorage.getItem('bifrost.band') ?? '{}')['/p@short']).toEqual({ book: 0 })

    // The desk keeps neither.
    setViewport(1600, 1000)
    expect(band().getAttribute('aria-expanded')).toBe('true')
    setViewport(500, 800)
    expect(band().getAttribute('aria-expanded')).toBe('true')
  })
})

describe('DenseDataTable compactKeep', () => {
  function Table() {
    return (
      <DenseDataTable compactKeep={[1, 3]}>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Qty</th>
            <th>P&amp;L</th>
          </tr>
        </thead>
        <DenseTableBody>
          <DenseTableRow>
            <DenseTableCell>AMD</DenseTableCell>
            <DenseTableCell>6</DenseTableCell>
            <DenseTableCell>+120</DenseTableCell>
          </DenseTableRow>
        </DenseTableBody>
      </DenseDataTable>
    )
  }

  it('keeps the listed columns on compact and opens the row in a sheet', () => {
    setViewport(400, 800)
    render(
      <LayoutProvider>
        <Table />
      </LayoutProvider>,
    )
    expect(document.querySelector('[data-slot="dense-table-frame"]')?.getAttribute('data-sr-keep')).toBe('1,3')
    expect(document.getElementById('bifrost-keep-css')?.textContent).toContain('[data-sr-keep="1,3"]')
    fireEvent.click(screen.getByText('6'))
    const sheet = document.querySelector('[data-slot="bottom-sheet"]')!
    expect(sheet.textContent).toContain('Qty')
    expect(sheet.textContent).toContain('+120')
  })

  it('is ignored with no provider', () => {
    setViewport(400, 800)
    render(<Table />)
    expect(document.querySelector('[data-slot="dense-table-frame"]')?.hasAttribute('data-sr-keep')).toBe(false)
    fireEvent.click(screen.getByText('6'))
    expect(document.querySelector('[data-slot="bottom-sheet"]')).toBeNull()
  })
})

// ── 0.15.1 (Rev .175) ──────────────────────────────────────────────────

describe('DetailPane docks by its own width (§18.12 general form)', () => {
  it('a 440 column docks from 1200 of main; a 560 one needs 1320', () => {
    expect(docksAt('wide', 1200, 440)).toBe(true)
    expect(docksAt('wide', 1199, 440)).toBe(false)
    expect(docksAt('wide', 1319, 560)).toBe(false)
    expect(docksAt('wide', 1320, 560)).toBe(true)
    expect(docksAt('expanded', 2000, 440)).toBe(false)

    mainWidth = 1250
    render(
      <Shell>
        <DetailPane open onClose={() => {}} width={560}>
          <span>inspector</span>
        </DetailPane>
      </Shell>,
    )
    const pane = document.querySelector('[data-slot="detail-pane"]')!
    // The layout docks a 440 here (1250 ≥ 1200), but not this 560.
    expect(probe()).toContain('dock')
    expect(pane.getAttribute('data-place')).toBe('overlay')
    setMain(1320)
    expect(pane.getAttribute('data-place')).toBe('dock')
  })
})

describe('the row detail (0.15.1)', () => {
  function LampTable({ rowLink = false }: { rowLink?: boolean }) {
    return (
      <DenseDataTable compactKeep={[1, 2]}>
        <thead>
          <tr>
            <th aria-label="State" />
            <th>Source</th>
            <th>Age</th>
          </tr>
        </thead>
        <DenseTableBody>
          <DenseTableRow role={rowLink ? 'button' : undefined} onClick={rowLink ? () => {} : undefined}>
            <DenseTableCell>
              <span data-lamp="" />
            </DenseTableCell>
            <DenseTableCell>Positions</DenseTableCell>
            <DenseTableCell>2m</DenseTableCell>
          </DenseTableRow>
        </DenseTableBody>
      </DenseDataTable>
    )
  }

  it('titles a row whose first cell has no words with that cell and the first with words', () => {
    setViewport(400, 800)
    render(
      <LayoutProvider>
        <LampTable />
      </LayoutProvider>,
    )
    fireEvent.click(screen.getByText('2m'))
    const sheet = document.querySelector('[data-slot="bottom-sheet"]')!
    const title = sheet.querySelector('[data-slot="row-detail-title"]')!
    expect(title.textContent).toBe('Positions')
    // The title's cell is not repeated as a line.
    expect([...sheet.querySelectorAll('[data-slot="row-detail-line"] dt')].map((d) => d.textContent)).toEqual(['Age'])
  })

  it('opens the sheet for a row that is itself a button, rather than skipping it', () => {
    setViewport(400, 800)
    render(
      <LayoutProvider>
        <LampTable rowLink />
      </LayoutProvider>,
    )
    fireEvent.click(screen.getByText('2m'))
    expect(document.querySelector('[data-slot="bottom-sheet"]')).not.toBeNull()
  })
})

describe('SectionBand (0.15.1)', () => {
  it('marks its meta so compact can drop it under the title, and lets the title wrap', () => {
    render(<SectionBand id="trust" title="Where it came from" meta="ASOF 2026-10-17" persistKey="/p" />)
    const meta = document.querySelector('[data-sr-band-meta]')!
    expect(meta.textContent).toBe('ASOF 2026-10-17')
    expect(meta.className).toContain('truncate')
    expect(screen.getByRole('heading', { name: 'Where it came from' }).className).not.toContain('whitespace-nowrap')
  })
})
