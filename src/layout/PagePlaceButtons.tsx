/**
 * A surface's full page, its way back (design Rev .103 §9): ▢ Float · ⇥ Side ·
 * ⤢ Page in the page head, ⤢ lit and inert. ⇥ / ▢ put the page back as the
 * panel tab or the float it can be, and the frame returns to the page it was
 * on before — the source `pagedFrom` recorded, or Home.
 *
 * Drawn only where the route has a surface form, and never inside a surface
 * (a panel already carries its own place buttons).
 */
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom'
import { useInSurface } from '@/lib/surfaceScope'
import { cn } from '@/lib/utils'
import { openSurface } from './equipSurface'
import { pagedFromFor, surfaceOf } from './pagedFrom'
import { PLACES, PlaceIcon } from './PlaceButtons'

export function PagePlaceButtons({ className }: { className?: string }) {
  // A head rendered outside the router (a test, a story) has no page to leave.
  return useInRouterContext() ? <PlaceButtonsForPage className={className} /> : null
}

function PlaceButtonsForPage({ className }: { className?: string }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const inSurface = useInSurface()
  const surface = inSurface ? null : surfaceOf(pathname, search)
  if (!surface) return null
  const back = pagedFromFor(pathname)
  return (
    // A capsule track (Rev .135 §4): ink 7% under three 26×24 capsules; the
    // place you are in is the raised segment, the way PageHead's tabs are.
    <span
      className={cn('inline-flex h-[30px] items-center gap-0.5 rounded-full bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] p-[3px]', className)}
      role="group"
      aria-label="Where this opens"
    >
      {PLACES.map((p) => {
        const here = p.place === 'page'
        return (
          <button
            key={p.place}
            type="button"
            aria-pressed={here}
            aria-label={p.label}
            disabled={here}
            title={
              here
                ? `${p.title} (here now)`
                : `${p.place === 'panel' ? 'Back to the side panel' : 'Back to a float'} — the page returns to ${back === '/home' ? 'Home' : back.split('?')[0]}`
            }
            className={cn(
              'inline-flex h-6 w-[26px] items-center justify-center rounded-full border-0 p-0 transition-colors active:[filter:var(--press)]',
              here
                ? 'bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)] text-[var(--sk-accent)] shadow-[var(--glass-lens),0_1px_2px_rgba(0,0,0,0.22)]'
                : 'bg-transparent text-[var(--sk-mute2)] hover:text-[var(--foreground)]',
            )}
            onClick={() => {
              if (here) return
              openSurface(surface, p.place)
              navigate(back)
            }}
          >
            <PlaceIcon p={p} />
          </button>
        )
      })}
    </span>
  )
}
