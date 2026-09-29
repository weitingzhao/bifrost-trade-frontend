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
import { buttonVariants } from '@bifrost/ui'
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
    <span className={cn('inline-flex items-center gap-0.5', className)} role="group" aria-label="Where this opens">
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
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), here && 'text-[var(--sk-accent)] opacity-100')}
            style={{ paddingInline: 6 }}
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
