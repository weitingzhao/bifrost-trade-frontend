/**
 * The one side panel — the shell's single companion column.
 *
 * §5a.8, seventeenth round. The Owner's words were *"侧边栏从用户心智上是一回事"*:
 * what a reader sees as "the column on the right" had four implementations
 * behind it, each with its own width, header, close gesture and rules about
 * what it could sit beside. There is one now, the shell draws it, it is 440
 * wide, and **more than one surface in it means tabs** — never a second
 * column, never a silent eviction.
 *
 * ## Tabs stay mounted
 *
 * Every tab renders; the ones behind are hidden with CSS rather than
 * unmounted. The design keeps all its iframes alive for the same reason:
 * coming back to a tab should find the scroll position, the filter and the
 * half-typed note where you left them, not a fresh page and four refetches.
 *
 * ## Push or overlay
 *
 * The shared formula, not a threshold of its own (`sidePanelPushes`): the page
 * keeps its 560px of columns (Rev .25) or the panel floats over it. There is nothing to
 * coordinate with any more — the Copilot was the other column that pushed,
 * and it is a tab in here now, so one panel is the only thing the content
 * ever gives width to.
 */
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { animatePanelIn, dismissSurface, noteOriginPoint, registerSurfaceElement } from './equipMotion'
import {
  PANEL_MAX_PX,
  PANEL_MIN_PX,
  PANEL_WIDTH_PX,
  activeTabOf,
  focusTab,
  openSurface,
  panelCardPx,
  setPanelWidth,
  stripFor,
  surfaceHue,
  surfaceLabel,
  usePanelWidth,
  useSurfaces,
  type PanelTab,
} from './equipSurface'
import { useCarriedSymbol } from '@/lib/symbolContext'
import { PlaceButtons } from './PlaceButtons'
import { SurfaceBody } from './SurfaceBody'
import { SurfaceGlyph } from './SurfaceGlyph'
import { SHELL_TOP_BAR_PX } from './shellChrome'
import { sidePanelPushes } from '@/components/layout/inspectorDock'
import css from './equipSurface.module.css'
import { keepEquipmentLinksIn } from './surfaceLinks'
import { useDockColumn } from './symbolDock/dockState'

/** The width grip's drag: the column follows the pointer, and is kept on release. */
function resizeFrom(e: ReactPointerEvent<HTMLDivElement>): void {
  if (e.button !== 0) return
  e.preventDefault()
  const grip = e.currentTarget
  grip.setPointerCapture(e.pointerId)
  grip.dataset.drag = '1'
  const sx = e.clientX
  const w0 = panelCardPx() - 16
  let w = w0
  const move = (ev: PointerEvent) => {
    w = Math.min(window.innerWidth - 120, w0 + (sx - ev.clientX))
    setPanelWidth(w, false)
  }
  const up = () => {
    grip.removeEventListener('pointermove', move)
    grip.removeEventListener('pointerup', up)
    delete grip.dataset.drag
    setPanelWidth(w)
  }
  grip.addEventListener('pointermove', move)
  grip.addEventListener('pointerup', up)
}

/**
 * A tab pulled down 36px, or out past the panel's left edge, becomes the
 * float (design Rev .70 §3) — opening from where the pointer is. The ×
 * inside the tab is a click, not a grab.
 */
function dragOut(e: ReactPointerEvent<HTMLButtonElement>, tab: PanelTab): void {
  if (e.button !== 0 || (e.target as HTMLElement).closest('[role="button"]')) return
  const sy = e.clientY
  const panelLeft = e.currentTarget.closest('aside')?.getBoundingClientRect().left ?? 0
  const move = (ev: PointerEvent) => {
    if (ev.clientY - sy > 36 || ev.clientX < panelLeft - 12) {
      off()
      noteOriginPoint(tab.key, { x: ev.clientX, y: ev.clientY })
      openSurface(tab, 'float')
    }
  }
  const off = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', off)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', off)
}

function Tab({ tab, active, compact }: { tab: PanelTab; active: boolean; compact: boolean }) {
  const full = active || !compact
  const label = surfaceLabel(tab, useCarriedSymbol())
  return (
    <button
      type="button"
      className={`${css.tab} ${full ? css.tabFull : css.tabIcon} ${active ? css.tabOn : ''}`}
      style={{ ['--rh' as string]: surfaceHue(tab), maxWidth: full && compact ? 150 : 170 }}
      title={`${label} · ${tab.to}${tab.subject === 'follow' ? ' — follows the carried symbol' : tab.subject === 'lock' ? ' — locked' : ''}`}
      aria-current={active ? 'true' : undefined}
      // The tab's own right-click menu (Rev .69 §1, ShellContextMenu).
      data-ctx-tab={tab.key}
      data-ctx-label={label}
      onClick={() => focusTab(tab.key)}
      onPointerDown={(e) => dragOut(e, tab)}
    >
      <SurfaceGlyph surface={tab} className={css.glyph} />
      {full ? (
        <>
          <span className={css.tabName}>{label}</span>
          <span
            role="button"
            tabIndex={0}
            className={css.tabClose}
            aria-label={`Close ${label}`}
            title="Close tab"
            onClick={(e) => {
              e.stopPropagation()
              dismissSurface(tab.key)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              dismissSurface(tab.key)
            }}
          >
            ×
          </span>
        </>
      ) : null}
    </button>
  )
}

export function EquipPanel() {
  const { panel } = useSurfaces()
  // The overflow menu belongs to *this* active tab: remembering which tab it
  // was opened over closes it for free when you pick another one, when the
  // panel is re-opened on something else, or when the strip stops overflowing
  // — all without an effect that fights the render it is reacting to.
  const [menuOver, setMenuOver] = useState<string | null>(null)
  const [viewport, setViewport] = useState(() => window.innerWidth)
  const card = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  const open = Boolean(panel)

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // The panel slides in from the edge when it opens — not when a tab is added
  // to one already open, which is the panel staying, not arriving.
  useLayoutEffect(() => {
    registerSurfaceElement('panel', card.current)
    if (open && !wasOpen.current && card.current) animatePanelIn(card.current)
    wasOpen.current = open
  }, [open])

  // The Symbol list's column sits right of the panel: the panel measures its
  // room without it and stands off it (`right = column + 8`).
  const dock = useDockColumn()
  const panelW = usePanelWidth()
  const active = activeTabOf(panel)
  if (!panel || !active) return null

  const strip = stripFor(panel)
  const menuOpen = menuOver === panel.active && strip.over.length > 0
  const pushes = sidePanelPushes(true, viewport - dock.width)

  return (
    <>
      {/* Takes the column out of the content rather than letting a fixed card
          sit on top of it. A sibling of the page, as the Copilot dock is. */}
      {pushes ? (
        <div className={css.spacer} style={{ width: panelW + 16 }} aria-hidden />
      ) : null}
      <aside
        ref={card}
        className={`${css.card} ${css.panel}`}
        data-glass-surface="surface"
        data-vt="panel"
        style={{
          ['--rh' as string]: surfaceHue(active),
          // Pushed, the page has already stepped aside, so the card can take
          // the full height. Overlaying, it starts below the top bar — which
          // is one fixed row here and never wraps, so there is nothing to
          // measure, unlike the design's own.
          top: pushes ? 8 : SHELL_TOP_BAR_PX + 8,
          right: dock.width + 8,
          ['--panel-w' as string]: `${panelW}px`,
        }}
        aria-label="Side panel"
      >
        {/* Rev .72 §6: drag the left edge, 360–640; a double-click puts it back at 440. */}
        <div
          className={css.widthGrip}
          role="separator"
          aria-orientation="vertical"
          aria-label="Panel width"
          aria-valuemin={PANEL_MIN_PX}
          aria-valuemax={PANEL_MAX_PX}
          aria-valuenow={panelW}
          title="Drag to resize · double-click for 440"
          onPointerDown={resizeFrom}
          onDoubleClick={() => setPanelWidth(PANEL_WIDTH_PX)}
        />
        <div className={css.head}>
          <div className={css.strip} role="tablist" aria-label="Open surfaces">
            {strip.shown.map((t) => (
              <Tab key={t.key} tab={t} active={t.key === panel.active} compact={strip.compact} />
            ))}
            {strip.over.length > 0 ? (
              <button
                type="button"
                className={`${css.more} ${menuOpen ? css.moreOn : ''}`}
                title={strip.over.map((x) => x.label).join(' · ')}
                aria-expanded={menuOpen}
                onClick={() => setMenuOver(menuOpen ? null : panel.active)}
              >
                +{strip.over.length}
              </button>
            ) : null}
          </div>
          <div className={css.controls}>
            <PlaceButtons surface={active} here="panel" />
          </div>
        </div>

        {menuOpen ? (
          <div className={css.menu} data-glass-surface="raised">
            {strip.over.map((t) => (
              <button
                key={t.key}
                type="button"
                className={css.menuRow}
                title={`${t.label} · ${t.to}`}
                onClick={() => {
                  setMenuOver(null)
                  focusTab(t.key)
                }}
              >
                <SurfaceGlyph
                  surface={t}
                  className={css.glyph}
                  style={{ ['--rh' as string]: surfaceHue(t) }}
                />
                <span className={`${css.tabName} flex-1 text-left`}>{t.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className={css.tabClose}
                  aria-label={`Close ${t.label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissSurface(t.key)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    e.stopPropagation()
                    dismissSurface(t.key)
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {panel.tabs.map((t) => (
          <div
            key={t.key}
            className={`${css.body} ${t.key === panel.active ? '' : css.bodyHidden}`}
            data-mat=""
            onClickCapture={keepEquipmentLinksIn('panel')}
          >
            <SurfaceBody surface={t} />
          </div>
        ))}
      </aside>
    </>
  )
}
