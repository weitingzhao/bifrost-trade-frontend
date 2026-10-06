/**
 * Backtest › Pine library tab (W6; design Rev .158 B5, `?tab=pine&script=<id>`)
 * — the scripts Research runs in the 22:30 ET trading-day batch, their signal
 * counts, and an editor: the source with line numbers on the left (built-ins
 * read-only, `Copy to my scripts`), the metadata and a Check on the right.
 * Check is a dry run on one symbol drawn as a 60-session candle chart with the
 * script's ▲ / ▼ on it; nothing is saved.
 *
 * Built-in scripts are Bifrost's own implementations and are edited in the
 * repository (Research refuses a save over one, 409); a pasted community or
 * user script is stored only in Research's database (the repositories are
 * public). Each script must plot a series titled `buy` and/or `sell`. The
 * library is one: saving or switching a script off shows up on the Screener,
 * the Symbol chart, the Simulator and Signal Decay at once.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FilterChip, ViewState } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DenseTag, SegmentControl } from '@/components/data-display'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { cap, mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { useResearchAuth } from '@/lib/auth/researchUser'
import { pineChartSignalOf, withChartSignal, withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { fetchIndicatorSeries } from '@/api/research/indicators'
import {
  PINE_SCRIPT_ID,
  checkPineScript,
  fetchPineScripts,
  savePineScript,
  type PineScriptRow,
} from '@/api/research/pine'
import { PineCheckChart } from './PineCheckChart'

const TEMPLATE = `//@version=5
indicator("My signal", overlay=true)
fast = ta.ema(close, 20)
slow = ta.ema(close, 50)
plotshape(ta.crossover(fast, slow), "buy", shape.triangleup, location.belowbar)
plotshape(ta.crossunder(fast, slow), "sell", shape.triangledown, location.abovebar)
`

const NO_IDENTITY = 'Set user — runs need a Research identity'

const ORIGIN_LABEL: Record<PineScriptRow['origin'], string> = { bifrost: 'bifrost', community: 'community', user: 'mine' }

interface Draft {
  /** The library row this draft edits; null for a new script or a copy. */
  of: string | null
  id: string
  name: string
  source: string
  origin: 'community' | 'user'
  license: string
  source_url: string
  notes: string
  is_active: boolean
}

function draftOf(s: PineScriptRow): Draft {
  return {
    of: s.id,
    id: s.id,
    name: s.name,
    source: s.source ?? '',
    origin: s.origin === 'community' ? 'community' : 'user',
    license: s.license ?? '',
    source_url: s.source_url ?? '',
    notes: s.notes ?? '',
    is_active: s.is_active,
  }
}

function copyOf(s: PineScriptRow): Draft {
  return {
    of: null,
    id: `${s.id}_copy`.slice(0, 48),
    name: `${s.name} (copy)`,
    source: s.source ?? '',
    origin: 'user',
    license: '',
    source_url: '',
    notes: `Copied from ${s.id} v${s.version}.`,
    is_active: true,
  }
}

const NEW_DRAFT: Draft = {
  of: null,
  id: '',
  name: '',
  source: TEMPLATE,
  origin: 'user',
  license: '',
  source_url: '',
  notes: '',
  is_active: true,
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Where a script comes from, as the editor head's second line and the table's License cell. */
function provenance(s: Pick<PineScriptRow, 'origin' | 'license' | 'source_url' | 'last_signal'>): string {
  if (s.origin === 'bifrost') return `bifrost · ${s.license || 'written by Bifrost from the published rule'}`
  if (s.origin === 'community') return `community · ${s.license || 'no license'} · ${s.source_url || 'no source URL'}`
  return `mine · ${s.last_signal ? `last signal ${s.last_signal}` : 'not run yet'}`
}

export function PineLibraryTab({
  selectedId,
  onSelect,
  newScriptTick,
  heldSymbol,
}: {
  /** `?script=` — the row the editor holds; the first script when absent. */
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Bumped by the head's ＋ New script. */
  newScriptTick: number
  heldSymbol: string
}) {
  const qc = useQueryClient()
  const auth = useResearchAuth()
  const q = useQuery({
    queryKey: QUERY_KEYS.researchEngine.pineScriptsWithSource,
    queryFn: () => fetchPineScripts(true),
    staleTime: 60_000,
  })
  const scripts = q.data?.scripts ?? []
  const view = scripts.find((s) => s.id === selectedId) ?? (selectedId ? null : scripts[0] ?? null)

  // The editor holds a draft of the selected row; a new script or a copy is a
  // draft of no row. Selecting another row, or ＋ New script, replaces it.
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const [seenTick, setSeenTick] = useState(newScriptTick)
  const rowKey = view?.id ?? null
  if (newScriptTick !== seenTick) {
    setSeenTick(newScriptTick)
    setDraft({ ...NEW_DRAFT })
    setDraftKey('new')
  } else if (draftKey !== 'new' && draftKey !== rowKey) {
    setDraftKey(rowKey)
    setDraft(view && view.origin !== 'bifrost' ? draftOf(view) : null)
  }

  const [checkSym, setCheckSym] = useState(heldSymbol || 'SPY')
  const check = useMutation({ mutationFn: checkPineScript })
  const checked = check.data ?? null
  const barsQ = useQuery({
    queryKey: ['research-engine', 'indicators', 'series', checked?.symbol ?? '', 'pine-check'],
    queryFn: () => fetchIndicatorSeries({ symbol: checked!.symbol, start: isoDaysAgo(100) }),
    enabled: checked != null,
    staleTime: 10 * 60_000,
  })
  const save = useMutation({
    mutationFn: (d: Draft) =>
      savePineScript(d.id, {
        name: d.name,
        source: d.source,
        origin: d.origin,
        license: d.license || null,
        source_url: d.source_url || null,
        notes: d.notes || null,
        is_active: d.is_active,
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.researchEngine.pine })
      setDraftKey(null)
      onSelect(row.id)
    },
  })

  const editing = draftKey === 'new' ? null : view
  const ro = draft == null
  const source = draft?.source ?? view?.source ?? ''
  const newDraft = draft != null && draft.of == null ? draft : null
  const isNew = newDraft != null
  const idOk = draft == null || PINE_SCRIPT_ID.test(draft.id)
  const idTaken = newDraft != null && scripts.some((s) => s.id === newDraft.id)
  const lineNos = Array.from({ length: Math.max(1, source.split('\n').length) }, (_, i) => i + 1).join('\n')
  const activeN = scripts.filter((s) => s.is_active).length
  const chartSym = (checked?.symbol ?? checkSym).trim().toUpperCase() || 'SPY'

  const runCheck = () => {
    if (!source.trim() || !checkSym.trim()) return
    check.mutate({ source, symbol: checkSym.trim().toUpperCase() })
  }
  const pick = (id: string) => {
    check.reset()
    save.reset()
    setDraftKey(null)
    onSelect(id)
  }

  return (
    <div className="space-y-3">
      <section className={panel}>
        <header className={panelHead}>
          <span className="text-dense-body font-semibold">Pine library</span>
          <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
            {q.data ? `${activeN} active · ${scripts.length} scripts` : '…'}
          </span>
          <span className="ml-auto text-dense-caption text-muted-foreground">
            Run in the 22:30 ET trading-day batch on the whole universe · daily bars · buy / sell only, no order path
          </span>
        </header>
        {q.isLoading ? (
          <ViewState kind="loading" title="Loading the library" rows={8} cols={8} />
        ) : firstResearchAuthGapError(q.error) ? (
          <ResearchAuthGap error={q.error} onRetry={() => void q.refetch()} className="p-2" />
        ) : q.isError ? (
          <ViewState
            kind="failed"
            title="Couldn’t load the library"
            detail={`No script was read — an empty table here would not mean the library is empty. ${errText(q.error)}`}
            onAction={() => void q.refetch()}
          />
        ) : scripts.length === 0 ? (
          <ViewState
            kind="empty"
            title="No scripts yet"
            detail="The daily build seeds the built-ins on its first run; ＋ New script adds your own."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]" data-sr-table="">
              <thead>
                <tr>
                  <th className={cn(th, 'text-left')}>Script</th>
                  <th className={cn(th, 'text-left')}>Origin</th>
                  <th className={cn(th, 'text-left')}>License</th>
                  <th className={th}>v</th>
                  <th className={th}>Buy</th>
                  <th className={th}>Sell</th>
                  <th className={cn(th, 'text-left')}>Last signal</th>
                  <th className={cn(th, 'text-left')}>Active</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {scripts.map((s) => {
                  const on = s.id === (draftKey === 'new' ? null : view?.id)
                  return (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      aria-pressed={on}
                      onClick={() => pick(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          pick(s.id)
                        }
                      }}
                      data-selected={on ? 'true' : undefined}
                      className={cn('cursor-pointer', !s.is_active && 'opacity-60')}
                    >
                      <td className={cn(td, 'text-left')}>
                        <div className="font-sans text-dense-body font-medium">{s.name}</div>
                        <div className={cn(mono, 'text-dense-micro text-muted-foreground')}>{s.id}</div>
                      </td>
                      <td className={cn(td, 'text-left')}>
                        <DenseTag size="cell" variant="neutral">
                          {ORIGIN_LABEL[s.origin] ?? s.origin}
                        </DenseTag>
                      </td>
                      <td
                        className={cn(td, 'max-w-[14rem] truncate text-left font-sans text-dense-caption text-muted-foreground')}
                        title={s.source_url ?? s.license ?? undefined}
                      >
                        {s.license ?? '—'}
                      </td>
                      <td className={td}>{s.version}</td>
                      <td className={td}>{s.buy_signals ? s.buy_signals.toLocaleString('en-US') : '—'}</td>
                      <td className={td}>{s.sell_signals ? s.sell_signals.toLocaleString('en-US') : '—'}</td>
                      <td className={cn(td, 'text-left')}>{s.last_signal ?? '—'}</td>
                      <td className={cn(td, 'text-left font-sans text-dense-caption', s.is_active ? 'text-[var(--sk-soft)]' : 'text-muted-foreground')}>
                        {s.is_active ? 'active' : 'off'}
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        {s.is_active ? (
                          <Link
                            to={withSymbolParam(withChartSignal(SYMBOL_PATH, pineChartSignalOf(s.id)), chartSym)}
                            onClick={(e) => e.stopPropagation()}
                            title={`Open ${chartSym} (the Check symbol) with ${s.name} marked`}
                            className="mat-btn inline-flex h-6 items-center px-2 font-sans text-dense-caption"
                          >
                            Chart ↗
                          </Link>
                        ) : (
                          <span className="font-sans text-dense-caption text-muted-foreground" title="Off — the daily build does not run it, so there are no marks to chart">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {draft || editing ? (
        <section className={panel} aria-label="Script editor">
          <header className={panelHead}>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-baseline gap-2">
                <span className="text-dense-body font-semibold">
                  {newDraft ? newDraft.name || 'New script' : (draft?.name ?? editing?.name)}
                </span>
                <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                  {newDraft ? `${newDraft.id || 'id'} · new` : `${editing?.id} · v${editing?.version}`}
                </span>
              </span>
              <span className="truncate text-dense-caption text-muted-foreground">
                {newDraft
                  ? newDraft.origin === 'community'
                    ? `community · ${newDraft.license || 'no license'} · ${newDraft.source_url || 'no source URL'}`
                    : 'mine · not saved yet'
                  : editing
                    ? provenance(editing)
                    : ''}
              </span>
            </span>
            <span className="ml-auto flex items-center gap-2">
              {ro && editing ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    check.reset()
                    save.reset()
                    setDraft(copyOf(editing))
                    setDraftKey('new')
                  }}
                >
                  Copy to my scripts
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={!auth.token || !source.trim() || !checkSym.trim() || check.isPending}
                title={!auth.token ? NO_IDENTITY : 'A dry run on the Check symbol — nothing is saved'}
                onClick={runCheck}
              >
                {check.isPending ? 'Checking…' : 'Check'}
              </Button>
              {draft ? (
                <Button
                  size="sm"
                  disabled={!auth.token || !draft.id || !draft.name.trim() || !idOk || idTaken || save.isPending}
                  title={
                    !auth.token
                      ? NO_IDENTITY
                      : !idOk
                        ? 'Id: 2–48 of a–z, 0–9, _ starting with a letter'
                        : idTaken
                          ? `${draft.id} is taken — pick another id`
                          : 'Save — the screener, chart, simulator and decay read it from the next build'
                  }
                  onClick={() => save.mutate(draft)}
                >
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              ) : null}
            </span>
          </header>
          {!auth.token ? (
            <p className="m-0 border-b border-border px-3 py-1.5 text-dense-caption text-foreground">{NO_IDENTITY}</p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1">
              <div className="flex items-baseline gap-2">
                <span className={cap}>Source</span>
                <span className="text-dense-caption text-muted-foreground">
                  {ro ? 'built-in · read-only — copy it to change it' : 'plain text · kept in the Research library, never in a public repo'}
                </span>
              </div>
              <div className="flex min-h-[18rem] overflow-hidden rounded-lg bg-foreground/[0.04]">
                <pre
                  aria-hidden
                  className="m-0 select-none overflow-hidden border-r border-border px-2 py-2 text-right font-mono text-dense-caption leading-5 text-muted-foreground"
                >
                  {lineNos}
                </pre>
                <textarea
                  key={draftKey ?? 'none'}
                  aria-label="Pine source"
                  value={source}
                  readOnly={ro}
                  onChange={(e) => draft && setDraft({ ...draft, source: e.target.value })}
                  spellCheck={false}
                  wrap="off"
                  rows={Math.max(14, source.split('\n').length + 1)}
                  className={cn(
                    'block min-w-0 flex-1 resize-y bg-transparent px-2 py-2 font-mono text-dense-caption leading-5 outline-none',
                    ro && 'text-[var(--sk-mute2)]',
                  )}
                />
              </div>
              {draft ? (
                <p className="m-0 text-dense-caption text-muted-foreground">
                  Must plot <span className={mono}>buy</span> and/or <span className={mono}>sell</span>; request.* calls are not supported.
                </p>
              ) : null}
            </div>

            <div className="min-w-0 space-y-3">
              <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-2">
                <div className="space-y-1">
                  <Label htmlFor="pine-id" className="text-dense-meta font-semibold text-muted-foreground">
                    Id
                  </Label>
                  <Input
                    id="pine-id"
                    value={draft?.id ?? editing?.id ?? ''}
                    readOnly={!isNew}
                    onChange={(e) => draft && setDraft({ ...draft, id: e.target.value.toLowerCase() })}
                    className={cn('h-8 font-mono text-dense-body', !idOk && 'ring-1 ring-destructive')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pine-name" className="text-dense-meta font-semibold text-muted-foreground">
                    Name
                  </Label>
                  <Input
                    id="pine-name"
                    value={draft?.name ?? editing?.name ?? ''}
                    readOnly={ro}
                    onChange={(e) => draft && setDraft({ ...draft, name: e.target.value })}
                    className="h-8 text-dense-body"
                  />
                </div>
              </div>
              {draft ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-dense-meta font-semibold text-muted-foreground">Origin</span>
                    <SegmentControl
                      ariaLabel="Origin"
                      size="sm"
                      options={[
                        { value: 'user', label: 'Mine' },
                        { value: 'community', label: 'Community' },
                      ]}
                      value={draft.origin}
                      onChange={(v) => setDraft({ ...draft, origin: v as Draft['origin'] })}
                    />
                  </div>
                  {draft.origin === 'community' ? (
                    <div className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="pine-license" className="text-dense-meta font-semibold text-muted-foreground">
                          License
                        </Label>
                        <Input
                          id="pine-license"
                          value={draft.license}
                          placeholder="MPL-2.0"
                          onChange={(e) => setDraft({ ...draft, license: e.target.value })}
                          className="h-8 text-dense-body"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pine-url" className="text-dense-meta font-semibold text-muted-foreground">
                          Source URL
                        </Label>
                        <Input
                          id="pine-url"
                          value={draft.source_url}
                          placeholder="tradingview.com/script/…"
                          onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
                          className="h-8 text-dense-body"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <Label htmlFor="pine-notes" className="text-dense-meta font-semibold text-muted-foreground">
                      Notes
                    </Label>
                    <Input
                      id="pine-notes"
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      className="h-8 text-dense-body"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-dense-caption text-muted-foreground">
                    <FilterChip
                      pressed={draft.is_active}
                      onPressedChange={(v) => setDraft({ ...draft, is_active: v })}
                      className="h-[22px] px-2 text-dense-meta"
                    >
                      Active
                    </FilterChip>
                    <span>Off = gone from the screener, chart, simulator and decay at once.</span>
                  </div>
                </>
              ) : editing?.notes ? (
                <p className="m-0 text-dense-caption text-muted-foreground">{editing.notes}</p>
              ) : null}

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-baseline gap-2">
                  <span className={cap}>Check</span>
                  <span className="text-dense-caption text-muted-foreground">a dry run on one symbol · nothing is saved</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    aria-label="Check on symbol"
                    value={checkSym}
                    onChange={(e) => setCheckSym(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && auth.token) runCheck()
                    }}
                    className="h-8 w-24 font-mono text-dense-body"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!auth.token || !source.trim() || !checkSym.trim() || check.isPending}
                    title={!auth.token ? NO_IDENTITY : undefined}
                    onClick={runCheck}
                  >
                    {check.isPending ? 'Checking…' : 'Check'}
                  </Button>
                  {checked ? (
                    <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
                      {checked.bars} bars · {checked.marks.length} marks ·{' '}
                      {(barsQ.data?.bars ?? []).length
                        ? `${checked.marks.filter((m) => m.date >= (barsQ.data!.bars.slice(-60)[0]?.date ?? '')).length} in the last 60`
                        : '…'}
                    </span>
                  ) : null}
                </div>
                {check.isError ? (
                  firstResearchAuthGapError(check.error) ? (
                    <ResearchAuthGap error={check.error} layout="banner" />
                  ) : (
                    <ViewState kind="failed" layout="strip" title="The script did not run" detail={errText(check.error)} />
                  )
                ) : null}
                {checked ? (
                  <>
                    {barsQ.isError ? (
                      <p className="m-0 text-dense-caption text-muted-foreground">
                        The candles for {checked.symbol} did not load; the marks are listed below.
                      </p>
                    ) : (
                      <PineCheckChart bars={barsQ.data?.bars ?? []} marks={checked.marks} />
                    )}
                    <div className="flex max-h-24 flex-wrap gap-x-3 gap-y-0.5 overflow-auto">
                      {checked.marks
                        .slice()
                        .reverse()
                        .slice(0, 40)
                        .map((m) => (
                          <span key={`${m.date}-${m.side}`} className={cn(mono, 'text-dense-caption')}>
                            {m.side === 'buy' ? '▲' : '▼'} {m.date}
                          </span>
                        ))}
                    </div>
                    {editing?.is_active ? (
                      <Link
                        to={withSymbolParam(withChartSignal(SYMBOL_PATH, pineChartSignalOf(editing.id)), checked.symbol)}
                        className="mat-btn inline-flex h-7 items-center px-2.5 text-dense-label"
                      >
                        Open {checked.symbol} in Symbol ↗
                      </Link>
                    ) : (
                      <Link
                        to={withSymbolParam(SYMBOL_PATH, checked.symbol)}
                        title="Not in the daily build yet — Symbol cannot mark an unsaved or inactive script"
                        className="mat-btn inline-flex h-7 items-center px-2.5 text-dense-label"
                      >
                        Open {checked.symbol} in Symbol ↗
                      </Link>
                    )}
                  </>
                ) : null}
              </div>
              {save.isError ? (
                firstResearchAuthGapError(save.error) ? (
                  <ResearchAuthGap error={save.error} layout="banner" />
                ) : (
                  <ViewState kind="failed" layout="strip" title="Not saved" detail={errText(save.error)} />
                )
              ) : null}
            </div>
          </div>
        </section>
      ) : selectedId && q.data ? (
        <section className={panel}>
          <ViewState
            kind="empty"
            title={`No script ${selectedId}`}
            detail="The library has no script by that id — it may have been renamed. Pick one above."
          />
        </section>
      ) : null}
    </div>
  )
}
