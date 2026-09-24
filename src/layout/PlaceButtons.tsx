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
import { openSurface, type Place, type Surface } from './equipSurface'
import { dismissSurface } from './equipMotion'
import css from './equipSurface.module.css'

const PLACES: { place: Place; label: string; title: string }[] = [
  { place: 'float', label: 'Float', title: 'Float over the page' },
  { place: 'panel', label: 'Side', title: 'A tab in the side panel' },
  { place: 'page', label: 'Page', title: 'Open as the full page' },
]

export function PlaceButtons({ surface, here }: { surface: Surface; here: Place }) {
  const navigate = useNavigate()

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
              title={
                off
                  ? 'No full-page form — this is a reading, not a place'
                  : current
                    ? `${p.title} (here now)`
                    : p.title
              }
              onClick={() => {
                if (current || off) return
                if (p.place === 'page') {
                  // The one place this module cannot put a surface: it closes
                  // and the frame goes. `openSurface` records the choice so the
                  // next open remembers it; the navigating is ours.
                  openSurface(surface, 'page')
                  navigate(surface.to)
                  return
                }
                openSurface(surface, p.place)
              }}
            >
              {p.label}
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
