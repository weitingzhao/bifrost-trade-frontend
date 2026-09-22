/**
 * `▢ ⇥ ⤢` — the same three buttons in every surface header.
 *
 * Before the seventeenth round the float carried `▯ ▭ ⛶ ⇥`, which mixed two
 * questions into one row: *how big* and *where*. Splitting them is most of
 * what made the model legible — size belongs to the float alone, because it is
 * the only place that has one, and it sits behind a rule so the two rows never
 * read as one.
 *
 * The place a surface is in now is **lit and inert**: you cannot send
 * something where it already is, and a button that looked live but did nothing
 * is the reading the Owner objected to elsewhere. `⤢` is disabled outright for
 * a surface with no page of its own — a run, a conversation — rather than
 * offering a door to nothing.
 */
import { useNavigate } from 'react-router-dom'
import { closeSurface, openSurface, type Place, type Surface } from './equipSurface'
import css from './equipSurface.module.css'

const PLACES: { place: Place; glyph: string; title: string }[] = [
  { place: 'float', glyph: '▢', title: 'Float over the page' },
  { place: 'panel', glyph: '⇥', title: 'A tab in the side panel' },
  { place: 'page', glyph: '⤢', title: 'Open as the frame page' },
]

export function PlaceButtons({ surface, here }: { surface: Surface; here: Place }) {
  const navigate = useNavigate()

  return (
    <>
      {PLACES.map((p) => {
        const current = p.place === here
        const off = p.place === 'page' && !surface.canPage
        return (
          <button
            key={p.place}
            type="button"
            className={`${css.btn} ${current ? css.btnOn : ''}`}
            disabled={off}
            aria-pressed={current}
            title={
              off
                ? 'No page of its own — this is a reading, not a place'
                : current
                  ? `${p.title} — here now`
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
            {p.glyph}
          </button>
        )
      })}
      <button
        type="button"
        className={css.close}
        aria-label={`Close ${surface.label}`}
        title="Close"
        onClick={() => closeSurface(surface.key)}
      >
        ×
      </button>
    </>
  )
}
