/**
 * The last crumb, with a live name where the registry only has a shape.
 *
 * Almost every route's label is a constant and `routeFor` is the whole
 * answer. A `:param` route is the exception: its registry label names the
 * *kind* of thing ("Objective"), and the reader standing on one wants the
 * name of the thing.
 *
 * It matters more since the Objectives fold was cancelled (Owner 2026-09-21):
 * the menu no longer says which objective you are in, so the crumb is the
 * only place left that can.
 *
 * The standing query is already in flight — `useResearchNavGroup` runs it in
 * the sidebar on every page — so reading it here costs a cache hit, not a
 * request. Falls back to the registry label while it loads or if the id is
 * unknown, because a crumb that flickers to empty is worse than one that is
 * briefly generic.
 */
import { useAutopilotStanding } from '@/hooks/useLoopHarness'
import { OBJECTIVE_PATH_PREFIX } from '@/lib/harness/objectivePolicy'

export function useCrumbLabel(pathname: string, registryLabel: string): string {
  const standing = useAutopilotStanding().data
  if (!pathname.startsWith(OBJECTIVE_PATH_PREFIX)) return registryLabel
  const id = decodeURIComponent(pathname.slice(OBJECTIVE_PATH_PREFIX.length).split('/')[0] ?? '')
  const found = standing?.objectives?.find((o) => o.id === id)
  return found?.title ?? registryLabel
}
