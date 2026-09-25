/**
 * The Symbol list — resident on every page (design `_Part SymbolDock.dc.html`,
 * Rev .56–.58; Shell Frame Options 1b–1f).
 *
 * Three modes, one body: **strip** (56px — ticker · last · change, a
 * long-lived mode with its own sort), **docked** (a 300px column) and
 * **float** (over the page, the right edge left empty). `dockModel.ts` holds
 * the arrangement; this holds what a click does and how a row is drawn.
 *
 * A row loads its name. On a page that reads `?symbol=` it swaps the symbol
 * in place; elsewhere, until the Symbol panel lands (frame batch F3), it
 * opens Research › Symbol — the design opens the panel beside the page there.
 * A contract row loads its underlying for the same reason: Strikes and Payoff
 * are the panel's.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type RefObject } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, PanelRight, PictureInPicture2, Plus, X } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'
import { stockWatchlistContractKey } from '@/components/research/watchlistContractKey'
import { useWatchlistMutations } from '@/hooks/useStockWatchlist'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { glyph } from '@/lib/design/glyphs'
import { readStoredContext, useSymbolContext, writeStoredContext } from '@/lib/symbolContext'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'
import { routeFor } from '@/layout/routeRegistry'
import { dockActions, useDockState, type ListKey } from './dockState'
import {
  SORTS,
  buildGroups,
  defaultSel,
  fmtChg,
  fmtChg1,
  fmtChgStrip,
  fmtLast,
  fmtLastStrip,
  posLine,
  toggleSel,
  walkOrder,
  type DockGroup,
  type DockRow,
  type ThirdTone,
} from './dockModel'
import { useDockLists } from './useDockLists'
import { useDockQuotes, type DockQuote } from './useDockQuotes'
import css from './symbolDock.module.css'

const LIST_GLYPH = glyph('symlist')

const SHORT: Record<ListKey, string> = { source: 'SRC', watch: 'WL', port: 'PF', obj: 'OBJ', recent: 'REC', alerts: 'ALR' }

const THIRD_INK: Record<ThirdTone, string> = {
  plain: 'var(--foreground)',
  mute: 'var(--sk-mute2)',
  unrl: 'var(--color-unrealized)',
  waiting: 'var(--color-lamp-yellow)',
}

/** A move that prints as 0.00% is not coloured as one. */
function dirInk(p: number | null): string {
  return p == null || Math.abs(p) < 0.005 ? 'var(--muted-foreground)' : p > 0 ? 'var(--color-profit)' : 'var(--color-loss)'
}

type Flash = Record<string, 'up' | 'dn'>

/** Which names are on screen — the only ones the quote snapshot asks for. */
function useVisibleSymbols(scrollRef: RefObject<HTMLDivElement | null>, layoutKey: string): string[] {
  const [visible, setVisible] = useState<string[]>([])
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const top = el.scrollTop
        const bottom = top + el.clientHeight
        const out = new Set<string>()
        for (const r of el.querySelectorAll<HTMLElement>('[data-dock-sym]')) {
          if (r.offsetTop + r.offsetHeight >= top && r.offsetTop <= bottom) out.add(r.dataset.dockSym ?? '')
        }
        out.delete('')
        const next = [...out].sort()
        setVisible((prev) => (prev.join(',') === next.join(',') ? prev : next))
      })
    }
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [scrollRef, layoutKey])
  return visible
}

/** A tick flashes the last price for 450ms, then fades — unless motion is reduced. */
function useTickFlash(visible: readonly string[], quoteOf: (sym: string) => DockQuote): Flash {
  const prev = useRef(new Map<string, number>())
  const clear = useRef(0)
  const [flash, setFlash] = useState<Flash>({})
  useEffect(() => {
    const next: Flash = {}
    for (const sym of visible) {
      const last = quoteOf(sym).last
      const was = prev.current.get(sym)
      if (last != null && was != null && last !== was) next[sym] = last > was ? 'up' : 'dn'
      if (last != null) prev.current.set(sym, last)
    }
    if (Object.keys(next).length === 0) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const frame = requestAnimationFrame(() => {
      setFlash(next)
      window.clearTimeout(clear.current)
      clear.current = window.setTimeout(() => setFlash({}), 450)
    })
    return () => cancelAnimationFrame(frame)
  }, [visible, quoteOf])
  useEffect(() => () => window.clearTimeout(clear.current), [])
  return flash
}

export function SymbolDock({
  mode,
  narrowedBy = null,
}: {
  mode: 'strip' | 'docked' | 'float'
  /** Docked by choice, drawn as a strip: why. */
  narrowedBy?: 'panel' | 'room' | null
}) {
  const st = useDockState()
  const { lists, todayEt } = useDockLists(st.sel == null || st.sel.includes('watch'))
  const shown = st.sel ?? defaultSel(lists.source.rows.length > 0)
  const { symbol: cur, setSymbol } = useSymbolContext()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const scoped = Boolean(routeFor(pathname).symbolScope)
  const { addItem } = useWatchlistMutations()

  const allSyms = useMemo(() => shown.flatMap((k) => lists[k].rows.map((r) => r.symbol)), [shown, lists])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const layoutKey = `${mode}|${shown.join(',')}|${st.sort}|${allSyms.join(',')}|${JSON.stringify(st.folded)}`
  const visible = useVisibleSymbols(scrollRef, layoutKey)
  const quoteOf = useDockQuotes(visible, allSyms)
  const flash = useTickFlash(visible, quoteOf)

  const groups = useMemo(
    () => buildGroups({ lists, shown, sort: st.sort, chgOf: (s) => quoteOf(s).chgPct, todayEt }),
    [lists, shown, st.sort, quoteOf, todayEt],
  )
  const walk = useMemo(() => walkOrder(groups), [groups])
  const sm = Math.min(Math.max(1, st.sort), SORTS.length)
  const sort = SORTS[sm - 1]

  const pick = useCallback(
    (sym: string) => {
      if (scoped) {
        setSymbol(sym)
        return
      }
      writeStoredContext(sym, readStoredContext().date ?? '')
      navigate(withSymbolParam(SYMBOL_PATH, sym))
    },
    [scoped, setSymbol, navigate],
  )
  const loadTip = (sym: string, rest: string) => `${scoped ? `Load ${sym} here` : `Open ${sym} on Research › Symbol`}${rest}`

  const cycleSort = () => dockActions.setSort((sm % SORTS.length) + 1)
  const cycleSortBack = (e: MouseEvent) => {
    e.preventDefault()
    dockActions.setSort(sm === 1 ? SORTS.length : sm - 1)
  }
  const sortTitle =
    'Arrange — click for the next, right-click for the previous. By list keeps each list whole; the others merge them into one row per name.'

  if (mode === 'strip') {
    const listShort = shown.length > 1 ? `${shown.length} lists` : SHORT[shown[0]]
    return (
      <aside aria-label="Symbol lists (collapsed)" className={cn(css.aside, css.edge)}>
        <button
          type="button"
          className={css.stripHead}
          // Too narrow to dock: expanding means floating, the one full list
          // that fits. Behind a panel it stays a strip, as the design has it.
          onClick={() => dockActions.setMode(narrowedBy === 'room' ? 'float' : 'docked')}
          title={
            narrowedBy === 'panel'
              ? 'Narrowed to a strip while the side panel is open — close the panel for the full list'
              : narrowedBy === 'room'
                ? 'Narrowed to a strip: the page keeps its 560 at this width — click to float the full list over it'
                : `${shown.map((k) => lists[k].title).join(' + ')} — expand`
          }
          aria-label="Expand symbol lists"
        >
          <LIST_GLYPH className="size-3.5" aria-hidden />
          {listShort}
        </button>
        <button
          type="button"
          className={cn(css.stripSort, sort.accent)}
          onClick={cycleSort}
          onContextMenu={cycleSortBack}
          title={`${sort.name} ${sort.order} — ${sortTitle}`}
          aria-label="Arrange symbol lists"
        >
          ⇅ {sort.short}
        </button>
        <div ref={scrollRef} className={cn(css.scroll, css.stripScroll)} style={{ position: 'relative' }}>
          {groups.map((g, gi) => (
            <div key={g.key} role="group" aria-label={g.title}>
              {gi > 0 ? <div className={css.sep} title={g.title} /> : null}
              {g.rows.map((r) => {
                const q = quoteOf(r.sym)
                return (
                  <button
                    key={r.key}
                    type="button"
                    data-dock-sym={r.sym}
                    className={cn(css.stripRow, css.mono, r.sym === cur && css.cur)}
                    onClick={() => pick(r.sym)}
                    title={loadTip(r.sym, ` · ${g.title}${r.note ? ` · ${r.note}` : ''}`)}
                  >
                    <span className={css.stripSym}>
                      {r.sym.length > 4 ? r.sym.slice(0, 4) : r.sym}
                      {r.contracts.length > 0 ? <span className={css.stripN}>·{r.contracts.length}</span> : null}
                    </span>
                    <span className={cn(css.stripLine, css.flash, flash[r.sym] && css[flash[r.sym]])}>{fmtLastStrip(q.last)}</span>
                    <span className={css.stripLine} style={{ color: dirInk(q.chgPct) }}>
                      {fmtChgStrip(q.chgPct)}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </aside>
    )
  }

  const isFloat = mode === 'float'
  const canAdd = Boolean(cur) && !lists.watch.loading && !lists.watch.rows.some((r) => r.symbol === cur)

  return (
    <aside aria-label="Symbol lists" className={cn(css.aside, isFloat ? css.float : css.edge)}>
      {/* Lists as tags (Owner 2026-09-25): a click toggles one; several on
          stack as groups, each with its own third-column head, so the row
          grammar never has to average two meanings. ⌥-click = only this. */}
      <header className={css.head}>
        <div role="group" aria-label="Lists shown" className={css.tags}>
          {(['source', 'watch', 'port', 'obj', 'recent', 'alerts'] as const).map((k) => {
            const on = shown.includes(k)
            const L = lists[k]
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                className={cn(css.tag, on && css.tagOn)}
                title={`${L.title} — ${L.sub} · click toggles · ⌥-click shows only this`}
                onClick={(e) => {
                  const next = toggleSel(shown, k, e.altKey)
                  if (next) dockActions.setSel(next)
                }}
              >
                {L.tag}
                <span className={css.tagN}>{L.loading ? '…' : L.rows.length}</span>
              </button>
            )
          })}
        </div>
        <span className={css.ctl}>
          {canAdd ? (
            <IconActionButton
              className="h-[22px] w-[22px]"
              title={`Add ${cur} to the watchlist`}
              ariaLabel={`Add ${cur} to the watchlist`}
              disabled={addItem.isPending}
              onClick={() =>
                addItem.mutate({ contract_key: stockWatchlistContractKey(cur), symbol: cur, sec_type: 'STK', source: 'symbol_dock' })
              }
            >
              <Plus className="size-3.5" />
            </IconActionButton>
          ) : null}
          <IconActionButton
            className="h-[22px] w-[22px]"
            title={isFloat ? 'Dock at the right edge' : 'Float over the page'}
            ariaLabel={isFloat ? 'Dock symbol lists' : 'Float symbol lists'}
            onClick={() => dockActions.setMode(isFloat ? 'docked' : 'float')}
          >
            {isFloat ? <PanelRight className="size-3.5" /> : <PictureInPicture2 className="size-3.5" />}
          </IconActionButton>
          <IconActionButton
            className="h-[22px] w-[22px]"
            title={isFloat ? 'Close' : 'Collapse to a strip'}
            ariaLabel={isFloat ? 'Close symbol lists' : 'Collapse symbol lists to a strip'}
            onClick={() => (isFloat ? dockActions.setHidden(true) : dockActions.setMode('strip'))}
          >
            {isFloat ? <X className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </IconActionButton>
        </span>
      </header>
      {/* Tags pick which lists; this line cycles how they are laid out
          (Owner 2026-09-25, after Market Live's TWS-style Symbol sort). */}
      <button type="button" className={css.sortLine} onClick={cycleSort} onContextMenu={cycleSortBack} title={sortTitle}>
        <span className="whitespace-nowrap">Sort</span>
        <span className={cn('font-semibold whitespace-nowrap', sort.accent)}>{sort.name}</span>
        <span className={css.ellipsis}>{sort.order}</span>
        <span className={cn(css.mono, 'ml-auto whitespace-nowrap')}>
          {sm} / {SORTS.length} ⇅
        </span>
      </button>
      <div ref={scrollRef} className={css.scroll} style={{ position: 'relative' }}>
        {groups.map((g, gi) => (
          <Group key={g.key} g={g} first={gi === 0} cur={cur} quoteOf={quoteOf} flash={flash} pick={pick} loadTip={loadTip} />
        ))}
      </div>
      <footer className={css.foot}>
        <span className={css.mono}>{posLine(walk, cur)}</span>
        <span className="ml-auto">tags pick · Sort arranges</span>
      </footer>
    </aside>
  )
}

function Group({
  g,
  first,
  cur,
  quoteOf,
  flash,
  pick,
  loadTip,
}: {
  g: DockGroup
  first: boolean
  cur: string
  quoteOf: (sym: string) => DockQuote
  flash: Flash
  pick: (sym: string) => void
  loadTip: (sym: string, rest: string) => string
}) {
  const { folded } = useDockState()
  const open = !folded[g.key]
  return (
    <div role="group" aria-label={g.title}>
      <button
        type="button"
        className={cn(css.grid, css.groupHead)}
        onClick={() => dockActions.toggleFold(g.key)}
        aria-expanded={open}
        title={g.sub}
      >
        <span className="flex min-w-0 items-center gap-[5px]">
          <span className={css.caret}>{open ? '▾' : '▸'}</span>
          <span className="text-[var(--sk-soft)]">{g.title}</span>
          <span className="font-mono font-normal tracking-normal">{g.loading ? '…' : g.rows.length}</span>
        </span>
        <span className={css.right}>{first ? 'Last' : ''}</span>
        <span className={css.right}>{first ? 'Chg' : ''}</span>
        <span className={css.right}>{g.head}</span>
      </button>
      {open && g.rows.length === 0 ? <div className={css.empty}>{g.loading ? 'Loading…' : g.empty}</div> : null}
      {open ? g.rows.map((r) => <Row key={r.key} r={r} cur={cur} q={quoteOf(r.sym)} fl={flash[r.sym]} pick={pick} tip={loadTip(r.sym, ` · ${r.tip.split(' · ').slice(1).join(' · ')}`)} />) : null}
    </div>
  )
}

function Row({
  r,
  cur,
  q,
  fl,
  pick,
  tip,
}: {
  r: DockRow
  cur: string
  q: DockQuote
  fl: 'up' | 'dn' | undefined
  pick: (sym: string) => void
  tip: string
}) {
  const { optOpen } = useDockState()
  const open = optOpen[r.optKey] ?? r.optDefaultOpen
  const toggle = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation()
    dockActions.setOptOpen(r.optKey, !open)
  }
  return (
    <>
      <button
        type="button"
        data-dock-sym={r.sym}
        className={cn(css.grid, css.row, r.sym === cur && css.cur)}
        onClick={() => pick(r.sym)}
        title={tip}
      >
        <span className={css.name}>
          <span className={css.mono14} aria-hidden>
            {r.sym.charAt(0)}
          </span>
          <span className={css.sym}>{r.sym}</span>
          {r.held ? <span className={css.held} title="held" /> : null}
          {r.mark ? <span className={css.markFlag}>{r.mark}</span> : null}
          <span className={cn(css.note, css.ellipsis)}>{r.note}</span>
          {r.contracts.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              className={css.optToggle}
              title={r.contracts.map((c) => `${c.exp} ${c.label}`).join(' · ')}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                toggle(e)
              }}
            >
              {open ? '▾' : '▸'} {r.contracts.length}c
            </span>
          ) : null}
        </span>
        <span className={cn(css.num, css.flash, fl && css[fl])} title={q.from}>
          {fmtLast(q.last)}
        </span>
        <span className={css.num} style={{ color: dirInk(q.chgPct) }}>
          {fmtChg(q.chgPct)}
        </span>
        <span className={css.num} style={{ color: THIRD_INK[r.thirdTone] }} title={r.thirdTitle}>
          {r.third}
        </span>
      </button>
      {open
        ? r.contracts.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(css.grid, css.contract)}
              onClick={() => pick(r.sym)}
              title={`${c.exp} ${c.label}${c.mark != null ? ` · Mark ${c.mark.toFixed(2)}` : ''}${c.inTitle ? ` · ${c.inTitle}` : ''} → ${r.sym}`}
            >
              <span className={css.contractName}>
                <span className="text-[var(--sk-mute)]">{c.exp}</span>
                <span className={cn(css.contractLabel, css.ellipsis)}>{c.label}</span>
              </span>
              <span className={css.num}>{c.mark != null ? c.mark.toFixed(2) : '—'}</span>
              <span className={css.num} style={{ color: dirInk(c.chgPct) }}>
                {fmtChg1(c.chgPct)}
              </span>
              <span className={css.num} style={{ color: THIRD_INK[c.thirdTone ?? 'plain'] }}>
                {c.third}
              </span>
            </button>
          ))
        : null}
    </>
  )
}
