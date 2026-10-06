/**
 * Method › Screens (Rev .121 #4–#5): My screens as the store holds them —
 * conditions, where each was written, and when. A saved screen is conditions
 * (and nothing of the model): the same screen can be ranked by SEPA today and
 * by Premium tomorrow.
 *
 * The design also draws the version tree here. Versions are made on Stock
 * screen and live in that tab: the screen store keeps saved screens, not
 * their forks, so this face says so rather than drawing a tree it cannot read.
 */
import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ViewState } from '@bifrost/ui'
import { PageFaceSwitch, PageHead, PageShell } from '@/components/layout'
import { fetchSavedScreens, screenV1, screenV2, type SavedScreen } from '@/api/research/savedScreens'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { FUND_CONDS, TECH_CONDS } from '@/utils/sepaScreenModel'
import { METHOD_INFO, METHOD_PATH, METHOD_TITLE, type MethodHead } from './methodHead'
import { stagesWithPine } from '../stockScreenStages'
import type { Stage } from '../stockScreenModel'
import { usePineLibrary } from '@/hooks/usePineLibrary'
import { describeV2 } from '../stockScreenView'

const LABEL = new Map([...TECH_CONDS, ...FUND_CONDS])

/** A screen's conditions in words — v2 by Stock screen's stages, v1 by the SEPA wide table's filters. */
function conds(s: SavedScreen, stages: readonly Stage[]): string {
  const v2 = screenV2(s)
  if (v2) return describeV2(v2, stages)
  const d = screenV1(s)
  if (!d) return `speaks ${s.vocabulary}`
  const parts = [
    d.paths?.length ? `path ${d.paths.join('|')}` : null,
    d.grades?.length ? `grade ${d.grades.join('|')}` : null,
    d.min_composite > 0 ? `composite ≥ ${d.min_composite}` : null,
    ...d.tech.map((k) => LABEL.get(k) ?? k),
    ...d.fund.map((k) => LABEL.get(k) ?? k),
    d.q ? `“${d.q}”` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'no condition'
}

export function ScreensFace({ head }: { head: MethodHead }) {
  const q = useQuery({ queryKey: ['research-engine', 'saved-screens'], queryFn: fetchSavedScreens, staleTime: 60_000 })
  const screens = q.data?.screens ?? []
  const pineLib = usePineLibrary()
  const stages = useMemo(() => stagesWithPine(pineLib.scripts), [pineLib.scripts])
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead title={METHOD_TITLE} info={METHOD_INFO} tabs={head.tabs} tab={head.tab} onTab={head.onTab} />
      <div data-sr-toolbar="">
        <PageFaceSwitch path={METHOD_PATH} />
        <span data-sr-tb="sep" />
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mat-tag font-mono text-dense-micro font-semibold tracking-[0.05em] text-[var(--sk-series-violet)]"
          title="Method face — how the number is made. No order can be placed from here."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span data-sr-tb="meta" className="font-mono">
          /research/screens · {q.data ? `${q.data.count} saved` : '—'}
        </span>
      </div>
      <div className="flex flex-wrap items-start gap-2.5">
        <section className="mat-card min-w-0 flex-[1_1_360px] overflow-hidden border">
          <header className="flex items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
            <span data-sr-tb="label">My screens</span>
            <span className="font-mono text-dense-caption text-muted-foreground">/research/screens</span>
          </header>
          {q.isLoading ? (
            <ViewState kind="loading" rows={3} cols={2} />
          ) : firstResearchAuthGapError(q.error) ? (
            <ResearchAuthGap error={q.error} layout="banner" className="m-1.5" />
          ) : q.isError ? (
            <ViewState kind="failed" title="My screens did not load" detail={(q.error as Error).message} onAction={() => void q.refetch()} />
          ) : screens.length === 0 ? (
            <ViewState
              kind="empty"
              title="No screen saved yet"
              detail="Save one from Stock screen (Save screen) or from the Conditions tab. It shows on Stock screen under Start from."
            />
          ) : (
            <div className="flex flex-col gap-1 p-1.5">
              {screens.map((s) => (
                <div key={s.id} className="grid gap-x-2.5 gap-y-1 rounded-lg bg-foreground/[0.03] px-2.5 py-2 [grid-template-columns:minmax(0,1fr)_auto]">
                  <span className="text-dense-body font-semibold">{s.name}</span>
                  <span className="font-mono text-dense-caption text-muted-foreground" title={`vocabulary ${s.vocabulary}`}>
                    {s.origin_page ?? '—'} · {s.created_at.slice(0, 10)}
                  </span>
                  <span className="col-span-2 text-dense-meta text-[var(--sk-soft)]">{conds(s, stages)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-foreground/[0.06] px-3 py-2 text-dense-meta leading-normal text-muted-foreground">
            A saved screen is conditions. The model is not part of it: the same screen can be ranked by SEPA today and by Premium tomorrow. Presets on Stock screen are condition sets of the same shape.
          </div>
        </section>
        <section className="mat-card min-w-0 flex-[2_1_520px] overflow-hidden border">
          <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
            <span data-sr-tb="label">Lineage</span>
            <span className="text-dense-body font-semibold">Versions and provenance</span>
            <span className="ml-auto text-dense-meta text-muted-foreground">every criteria change is a fork; nothing is overwritten</span>
          </header>
          <ViewState
            kind="empty"
            title="Versions live on Stock screen"
            detail="Each change on Stock screen is a new version whose parent is the one you stood on, and its lineage strip walks them. The screen store keeps saved screens, not their forks, so no version tree, provenance or Explain can be read here — a store for them is owed."
          />
          <div className="border-t border-foreground/[0.06] px-3 py-2 text-dense-meta">
            <Link to="/research/stocks" className="text-primary hover:underline">
              Open Stock screen →
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
