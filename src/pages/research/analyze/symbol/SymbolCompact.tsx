/**
 * The Symbol page at 440 — the same page, re-authored for a panel (design
 * Rev .57, Symbol Panel Options 1a–2e). It is chosen by the page's own width
 * inside a surface, not by a second route: "同一路由组件按容器宽度切换".
 *
 * - **Head**: Follow / Lock · subject · verdict · why · Send.
 * - **Overview**: the six faces as one row each — bar, verdict, the lenses'
 *   readings, the lead reading and its 5d / 20d record — then your verdict
 *   and the narrative, as the wide page's rail has them.
 * - **Volatility · Dealer · Scenario · Flow**: a run of folding sections, one
 *   per lens. Folded, a section still shows its verdict, its reading and its
 *   hit rates; one opens at a time; ⇢ lifts the face to the full page.
 * - **Chain · Payoff**: the faces themselves, in the panel's width.
 *
 * What an open section holds here is the lens's own words, its record and
 * its date — the wide face's charts are one ⇢ away rather than redrawn small.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { TONE_BAR, TONE_TEXT, type DossierFaceId, type DossierFaceView } from '@/lib/dossier'
import { SYMBOL_PATH, SYMBOL_TABS, TAB_PARAM, isSymbolTab, type SymbolTabId } from '@/lib/symbolTabs'
import { useFrameNavigate, useSurfaceSubject } from '@/lib/surfaceScope'
import { withSymbolParam } from '@/lib/symbolLink'
import type { LampColor } from '@/lib/researchFreshness'
import { cn } from '@/lib/utils'
import { PayoffBody } from '@/pages/research/analyze/payoff/PayoffBody'
import { SymbolAsofTag } from './SymbolAsofTag'
import { SymbolChainFace } from './SymbolChainFace'
import { SymbolIdentity } from './SymbolIdentity'
import { SymbolNarrativePanel } from './SymbolNarrativePanel'
import { SymbolVerdictPanel } from './SymbolVerdictPanel'
import type { SymbolFaces } from './useSymbolFaces'
import head from './symbolHead.module.css'

/** Which face a folding tab reads. */
const FOLD_FACE: Partial<Record<SymbolTabId, DossierFaceId>> = {
  volatility: 'volatility',
  dealer: 'dealer',
  scenario: 'scenario',
  flow: 'flow',
}

function FollowLock({ symbol }: { symbol: string }) {
  const subject = useSurfaceSubject()
  if (!subject) return null
  return (
    <span className={head.seg} role="group" aria-label="Follow or lock">
      <button
        type="button"
        className={cn(head.segBtn, !subject.locked && head.segOn)}
        aria-pressed={!subject.locked}
        title="Follow the list and the page's selection"
        onClick={subject.follow}
      >
        Follow
      </button>
      <button
        type="button"
        className={cn(head.segBtn, subject.locked && head.segOn)}
        aria-pressed={subject.locked}
        title="Hold this symbol while the page and the list move — compare side by side"
        onClick={subject.lock}
      >
        {subject.locked ? `Lock · ${symbol}` : 'Lock'}
      </button>
    </span>
  )
}

/** The lead reading and its record, for a face row's right-hand column. */
function lead(view: DossierFaceView) {
  const row = view.rows.find((r) => r.value != null) ?? view.rows[0]
  return { value: row?.value ?? '', rec: row?.rates?.split(' · ')[0] ?? '' }
}

function FaceRows({
  views,
  loading,
  onOpen,
}: {
  views: DossierFaceView[]
  loading: boolean
  onOpen: (view: DossierFaceView) => void
}) {
  return (
    <div className="flex flex-col">
      {views.map((v) => {
        const l = lead(v)
        return (
          <button
            key={v.face.id}
            type="button"
            onClick={() => onOpen(v)}
            title={`${v.face.question} — ${v.face.isTab ? `open the ${v.face.title} tab` : v.face.openLabel}`}
            className="grid w-full cursor-pointer grid-cols-[3px_minmax(0,1fr)_auto] items-center gap-2.5 border-0 border-b border-[var(--sk-line0)] bg-transparent py-2 text-left hover:bg-[var(--sk-surface)]"
          >
            <span className={cn('self-stretch rounded-sm', TONE_BAR[v.tone] ?? TONE_BAR.neutral)} />
            <span className="min-w-0">
              <span className="flex items-baseline gap-1.5">
                <span className="whitespace-nowrap text-dense-label font-semibold">{v.face.title}</span>
                <span className={cn('truncate text-dense-meta', TONE_TEXT[v.tone] ?? TONE_TEXT.neutral)}>
                  {loading && v.rows.length === 0 ? 'reading…' : v.headline}
                </span>
              </span>
              <span className="block truncate text-dense-caption text-muted-foreground">
                {v.rows
                  .filter((r) => r.value != null)
                  .slice(0, 2)
                  .map((r) => `${r.label} ${r.value}`)
                  .join(' · ') || (v.means ?? '')}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-dense-label font-semibold tabular-nums">{l.value}</span>
              <span className="block font-mono text-dense-micro text-muted-foreground" title="hit rate, 5 sessions">
                {l.rec}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FoldSections({
  view,
  open,
  onToggle,
  onLift,
}: {
  view: DossierFaceView
  open: string | null
  onToggle: (id: string) => void
  onLift: () => void
}) {
  if (view.rows.length === 0) {
    return <p className="m-0 py-2 text-dense-meta text-muted-foreground">{view.headline}</p>
  }
  return (
    <div className="flex flex-col">
      {view.rows.map((r) => {
        const on = open === r.id
        return (
          <div key={r.id} className="border-b border-[var(--sk-line0)]">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={on}
              onClick={() => onToggle(r.id)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                onToggle(r.id)
              }}
              className="grid cursor-pointer grid-cols-[12px_3px_minmax(0,1fr)_auto] items-center gap-2 py-2 pr-1"
            >
              <span className="text-dense-micro text-muted-foreground">{on ? '▾' : '▸'}</span>
              <span className={cn('self-stretch rounded-sm', TONE_BAR[r.tone] ?? TONE_BAR.neutral)} />
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className={head.cap}>{r.label}</span>
                <span className={cn('truncate text-dense-meta font-semibold', TONE_TEXT[r.tone] ?? TONE_TEXT.neutral)}>
                  {r.verdict}
                </span>
              </span>
              <span className="inline-flex items-baseline gap-2">
                <span className="font-mono text-dense-label font-semibold tabular-nums">{r.value ?? '—'}</span>
                <span className="font-mono text-dense-micro text-muted-foreground" title="hit rate · 5 sessions · 20 sessions">
                  {r.rates ?? '—'}
                </span>
                <button
                  type="button"
                  className="border-0 bg-transparent px-0.5 text-dense-label text-primary hover:underline"
                  title="Open this face as the page"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLift()
                  }}
                >
                  ⇢
                </button>
              </span>
            </div>
            {on ? (
              <div className="flex flex-col gap-1.5 pb-3 pl-[23px] text-dense-meta">
                {r.means ? <p className="m-0 leading-normal text-[var(--sk-soft)]">{r.means}</p> : null}
                <p className="m-0 leading-normal text-muted-foreground">
                  {r.record ?? 'No settled record on this name yet.'}
                  {r.sample ? ` · ${r.sample}` : ''}
                </p>
                <p className="m-0 flex items-center gap-1.5 text-dense-caption text-muted-foreground">
                  <StatusLamp variant="dot" lamp={r.lamp} className="h-1.5 w-1.5" />
                  {r.asOf ? `as of ${r.asOf}` : 'no date on this reading'}
                  <span className="ml-auto">⇢ for the charts</span>
                </p>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function SymbolCompact({
  symbol,
  faces,
  active,
  setTab,
  lampFor,
  thesis,
}: {
  symbol: string
  faces: SymbolFaces
  /** The decisive lenses' words — what Your verdict is written against. */
  thesis: string
  active: SymbolTabId
  setTab: (id: SymbolTabId) => void
  lampFor: (id: SymbolTabId) => LampColor | null
}) {
  const frameNavigate = useFrameNavigate()
  const navigate = useNavigate()
  const go = frameNavigate ?? navigate
  // Which section is open, per tab — one at a time, the first by default.
  const [openBy, setOpenBy] = useState<Partial<Record<SymbolTabId, string | null>>>({})
  const liftTo = (tab: SymbolTabId) => go(withSymbolParam(`${SYMBOL_PATH}?${TAB_PARAM}=${tab}`, symbol))

  const foldView = FOLD_FACE[active] ? faces.views.find((v) => v.face.id === FOLD_FACE[active]) : undefined
  const openRow = foldView ? (active in openBy ? (openBy[active] ?? null) : (foldView.rows[0]?.id ?? null)) : null

  return (
    <div className="flex flex-col gap-2.5 px-3 pt-2 pb-6">
      <SymbolIdentity
        symbol={symbol}
        faces={faces}
        tab={active}
        compact
        subjectControl={<FollowLock symbol={symbol} />}
        asof={<SymbolAsofTag symbol={symbol} />}
      />

      <div className="sticky top-0 z-10 -mx-3 flex items-end overflow-x-auto border-b border-border bg-card px-2.5 [scrollbar-width:none]">
        {SYMBOL_TABS.map((t) => {
          const lamp = lampFor(t.id)
          const on = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'inline-flex h-7.5 shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-1.75 text-dense-meta',
                on ? 'border-primary font-semibold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {lamp ? <StatusLamp variant="dot" lamp={lamp} className="h-1.5 w-1.5" /> : null}
              {t.label}
            </button>
          )
        })}
      </div>

      {active === 'overview' ? (
        <>
          <FaceRows
            views={faces.views}
            loading={faces.loading}
            onOpen={(v) => {
              const to = v.face.openTo
              if (v.face.isTab && isSymbolTab(to)) setTab(to)
              else go(v.href)
            }}
          />
          <SymbolVerdictPanel symbol={symbol} thesis={thesis} />
          <SymbolNarrativePanel symbol={symbol} />
        </>
      ) : foldView ? (
        <FoldSections
          view={foldView}
          open={openRow}
          onToggle={(id) => setOpenBy((prev) => ({ ...prev, [active]: openRow === id ? null : id }))}
          onLift={() => liftTo(active)}
        />
      ) : active === 'chain' ? (
        <SymbolChainFace symbol={symbol} />
      ) : (
        <PayoffBody />
      )}
    </div>
  )
}
