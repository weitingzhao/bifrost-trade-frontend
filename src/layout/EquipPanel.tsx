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
 * The shared formula, not a threshold of its own (`panelDocks`): the page
 * keeps its 760px of columns or the panel floats over it. One addition while
 * the Copilot is still a dock of its own — if it is pushing, its 440 counts
 * against the room left, otherwise two docked columns can squeeze the content
 * to a third of the floor. That coupling disappears when the Thread becomes a
 * tab in here, which is the next round's work, not this one's.
 */
import { useEffect, useState } from 'react'
import { EQUIP_HUE } from './equip'
import {
  PANEL_CARD_PX,
  activeTabOf,
  closeSurface,
  focusTab,
  stripFor,
  useSurfaces,
  type PanelTab,
} from './equipSurface'
import { PlaceButtons } from './PlaceButtons'
import { SurfaceBody } from './SurfaceBody'
import { SurfaceGlyph } from './SurfaceGlyph'
import { SHELL_TOP_BAR_PX } from './shellChrome'
import { COPILOT_DOCK_WIDTH, copilotDockPushes, useCopilotDock } from '@/hooks/useCopilotDock'
import { panelDocks } from '@/lib/panelDocks'
import css from './equipSurface.module.css'

function Tab({ tab, active, compact }: { tab: PanelTab; active: boolean; compact: boolean }) {
  const full = active || !compact
  return (
    <button
      type="button"
      className={`${css.tab} ${full ? css.tabFull : css.tabIcon} ${active ? css.tabOn : ''}`}
      style={{ ['--rh' as string]: EQUIP_HUE[tab.group], maxWidth: full && compact ? 150 : 170 }}
      title={`${tab.label} · ${tab.to}`}
      aria-current={active ? 'true' : undefined}
      onClick={() => focusTab(tab.key)}
    >
      <SurfaceGlyph surface={tab} className={css.glyph} />
      {full ? (
        <>
          <span className={css.tabName}>{tab.label}</span>
          <span
            role="button"
            tabIndex={0}
            className={css.tabClose}
            aria-label={`Close ${tab.label}`}
            title="Close tab"
            onClick={(e) => {
              e.stopPropagation()
              closeSurface(tab.key)
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              e.stopPropagation()
              closeSurface(tab.key)
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
  const dock = useCopilotDock()
  // The overflow menu belongs to *this* active tab: remembering which tab it
  // was opened over closes it for free when you pick another one, when the
  // panel is re-opened on something else, or when the strip stops overflowing
  // — all without an effect that fights the render it is reacting to.
  const [menuOver, setMenuOver] = useState<string | null>(null)
  const [viewport, setViewport] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setViewport(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const active = activeTabOf(panel)
  if (!panel || !active) return null

  const strip = stripFor(panel)
  const menuOpen = menuOver === panel.active && strip.over.length > 0
  const copilotRoom = copilotDockPushes(dock, viewport) ? COPILOT_DOCK_WIDTH : 0
  const pushes = panelDocks(PANEL_CARD_PX + copilotRoom, viewport)

  return (
    <>
      {/* Takes the column out of the content rather than letting a fixed card
          sit on top of it. A sibling of the page, as the Copilot dock is. */}
      {pushes ? (
        <div className={css.spacer} style={{ width: PANEL_CARD_PX }} aria-hidden />
      ) : null}
      <aside
        className={`${css.card} ${css.panel}`}
        style={{
          ['--rh' as string]: EQUIP_HUE[active.group],
          // Pushed, the page has already stepped aside, so the card can take
          // the full height. Overlaying, it starts below the top bar — which
          // is one fixed row here and never wraps, so there is nothing to
          // measure, unlike the design's own.
          top: pushes ? 8 : SHELL_TOP_BAR_PX + 8,
        }}
        aria-label="Side panel"
      >
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
          <div className={css.menu}>
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
                  style={{ ['--rh' as string]: EQUIP_HUE[t.group] }}
                />
                <span className={`${css.tabName} flex-1 text-left`}>{t.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className={css.tabClose}
                  aria-label={`Close ${t.label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeSurface(t.key)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    e.stopPropagation()
                    closeSurface(t.key)
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
          >
            <SurfaceBody surface={t} onClose={() => closeSurface(t.key)} />
          </div>
        ))}
      </aside>
    </>
  )
}
