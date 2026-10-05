/**
 * Symbol Screener · authoring — the Method face of Stock screen (design
 * `Research Stock Screen Method.dc.html`, route rev 2026-09-20.4; §16
 * refinement at Rev .91).
 *
 * Build and tune a screen against the SEPA wide table. The filter vocabulary
 * is defined here and nowhere else: the 19 condition columns of
 * `dw_stock.mart_sepa_screener_wide`, read whole (one row per evaluated
 * symbol, every boolean by name) and filtered client-side. Grade, stage and
 * path are the dbt case rules re-applied at read — verified on DEV against
 * the model store before this page was built.
 *
 * Save as screen writes `research.saved_screen` (research 0.107.0): one
 * object, one id, which Trade's result face renders read-only.
 */
import { METHOD_INFO, METHOD_PATH, METHOD_TITLE, type MethodHead } from './methodHead'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FilterChip, Input, ViewState } from '@bifrost/ui'
import { DenseTag } from '@/components/data-display'
import { fetchSepaScreenerWide, type SepaWideRow } from '@/api/research/sepaScreenerWide'
import { createSavedScreen, fetchSavedScreens } from '@/api/research/savedScreens'
import { fetchSepaDaily } from '@/api/researchEngine'
import { AsofTag } from '@/components/AsofTag'
import { PageFaceSwitch, PageHead, PageHeadAction, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { usePreviewState } from '@/hooks/usePreviewState'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  activeFilterCount,
  condPassPct,
  EMPTY_FILTER,
  filterSummary,
  FUND_CONDS,
  GRADES,
  gradeOf,
  PATHS,
  pathOf,
  screenRows,
  sortRows,
  stageOf,
  TECH_CONDS,
  vsSma50,
  type ScreenFilter,
  type SortDir,
  type SortKey,
} from '@/utils/sepaScreenModel'

/** The universe is thousands of rows; the table draws this many under the sort. */
const RENDER_CAP = 200

function CondCheck({
  label,
  pct,
  on,
  onToggle,
}: {
  label: string
  pct: number | null
  on: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-dense-caption leading-tight">
      <input
        type="checkbox"
        checked={on}
        onChange={onToggle}
        className="m-0 h-[13px] w-[13px] accent-[var(--sk-accent)]"
      />
      <span className="flex-1">{label}</span>
      <span
        className={cn(mono, 'text-dense-micro text-muted-foreground')}
        title="Share of the evaluated universe passing this condition."
      >
        {pct != null ? `${pct.toFixed(0)}%` : '—'}
      </span>
    </label>
  )
}

function SortTh({
  label,
  k,
  sort,
  onSort,
  num = true,
}: {
  label: string
  k: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (k: SortKey) => void
  num?: boolean
}) {
  return (
    <th className={cn(th, !num && 'text-left')} aria-sort={sort.key === k ? (sort.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn('cursor-pointer', sort.key === k ? 'text-primary' : undefined)}
      >
        {label}
        {sort.key === k ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  )
}

function condDots(r: SepaWideRow, conds: readonly [string, string][]) {
  return conds.map(([key, label]) => {
    const v = r.conditions[key]
    return (
      <span
        key={key}
        title={`${label} · ${v === true ? 'pass' : v === false ? 'fail' : 'not evaluated'}`}
        className={cn(
          'h-[5px] w-[5px] rounded-[1px]',
          v === true ? 'bg-[var(--sk-accent)]' : 'bg-[var(--sk-line)]',
          v == null && 'opacity-40'
        )}
      />
    )
  })
}

export function ConditionsFace({ head }: { head: MethodHead }) {
  const preview = usePreviewState()
  const [filter, setFilter] = useState<ScreenFilter>(EMPTY_FILTER)
  // ── Saved screens (6A · research 0.107.0): one object, one id ──
  const qc = useQueryClient()
  const [saveOpen, setSaveOpen] = useState(false)
  const [screenName, setScreenName] = useState('')
  const screensQ = useQuery({
    queryKey: ['research-engine', 'saved-screens'],
    queryFn: fetchSavedScreens,
    staleTime: 60_000,
  })
  const saveScreen = useMutation({
    mutationFn: () =>
      createSavedScreen({
        name: screenName.trim(),
        origin_page: METHOD_PATH,
        definition: {
          q: filter.q,
          paths: filter.paths,
          grades: filter.grades,
          min_composite: filter.minScore,
          tech: filter.tech,
          fund: filter.fund,
        },
      }),
    onSuccess: () => {
      setSaveOpen(false)
      setScreenName('')
      void qc.invalidateQueries({ queryKey: ['research-engine', 'saved-screens'] })
    },
  })
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'composite_score',
    dir: 'desc',
  })

  const wideQ = useQuery({
    queryKey: ['research-engine', 'sepa-screener-wide'],
    queryFn: () => fetchSepaScreenerWide(),
    staleTime: 5 * 60_000,
  })
  // The committed IV percentile lives in the model store, which serves its
  // top 1000 by score and carries one only where the option chain is
  // collected (204 of the 1000 on DEV, 2026-09-26) — joined by symbol.
  const modelQ = useQuery({
    queryKey: ['research-engine', 'sepa-model-daily', 'iv-join'],
    queryFn: () => fetchSepaDaily({ limit: 1000 }),
    staleTime: 5 * 60_000,
  })
  const ivMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of modelQ.data?.rows ?? []) {
      if (r.iv_percentile != null) m.set(r.symbol, r.iv_percentile)
    }
    return m
  }, [modelQ.data?.rows])
  const ivOf = (symbol: string) => ivMap.get(symbol) ?? null

  const all = useMemo(() => wideQ.data?.rows ?? [], [wideQ.data?.rows])
  const passing = useMemo(() => screenRows(all, filter), [all, filter])
  const rows = useMemo(
    () => sortRows(passing, sort.key, sort.dir, ivOf).slice(0, RENDER_CAP),
    // ivMap is the join behind ivOf — the identity that actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [passing, sort, ivMap]
  )
  const techPcts = useMemo(
    () => TECH_CONDS.map(([key]) => condPassPct(all, key)),
    [all]
  )
  const fundPcts = useMemo(
    () => FUND_CONDS.map(([key]) => condPassPct(all, key)),
    [all]
  )

  const toggleIn = (key: 'paths' | 'grades' | 'tech' | 'fund', v: string) =>
    setFilter((f) => {
      const list = f[key]
      return { ...f, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] }
    })
  const onSort = (k: SortKey) =>
    setSort((s) => ({ key: k, dir: s.key === k && s.dir === 'desc' ? 'asc' : 'desc' }))

  const nActive = activeFilterCount(filter)
  const sortLabel = `${sort.key.replace(/_/g, ' ')} ${sort.dir === 'desc' ? '↓' : '↑'}`
  const reset = () => setFilter(EMPTY_FILTER)

  // §17.1: the wide table is the page; the model store only adds a column.
  const pageState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(wideQ)
  const ivMissing = modelQ.isError && !modelQ.data
  const saved = screensQ.data

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the mart's eval date as the stamp, the
          saved count as meta, Save and Reset as the head's two actions. */}
      <PageHead
        title={METHOD_TITLE}
        info={METHOD_INFO}
        tabs={head.tabs}
        tab={head.tab}
        onTab={head.onTab}
        stamp={
          <AsofTag
            asof={wideQ.data?.evalDate ?? null}
            judgedBy="Research"
            href="/research/signal-health"
          />
        }
        meta={
          saved && saved.count > 0 ? (
            <span title={saved.screens.map((sc) => sc.name).join(' · ')}>
              {saved.count} saved · latest {saved.screens[0]?.name}
            </span>
          ) : undefined
        }
        actions={
          <>
            {saveScreen.isError ? (
              <span className="max-w-[18rem] truncate text-dense-meta text-destructive" title={(saveScreen.error as Error).message}>
                {(saveScreen.error as Error).message.slice(0, 120)}
              </span>
            ) : null}
            {saveOpen ? (
              <>
                <Input
                  autoFocus
                  value={screenName}
                  onChange={(e) => setScreenName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && screenName.trim() && !saveScreen.isPending) saveScreen.mutate()
                    if (e.key === 'Escape') setSaveOpen(false)
                  }}
                  placeholder="Screen name"
                  aria-label="Screen name"
                  className="h-7 w-44"
                />
                <PageHeadAction
                  primary
                  disabled={!screenName.trim() || saveScreen.isPending}
                  onClick={() => saveScreen.mutate()}
                  title="Writes research.saved_screen — Trade's result face renders the same object read-only."
                >
                  {saveScreen.isPending ? 'Saving…' : 'Save'}
                </PageHeadAction>
                <PageHeadAction onClick={() => setSaveOpen(false)} title="Close without saving">
                  Cancel
                </PageHeadAction>
              </>
            ) : (
              <PageHeadAction
                primary
                onClick={() => setSaveOpen(true)}
                title="Save the current filters as one screen with one id (research.saved_screen, 0.107.0)."
              >
                Save as screen
              </PageHeadAction>
            )}
            <PageHeadAction disabled={nActive === 0} onClick={reset} title="Clear every filter in the vocabulary">
              Reset filters
            </PageHeadAction>
          </>
        }
      />

      <div data-sr-toolbar="">
        <PageFaceSwitch path={METHOD_PATH} />
        <span data-sr-tb="sep" />
        {/* The prototype's own pastel violet, as Backtest's lab mark. */}
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mat-tag font-mono text-dense-micro font-semibold tracking-[0.05em] text-[var(--sk-series-violet)]"
          title="Method face — how the number is made. Analysis only; no order can be placed from here."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span data-sr-tb="meta" className={mono}>
          dw_stock.mart_sepa_screener_wide
          {wideQ.data?.evalDate ? ` · eval ${wideQ.data.evalDate}` : ''}
          {wideQ.data ? ` · ${wideQ.data.count.toLocaleString()} evaluated` : ''}
        </span>
        <Link
          to="/research/stocks"
          title="The reading face — what the market says. Same subject, same endpoint."
          className="ml-auto whitespace-nowrap font-mono text-dense-meta text-primary hover:underline"
        >
          open result face in trade →
        </Link>
      </div>

      {pageState === 'stale' ? (
        <ViewState
          kind="stale"
          title="Couldn’t refresh the wide table"
          detail={staleDetail(wideQ, 'a newer evaluation may be missing.')}
          onAction={() => void wideQ.refetch()}
        />
      ) : null}
      {pageState !== 'loading' && pageState !== 'failed' && ivMissing ? (
        <ViewState
          kind="stale"
          layout="strip"
          title="Couldn’t read the IV percentiles"
          detail="The IV pct column is unread — a dash there is not a name without one."
          onAction={() => void modelQ.refetch()}
        />
      ) : null}

      {pageState === 'loading' ? (
        <section className="overflow-hidden mat-card">
          <ViewState kind="loading" title="Loading the universe" rows={10} cols={8} />
        </section>
      ) : pageState === 'failed' ? (
        <section className="overflow-hidden mat-card">
          <ViewState
            kind="failed"
            title="Couldn’t load the wide table"
            detail={failedDetail(wideQ, 'No name was screened — this is not a screen nothing passes.')}
            onAction={() => void wideQ.refetch()}
          />
        </section>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <aside className={cn(panel, 'flex max-w-[24rem] flex-[1_1_15rem] flex-col')} aria-label="Filter vocabulary">
            <header className={panelHead}>
              <span className={cap}>Filter vocabulary</span>
              <span className={cn(mono, 'ml-auto text-dense-caption text-muted-foreground')}>
                {nActive ? `${nActive} active` : 'none active'}
              </span>
            </header>
            <div className="flex flex-col gap-3 px-3 py-2.5">
              <Input
                value={filter.q}
                onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
                placeholder="Symbol or company"
                aria-label="Symbol or company"
                className="h-7"
              />
              <div className="flex flex-col gap-1.5">
                <span className={cap}>Path</span>
                <div className="flex flex-wrap gap-1">
                  {PATHS.map((p) => (
                    <FilterChip
                      key={p}
                      className="font-mono"
                      pressed={filter.paths.includes(p)}
                      onPressedChange={() => toggleIn('paths', p)}
                    >
                      {p}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={cap}>Grade</span>
                <div className="flex flex-wrap gap-1">
                  {GRADES.map((g) => (
                    <FilterChip
                      key={g}
                      className="font-mono"
                      pressed={filter.grades.includes(g)}
                      onPressedChange={() => toggleIn('grades', g)}
                    >
                      {g}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className={cap}>Min composite</span>
                  <span className={cn(mono, 'text-dense-caption text-primary')}>
                    {filter.minScore}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={filter.minScore}
                  onChange={(e) => setFilter((f) => ({ ...f, minScore: Number(e.target.value) }))}
                  className="m-0 h-3.5 w-full accent-[var(--sk-accent)]"
                  aria-label="Minimum composite"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className={cap}>Trend template · 11</span>
                  <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                    {filter.tech.length} required
                  </span>
                </div>
                {TECH_CONDS.map(([key, label], i) => (
                  <CondCheck
                    key={key}
                    label={label}
                    pct={techPcts[i]}
                    on={filter.tech.includes(key)}
                    onToggle={() => toggleIn('tech', key)}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className={cap}>Fundamentals · 8</span>
                  <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                    {filter.fund.length} required
                  </span>
                </div>
                {FUND_CONDS.map(([key, label], i) => (
                  <CondCheck
                    key={key}
                    label={label}
                    pct={fundPcts[i]}
                    on={filter.fund.includes(key)}
                    onToggle={() => toggleIn('fund', key)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-[999_1_36rem] flex-col gap-3">
            <div className={panel}>
              <header className={panelHead}>
                <span className="text-dense-body font-semibold">
                  {passing.length.toLocaleString()} pass
                </span>
                <span className="text-dense-meta text-muted-foreground">
                  of {all.length.toLocaleString()} evaluated · sorted by {sortLabel}
                  {passing.length > RENDER_CAP ? ` · top ${RENDER_CAP} drawn` : ''}
                </span>
                <span className="ml-auto">
                  <DenseTag size="cell" variant="neutral">
                    read-only in Trade
                  </DenseTag>
                </span>
              </header>
              {rows.length === 0 ? (
                nActive > 0 ? (
                  <ViewState
                    kind="filtered"
                    title="Nothing passes this combination"
                    detail={`Active filters: ${filterSummary(filter)}`}
                    actionTitle="Search · path · grade · composite · trend and fundamental conditions all cleared"
                    onAction={reset}
                  />
                ) : (
                  <ViewState
                    kind="empty"
                    title="The wide table holds no evaluated name"
                    detail="dw_stock.mart_sepa_screener_wide answered with no rows — the nightly dbt run writes it."
                  />
                )
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr>
                        <th className={cn(th, 'text-left')}>#</th>
                        <SortTh label="Symbol" k="symbol" sort={sort} onSort={onSort} num={false} />
                        <SortTh label="Grade" k="grade" sort={sort} onSort={onSort} num={false} />
                        <th className={cn(th, 'text-left')}>Path</th>
                        <th className={cn(th, 'text-left')}>Stage</th>
                        <SortTh label="Composite" k="composite_score" sort={sort} onSort={onSort} />
                        <SortTh label="Tech /11" k="tech_pass_count" sort={sort} onSort={onSort} />
                        <SortTh label="Fund /8" k="fund_pass_count" sort={sort} onSort={onSort} />
                        <SortTh label="CRS" k="crs_percentile" sort={sort} onSort={onSort} />
                        <SortTh label="252d" k="return_252d" sort={sort} onSort={onSort} />
                        <SortTh label="vs SMA50" k="vs_sma50" sort={sort} onSort={onSort} />
                        <SortTh label="IV pct" k="iv_percentile" sort={sort} onSort={onSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const grade = gradeOf(r.composite_score)
                        const path = pathOf(r.composite_score, r.tech_pass_count)
                        const vs = vsSma50(r)
                        const iv = ivOf(r.symbol)
                        return (
                          <tr key={r.symbol}>
                            <td className={cn(td, 'text-left text-muted-foreground')}>
                              {r.overall_rank}
                            </td>
                            <td className={cn(td, 'text-left')}>
                              <span className="flex min-w-0 flex-col">
                                <span className="flex items-baseline gap-2">
                                  {/* §14.4: a bare ticker wears the ticker ink — the
                                      prototype's accent here is its link colour. */}
                                  <Link
                                    to={withSymbolParam(SYMBOL_PATH, r.symbol)}
                                    className={cn(
                                      mono,
                                      'text-dense-body font-bold text-entity-symbol hover:underline'
                                    )}
                                  >
                                    {r.symbol}
                                  </Link>
                                  <span className="overflow-hidden text-ellipsis font-sans text-dense-caption text-muted-foreground">
                                    {r.company_name ?? ''}
                                  </span>
                                </span>
                                <span className="mt-1 flex items-center gap-1.5">
                                  <span className="flex gap-0.5">{condDots(r, TECH_CONDS)}</span>
                                  <span className="h-1.5 w-px bg-border" />
                                  <span className="flex gap-0.5">{condDots(r, FUND_CONDS)}</span>
                                </span>
                              </span>
                            </td>
                            <td className={cn(td, 'text-left')}>
                              {/* A grade is a state (§14.7): the top two read the
                                  state green, D amber — not the contract sky. */}
                              <DenseTag
                                size="cell"
                                variant={
                                  grade === 'A+' || grade === 'A'
                                    ? 'state-green'
                                    : grade === 'D'
                                      ? 'warning'
                                      : 'neutral'
                                }
                              >
                                {grade}
                              </DenseTag>
                            </td>
                            <td
                              className={cn(
                                td,
                                'text-left text-dense-caption',
                                path === 'PIVOT'
                                  ? 'text-primary'
                                  : path === 'AVOID'
                                    ? 'text-muted-foreground'
                                    : 'text-foreground'
                              )}
                            >
                              {path}
                            </td>
                            <td className={cn(td, 'text-left text-dense-caption text-muted-foreground')}>
                              {stageOf(r.composite_score, r.tech_pass_count)}
                            </td>
                            <td className={cn(td, 'text-dense-body font-semibold')}>
                              {Math.round(r.composite_score * 100)}
                            </td>
                            <td
                              className={cn(
                                td,
                                r.tech_pass_count >= 8 ? 'text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              {r.tech_pass_count}
                            </td>
                            <td
                              className={cn(
                                td,
                                r.fund_pass_count >= 6 ? 'text-foreground' : 'text-muted-foreground'
                              )}
                            >
                              {r.fund_pass_count}
                            </td>
                            <td className={td}>
                              {r.crs_percentile != null ? Math.round(r.crs_percentile) : '—'}
                            </td>
                            <td className={cn(td, pnlColorClass(r.return_252d))}>
                              {r.return_252d != null
                                ? `${r.return_252d >= 0 ? '+' : '−'}${Math.abs(r.return_252d * 100).toFixed(0)}%`
                                : '—'}
                            </td>
                            <td className={cn(td, pnlColorClass(vs))}>
                              {vs != null
                                ? `${vs >= 0 ? '+' : '−'}${Math.abs(vs * 100).toFixed(1)}%`
                                : '—'}
                            </td>
                            <td
                              className={cn(td, 'text-muted-foreground')}
                              title={
                                iv == null
                                  ? ivMissing
                                    ? 'The model store did not answer — this column is unread.'
                                    : 'The model store carries a committed IV percentile only for names whose option chain is collected, and serves its top 1000 by score — this name is outside one or the other.'
                                  : undefined
                              }
                            >
                              {iv != null ? Math.round(iv) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                Grade · stage · path are the dbt case rules in mart_sepa_feature_daily (composite ≥
                .85 A+ · ≥ .75 A · ≥ .60 B · ≥ .45 C), re-applied at read over the wide table and
                verified against the model store. Pass dots: trend template left, fundamentals
                right — every dot reads the mart&rsquo;s own condition column. Condition
                percentages in the vocabulary are the share of the evaluated universe passing.
              </p>
            </div>
            <div className="flex">
              <AskCopilotButton
                originPage="lab-screener"
                originLabel="Screener · authoring"
                snapshot={compactSnapshot({
                  filters: filterSummary(filter),
                  pass: passing.length,
                  evaluated: all.length,
                  sort: sortLabel,
                  top: rows.slice(0, 8).map((r) => r.symbol),
                })}
                suggestedPrompt="Which conditions are doing the real filtering in this screen, and which are redundant on today's universe?"
              />
            </div>
          </section>
        </div>
      )}
    </PageShell>
  )
}
