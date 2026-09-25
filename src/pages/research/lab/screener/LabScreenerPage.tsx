/**
 * Symbol Screener · authoring — the Method face of Stock screen (design
 * `Research Stock Screen Method.dc.html`, route rev 2026-09-20.4).
 *
 * Build and tune a screen against the SEPA wide table. The filter vocabulary
 * is defined here and nowhere else: the 19 condition columns of
 * `dw_stock.mart_sepa_screener_wide`, read whole (one row per evaluated
 * symbol, every boolean by name) and filtered client-side. Grade, stage and
 * path are the dbt case rules re-applied at read — verified on DEV against
 * the model store before this page was built.
 *
 * Saved screens (one object, one id, read-only in Trade) wait on the
 * Research-side store — the save button says so rather than pretending.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button, EmptyState, Input } from '@bifrost/ui'
import { DenseTag } from '@/components/data-display'
import { fetchSepaScreenerWide, type SepaWideRow } from '@/api/research/sepaScreenerWide'
import { createSavedScreen, fetchSavedScreens } from '@/api/research/savedScreens'
import { fetchSepaDaily } from '@/api/researchEngine'
import { PageFaceSwitch, PageHeader, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
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
} from './labScreenerModel'

/** The universe is thousands of rows; the table draws this many under the sort. */
const RENDER_CAP = 200

const chipBase =
  'cursor-pointer rounded border px-1.75 py-0.75 font-mono text-dense-micro transition-colors'
const chipOff = 'border-border bg-transparent text-muted-foreground hover:text-foreground'
const chipOn =
  'border-[color-mix(in_oklab,var(--sk-accent)_40%,transparent)] bg-[color-mix(in_oklab,var(--sk-accent)_12%,transparent)] text-[var(--sk-accent)]'

function FilterChip({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={cn(chipBase, on ? chipOn : chipOff)}>
      {label}
    </button>
  )
}

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
    <th className={cn(th, !num && 'text-left')}>
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

export default function LabScreenerPage() {
  const [filter, setFilter] = useState<ScreenFilter>(EMPTY_FILTER)
  // ── Saved screens (6A · research 0.107.0): one object, one id ──
  const qc = useQueryClient()
  const [saveOpen, setSaveOpen] = useState(false)
  const [screenName, setScreenName] = useState('')
  const screensQ = useQuery({
    queryKey: ['research', 'saved-screens'],
    queryFn: fetchSavedScreens,
    staleTime: 60_000,
  })
  const saveScreen = useMutation({
    mutationFn: () =>
      createSavedScreen({
        name: screenName.trim(),
        origin_page: '/research/lab/screener',
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
      void qc.invalidateQueries({ queryKey: ['research', 'saved-screens'] })
    },
  })
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'composite_score',
    dir: 'desc',
  })

  const wideQ = useQuery({
    queryKey: ['research', 'sepa-screener-wide'],
    queryFn: () => fetchSepaScreenerWide(),
    staleTime: 5 * 60_000,
  })
  // The committed IV percentile lives in the model store, which serves its
  // top 1000 by score — joined by symbol, '—' below the cut.
  const modelQ = useQuery({
    queryKey: ['research', 'sepa-model-daily', 'iv-join'],
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

  return (
    <PageShell padding="compact" className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 max-w-[84ch] flex-[1_1_26rem]">
          <PageHeader
            breadcrumb={<p className="text-xs font-medium text-primary/90">Research / Discover</p>}
            title="Symbol Screener · authoring"
            titleSize="large"
            description="Build and tune a screen against the SEPA wide table. Saved screens are one object with one id — Trade's result face renders the same screen read-only, so the filter vocabulary is defined here and nowhere else."
          />
        </div>
        <div className="pt-1.5">
          <PageFaceSwitch path="/research/lab/screener" />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {saveOpen ? (
            <span className="inline-flex items-center gap-1.5">
              <Input
                autoFocus
                value={screenName}
                onChange={(e) => setScreenName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && screenName.trim() && !saveScreen.isPending) saveScreen.mutate()
                  if (e.key === 'Escape') setSaveOpen(false)
                }}
                placeholder="Screen name"
                className="h-8 w-44"
              />
              <Button
                type="button"
                size="sm"
                disabled={!screenName.trim() || saveScreen.isPending}
                onClick={() => saveScreen.mutate()}
                title="Writes research.saved_screen — Trade's result face renders the same object read-only."
              >
                {saveScreen.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setSaveOpen(true)}
              title="Save the current filters as one screen with one id (research.saved_screen, 0.107.0)."
            >
              Save as screen
            </Button>
          )}
          {saveScreen.isError ? (
            <span className="text-dense-caption text-destructive">
              {(saveScreen.error as Error).message.slice(0, 120)}
            </span>
          ) : screensQ.data && screensQ.data.count > 0 ? (
            <span
              className="text-dense-caption text-muted-foreground"
              title={screensQ.data.screens.map((sc) => sc.name).join(' · ')}
            >
              {screensQ.data.count} saved · latest {screensQ.data.screens[0]?.name}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={nActive === 0}
            onClick={() => setFilter(EMPTY_FILTER)}
          >
            Reset filters
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border px-3 py-1.75 mat-card">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 border py-0.5 font-mono text-dense-caption tracking-[0.05em] text-[var(--sk-accent)] mat-tag'
          )}
          title="Method face — how the number is made. Analysis only; no order can be placed from here (D10)."
        >
          ◆ METHOD · NO ORDERS
        </span>
        <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
          dw_stock.mart_sepa_screener_wide
          {wideQ.data?.evalDate ? ` · eval ${wideQ.data.evalDate}` : ''}
          {wideQ.data ? ` · ${wideQ.data.count.toLocaleString()} evaluated` : ''}
        </span>
        <Link
          to="/research/screener"
          title="The reading face — what the market says. Same subject, same endpoint."
          className="ml-auto whitespace-nowrap font-mono text-dense-meta text-primary hover:underline"
        >
          open result face in trade →
        </Link>
      </div>

      {wideQ.isLoading ? (
        <p className="p-3 text-dense-meta text-muted-foreground">Reading the universe…</p>
      ) : wideQ.isError ? (
        <p className="p-3 text-dense-meta text-destructive">
          The wide table did not answer: {(wideQ.error as Error).message}
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <aside className={cn(panel, 'flex max-w-[24rem] flex-[1_1_15rem] flex-col')}>
            <header className={panelHead}>
              <span className={cap}>filter vocabulary</span>
              <span className={cn(mono, 'ml-auto text-dense-micro text-muted-foreground')}>
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
                <span className={cap}>path</span>
                <div className="flex flex-wrap gap-1">
                  {PATHS.map((p) => (
                    <FilterChip
                      key={p}
                      label={p}
                      on={filter.paths.includes(p)}
                      onToggle={() => toggleIn('paths', p)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className={cap}>grade</span>
                <div className="flex flex-wrap gap-1">
                  {GRADES.map((g) => (
                    <FilterChip
                      key={g}
                      label={g}
                      on={filter.grades.includes(g)}
                      onToggle={() => toggleIn('grades', g)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between">
                  <span className={cap}>min composite</span>
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
                  <span className={cap}>trend template · 11</span>
                  <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
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
                  <span className={cap}>fundamentals · 8</span>
                  <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
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
                <span className="text-dense-caption text-muted-foreground">
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
                <div className="p-3.5">
                  <EmptyState
                    title="Nothing passes this combination"
                    description={`Active filters: ${filterSummary(filter)}`}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse">
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
                          <tr key={r.symbol} className="hover:bg-[color-mix(in_oklab,var(--sk-accent)_5%,transparent)]">
                            <td className={cn(td, 'text-left text-muted-foreground')}>
                              {r.overall_rank}
                            </td>
                            <td className={cn(td, 'text-left')}>
                              <span className="flex min-w-0 flex-col">
                                <span className="flex items-baseline gap-2">
                                  <Link
                                    to={withSymbolParam(SYMBOL_PATH, r.symbol)}
                                    className={cn(
                                      mono,
                                      'text-dense-body font-bold text-[var(--sk-ticker)] hover:underline'
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
                              <DenseTag
                                size="cell"
                                variant={
                                  grade === 'A+' || grade === 'A'
                                    ? 'info'
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
                                'text-left text-dense-micro tracking-[0.06em]',
                                path === 'PIVOT'
                                  ? 'text-primary'
                                  : path === 'AVOID'
                                    ? 'text-muted-foreground'
                                    : 'text-foreground'
                              )}
                            >
                              {path}
                            </td>
                            <td
                              className={cn(
                                td,
                                'text-left text-dense-micro tracking-[0.06em] text-muted-foreground'
                              )}
                            >
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
                                  ? 'The committed IV percentile lives in the model store, which serves its top 1000 by score — below the cut no store carries one.'
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
              <p className="m-0 border-t border-border/60 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
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
