/**
 * What a surface actually renders — one component, so the float and the panel
 * cannot disagree about what "the Watchlist" means.
 *
 * Three kinds go through here.
 *
 * A **route** renders its own page component from `surfacePages.ts`.
 *
 * A **run** renders the pipeline reading the Console used to host in its own
 * right-hand inspector: §5a.8's seventeenth round retires that inspector,
 * because a run is a surface with an identity of its own — it can be carried
 * to the panel, to a float, and it survives leaving the page that opened it —
 * and not an explanation of a row in the Console's table. That distinction is
 * the one that keeps `RightInspectorShell` alive on the nine other pages that
 * use it: **an inspector explains a row of the page it belongs to; a surface
 * is a thing you can pick up and put somewhere else.**
 *
 * A **thread** renders the Copilot conversation, which used to be a dock of
 * its own at the same edge. It is the Copilot's second avatar: the rail opens
 * the Desk (a page), the top bar opens this (not a place).
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

const CopilotThreadBody = lazy(() =>
  import('@/components/copilot/CopilotThreadBody').then((m) => ({
    default: m.CopilotThreadBody,
  })),
)

/**
 * The place owns the close, not the body.
 *
 * `Research Autopilot Console.dc.html` says it in its own embed rules: when
 * the shell hosts the run face, *"its own backdrop, edge chrome and close give
 * way"* — `.ap-dw-x { display: none }`. The panel and the float both draw
 * `▢ ⇥ ⤢ ×` in their header, so a body drawing a second ✕ put two closes in
 * one frame, which is what this used to do.
 */
export function SurfaceBody({ surface }: { surface: Surface }) {
  const Page = surface.run || surface.thread ? null : surfacePageFor(surface.to)

  return (
    <ErrorBoundary key={surface.key}>
      <Suspense fallback={<PageRouteFallback />}>
        {surface.thread ? (
          <CopilotThreadBody />
        ) : surface.run ? (
          <LoopRunPipelineBody runId={surface.run} live />
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
