/**
 * `Float · Side · Page` — the same place control in every surface header,
 * then `×`.
 *
 * Before the seventeenth round the float carried `▯ ▭ ⛶ ⇥`, which mixed two
 * questions into one row: *how big* and *where*. Splitting them is most of
 * what made the model legible — size belongs to the float alone, because it is
 * the only place that has one, and it is its own toggle beside this control.
 *
 * Since the framework pass (design Rev 2026-09-23.25) the three places are one
 * segmented control with words rather than three glyph buttons: the float's
 * title bar went from six controls to three, and nothing it could do went with
 * them — three places, two sizes and close are all still here.
 *
 * The place a surface is in now is **lit and inert**: you cannot send
 * something where it already is, and a button that looked live but did nothing
 * is the reading the Owner objected to elsewhere. `Page` is disabled outright
 * for a surface with no page of its own — a run, a conversation — rather than
 * offering a door to nothing.
 */
import { useNavigate } from 'react-router-dom'
import { useCarriedSymbol } from '@/lib/symbolContext'
import { withSymbolParam } from '@/lib/symbolLink'
import { openSurface, type Place, type Surface, instancePath } from './equipSurface'
import { dismissSurface } from './equipMotion'
import css from './equipSurface.module.css'

/**
 * Icons, not words (Owner 2026-09-26, Rev .97): the words cost the tab strip
 * about 100px. Float = a window lifted off the page, Side = a window with its
 * right column filled, Page = the full-page corners — the design's own three
 * shapes; the names stay in the tooltip and the aria-label.
 */
const PLACES: { place: Place; label: string; title: string; d: string[]; fill?: string }[] = [
  { place: 'float', label: 'Float', title: 'Float over the page', d: ['M8 8h12v11H8z', 'M4 15V5h12'] },
  { place: 'panel', label: 'Side', title: 'A tab in the side panel', d: ['M3 5h18v14H3z', 'M14 5v14'], fill: 'M14 5h7v14h-7z' },
  { place: 'page', label: 'Page', title: 'Open as the full page', d: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'] },
]

function PlaceIcon({ p }: { p: (typeof PLACES)[number] }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p.fill ? <path d={p.fill} fill="currentColor" stroke="none" opacity="0.45" /> : null}
      {p.d.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

export function PlaceButtons({ surface, here }: { surface: Surface; here: Place }) {
  const navigate = useNavigate()
  const carried = useCarriedSymbol()

  return (
    <>
      <div className={css.seg} role="group" aria-label="Where this opens">
        {PLACES.map((p) => {
          const current = p.place === here
          const off = p.place === 'page' && !surface.canPage
          return (
            <button
              key={p.place}
              type="button"
              data-on={current ? '1' : '0'}
              data-off={off ? '1' : '0'}
              aria-pressed={current}
              aria-disabled={off || undefined}
              aria-label={p.label}
              title={
                off
                  ? 'No full-page form — this is a reading, not a place'
                  : current
                    ? `${p.title} (here now)`
                    : p.title
              }
              style={{ width: 26, paddingInline: 0 }}
              onClick={() => {
                if (current || off) return
                if (p.place === 'page') {
                  // The one place this module cannot put a surface: it closes
                  // and the frame goes. `openSurface` records the choice so the
                  // next open remembers it; the navigating is ours.
                  openSurface(surface, 'page')
                  // The Symbol surface is a name, not just a route: the page
                  // it becomes carries the name it was showing.
                  navigate(
                    surface.instance != null
                      ? instancePath(surface.instance, surface.instanceList, surface.instanceFrom)
                      : surface.subject
                        ? withSymbolParam(surface.to, surface.subject === 'lock' ? surface.symbol : carried)
                        : surface.to,
                  )
                  return
                }
                openSurface(surface, p.place)
              }}
            >
              <PlaceIcon p={p} />
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={css.close}
        aria-label={`Close ${surface.label}`}
        title="Close"
        onClick={() => dismissSurface(surface.key)}
      >
        ×
      </button>
    </>
  )
}
