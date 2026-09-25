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
import { Suspense, createElement, lazy, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { InSurfaceContext, SurfaceSubjectContext, type SurfaceSubject } from '@/lib/surfaceScope'
import { useCarriedSymbol } from '@/lib/symbolContext'
import { surfacePageFor } from './surfacePages'
import { setSubjectLock, type Surface } from './equipSurface'
import { SurfaceLocation } from './SurfaceLocation'
import css from './equipSurface.module.css'

/** The five bars the design shows while a surface loads — widths from its own markup. */
const SKELETON_BARS = ['38%', '92%', '84%', '88%', '60%']

/**
 * No white flash (design Rev .25): a surface that is still loading shows the
 * shape of a page, not a blank card. The design's surfaces are iframes and
 * wait on `onLoad`; this app renders the route itself, so the wait is the
 * lazy chunk — the rhythm (skeleton, then a .22s fade) is what carries over.
 */
function SurfaceSkeleton() {
  return (
    <div className={css.skeleton} aria-busy="true" aria-label="Loading">
      {SKELETON_BARS.map((w, i) => (
        <i key={i} style={{ width: w, height: i === 0 ? 14 : undefined }} />
      ))}
    </div>
  )
}

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
  // `createElement`, not `<Page />`: the lint rule reads a capitalised local
  // as a component *defined* during render, which loses its state on every
  // pass. These are `lazy()` objects created once at module scope, so the
  // identity is stable and React reconciles them as the same type — the
  // rule's concern does not apply, and this is the spelling that says so.
  const page = Page ? createElement(Page) : null
  const carried = useCarriedSymbol()
  const locked = surface.subject === 'lock'
  const subject: SurfaceSubject | null = useMemo(
    () =>
      surface.subject
        ? {
            locked,
            follow: () => setSubjectLock(surface.key, null),
            lock: () => setSubjectLock(surface.key, carried),
          }
        : null,
    [surface.subject, surface.key, locked, carried],
  )

  return (
    <ErrorBoundary key={surface.key}>
      <InSurfaceContext.Provider value>
        <Suspense fallback={<SurfaceSkeleton />}>
          <div className={css.arrive}>
            {surface.thread ? (
              <CopilotThreadBody />
            ) : surface.run ? (
              <LoopRunPipelineBody runId={surface.run} live />
            ) : page && surface.subject ? (
              // The Symbol page reads its own address, not the frame's. Keyed
              // on the ask, so a contract row re-opens it on the face it names.
              <SurfaceLocation
                key={surface.intent?.n ?? 0}
                path={surface.to}
                lockedSymbol={locked ? surface.symbol : undefined}
                onRelock={(sym) => setSubjectLock(surface.key, sym)}
                initialSearch={
                  surface.intent
                    ? `?${new URLSearchParams({ tab: surface.intent.tab, ...surface.intent.params }).toString()}`
                    : ''
                }
              >
                <SurfaceSubjectContext.Provider value={subject}>{page}</SurfaceSubjectContext.Provider>
              </SurfaceLocation>
            ) : page ? (
              page
            ) : (
              <p className="p-4 text-dense-meta text-muted-foreground">
                No page is registered for {surface.to}.
              </p>
            )}
          </div>
        </Suspense>
      </InSurfaceContext.Provider>
    </ErrorBoundary>
  )
}
