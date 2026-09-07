/**
 * One header for a hub of labs (research-loop-automation C1).
 *
 * The hub owns what every lab used to repeat — the page shell, the title, the
 * research context bar — and switches the lab body with `?view=` so a tab
 * change is a URL change: bookmarkable, linkable from the Brief and the
 * Copilot, and the symbol rides along untouched.
 */
import type { ReactNode } from 'react'
import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SegmentControl } from '@/components/data-display'
import { PageHeader, PageShell } from '@/components/layout'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { CopilotVerdictStrip } from '@/components/research/CopilotVerdictStrip'
import { VIEW_PARAM, type LabViewId } from '@/lib/analyzeHubs'

export interface LabViewDef {
  id: LabViewId
  label: string
  /** Shown under the hub title while this view is active. */
  description?: string
  /** Whether the context bar offers a date; labs on daily snapshots do not. */
  showDate?: boolean
  padding?: 'default' | 'compact'
  render: () => ReactNode
}

/** The active view from `?view=`, falling back to the hub's default. */
export function useLabView(
  views: readonly LabViewDef[],
  defaultView: LabViewId,
): [LabViewDef, (id: LabViewId) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(VIEW_PARAM)
  const active = views.find((v) => v.id === raw) ?? views.find((v) => v.id === defaultView) ?? views[0]
  const setView = useCallback(
    (id: LabViewId) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set(VIEW_PARAM, id)
        return next
      })
    },
    [setParams],
  )
  return [active, setView]
}

export function LabHubHeader({
  title,
  views,
  active,
  onChange,
}: {
  title: string
  views: readonly LabViewDef[]
  active: LabViewDef
  onChange: (id: LabViewId) => void
}) {
  return (
    <PageHeader
      title={title}
      description={active.description}
      actions={
        <SegmentControl
          ariaLabel={`${title} view`}
          size="sm"
          value={active.id}
          onChange={(v) => onChange(v as LabViewId)}
          options={views.map((v) => ({ value: v.id, label: v.label }))}
        />
      }
    />
  )
}

export function LabHub({
  title,
  views,
  defaultView,
}: {
  title: string
  views: readonly LabViewDef[]
  defaultView: LabViewId
}) {
  const [active, setView] = useLabView(views, defaultView)
  return (
    <PageShell padding={active.padding ?? 'default'} className="space-y-3">
      <LabHubHeader title={title} views={views} active={active} onChange={setView} />
      <ResearchContextBar showDate={active.showDate ?? true} />
      {/* D4: what Copilot and the Loop have said about the symbol, with approval states. */}
      <CopilotVerdictStrip originPage={`hub:${active.id}`} originLabel={`${title} · ${active.label}`} />
      {/* Keyed so a view switch remounts the lab: its local state (selected
          row, sort, filters) belongs to that lab, not to its neighbour. */}
      <div key={active.id}>{active.render()}</div>
    </PageShell>
  )
}
