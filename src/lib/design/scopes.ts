/**
 * What a scope does on the page you are standing on.
 *
 * The Lens's whole contract is one sentence: **lit means this page reads it,
 * dim means it is held for the next page that does.** Lighting a token on a
 * page that then ignores the scope is the shell saying something false — the
 * same failure the design system names when it forbids mapping a grey lamp
 * onto a red one.
 *
 * That needs three states, not two. A page can be wired, or ruled to read the
 * scope and not wired yet, or simply have nothing with a provenance to filter.
 * The middle one is the honest answer while the walk is in progress, and it is
 * the reason the two lists below are separate rather than one.
 *
 * Both lists are generated from the design's registry (`objectiveScope()` and
 * `planned()`), never typed here. A route joins the wired set in the same
 * change that teaches its page to filter.
 */
import {
  DESIGN_OBJ_TARGET,
  DESIGN_OBJ_WIRED,
  DESIGN_ROUTES,
  DESIGN_SYM_TARGET,
} from './designRoutes.generated'
import { PAGE_ROUTES } from '@/layout/routeRegistry'

export type ScopeState = 'read-here' | 'planned' | 'held'

const OBJ_WIRED = new Set(DESIGN_OBJ_WIRED)
const OBJ_TARGET = new Set(DESIGN_OBJ_TARGET)
const SYM_TARGET = new Set(DESIGN_SYM_TARGET)

function clean(path: string): string {
  return path.split('?')[0].split('#')[0]
}

/** Does this page filter by which machine produced the row? */
export function objectiveScopeState(path: string): ScopeState {
  const p = clean(path)
  if (OBJ_WIRED.has(p)) return 'read-here'
  if (OBJ_TARGET.has(p)) return 'planned'
  return 'held'
}

/**
 * The same three states for the symbol scope.
 *
 * `read-here` is not decided here: the app's own route table owns which pages
 * take `?symbol=`, and `useSymbolContext` already answers it. This says only
 * whether a page the app does not scope yet is *ruled* to be — the Bloomberg
 * test the Owner set on 2026-09-20: load a name, see that name's share of
 * everything, everywhere.
 */
export function symbolPlannedHere(path: string): boolean {
  return SYM_TARGET.has(clean(path))
}

export const SCOPE_WORDS: Record<ScopeState, string> = {
  'read-here': 'read here',
  planned: 'held · not wired yet',
  held: 'held',
}

export const OBJECTIVE_SCOPE_TIPS: Record<ScopeState, string> = {
  'read-here': 'This page reads the objective scope — it filters by which machine produced the row.',
  planned:
    'This page is meant to read the objective scope but does not yet. It is held, not applied — the Lens will not claim a filter that is not running.',
  held: 'This page has nothing with an origin to filter. Held for the next objective-aware page.',
}

/** Pages that filter by objective today — what a scope change will actually bite on. */
export function objectiveWiredPages(): readonly string[] {
  return DESIGN_OBJ_WIRED
}

/**
 * What to call a route in a sentence about scopes.
 *
 * The app's own label first, the design's when the app has no such page yet,
 * and the path when neither knows it. `routeFor()` alone falls back to the
 * application's title, so a route the app has not built reads as "Bifrost
 * Trade" — a sentence that names the product where it meant to name a page.
 */
export function scopeRouteLabel(path: string): string {
  const mine = PAGE_ROUTES.find((r) => r.path === path)
  if (mine) return mine.label
  const theirs = DESIGN_ROUTES.find((r) => r.path === path)
  return theirs?.label ?? path
}
