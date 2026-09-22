/**
 * What a surface actually renders — one component, so the float and the panel
 * cannot disagree about what "the Watchlist" means.
 *
 * Two kinds go through here. A **route** renders its own page component from
 * `surfacePages.ts`. A **run** renders the pipeline reading the Console used
 * to host in its own right-hand inspector: §5a.8's seventeenth round retires
 * that inspector, because a run is a surface with an identity of its own — it
 * can be carried to the panel, to a float, and it survives leaving the page
 * that opened it — and not an explanation of a row in the Console's table.
 *
 * That distinction is the one that keeps `RightInspectorShell` alive on the
 * nine other pages that use it: **an inspector explains a row of the page it
 * belongs to; a surface is a thing you can pick up and put somewhere else.**
 */
import { Suspense, createElement, lazy } from 'react'
import { PageRouteFallback } from '@/components/layout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { surfacePageFor } from './surfacePages'
import type { Surface } from './equipSurface'

const LoopRunPipelineBody = lazy(() =>
  import('@/components/research/harness/LoopRunPipelineBody').then((m) => ({
    default: m.LoopRunPipelineBody,
  })),
)

export function SurfaceBody({ surface, onClose }: { surface: Surface; onClose: () => void }) {
  const Page = surface.run ? null : surfacePageFor(surface.to)

  return (
    <ErrorBoundary key={surface.key}>
      <Suspense fallback={<PageRouteFallback />}>
        {surface.run ? (
          <LoopRunPipelineBody runId={surface.run} live onClose={onClose} />
        ) : Page ? (
          // `createElement`, not `<Page />`: the lint rule reads a capitalised
          // local as a component *defined* during render, which loses its
          // state on every pass. These are `lazy()` objects created once at
          // module scope, so the identity is stable and React reconciles them
          // as the same type — the rule's concern does not apply, and this is
          // the spelling that says so.
          createElement(Page)
        ) : (
          <p className="p-4 text-dense-meta text-muted-foreground">
            No page is registered for {surface.to}.
          </p>
        )}
      </Suspense>
    </ErrorBoundary>
  )
}
