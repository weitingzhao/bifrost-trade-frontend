/**
 * A drawer over the frame page — the second surface, and the one the design
 * added after the Owner saw a drawer-shaped page crammed into a window.
 *
 * §5a.8 ninth round: *"Loop Run / Book starters opened as a sidebar inside a
 * popup"* — and they were right to object. Those readings are drawers in the
 * app already ("a run is a read, not an object"), and a drawer's host is the
 * **frame page**; putting one inside a float builds the drawer a second room.
 * The rule that settled it is one line: **page floats, drawer slides,
 * conversation docks.**
 *
 * 480px, full height, no scrim — the page keeps working while it is open, the
 * same as the float. Nothing in this app is flagged `drawer` yet: the design
 * marks Loop Run, which has no route here, and it put Book starters back in a
 * float for this package. The surface is built so the flag is all it takes.
 */
import { Suspense, createElement } from 'react'
import { EQUIP_HUE } from './equip'
import { closeSurface, useSurfaces } from './equipSurface'
import { floatPageFor } from './floatPages'
import { PageRouteFallback } from '@/components/layout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import css from './equipFloat.module.css'

export function EquipDrawer() {
  const { drawer } = useSurfaces()
  if (!drawer) return null
  const Page = floatPageFor(drawer.to)
  const hue = EQUIP_HUE[drawer.group]

  return (
    <div
      className={css.drawer}
      style={{ ['--rh' as string]: hue }}
      role="dialog"
      aria-label={`${drawer.label} — drawer`}
    >
      <div className={css.bar}>
        <span className={css.dot} />
        <span className={css.name}>{drawer.label}</span>
        <span className={css.route}>drawer · {drawer.to}</span>
        <span className="ml-auto" />
        <button
          type="button"
          className={css.close}
          aria-label="Close"
          onClick={() => closeSurface('drawer')}
        >
          ×
        </button>
      </div>
      <div className={css.body}>
        {Page ? (
          <ErrorBoundary key={drawer.to}>
            {/* See `EquipFloat` on why this is `createElement`. */}
            <Suspense fallback={<PageRouteFallback />}>{createElement(Page)}</Suspense>
          </ErrorBoundary>
        ) : null}
      </div>
    </div>
  )
}
