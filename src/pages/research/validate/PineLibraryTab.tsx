/**
 * Backtest › Pine library tab (W6) — the scripts Research runs every day, their
 * signal counts, and a place to paste a new one, try it on a symbol and save it.
 *
 * Built-in scripts are Bifrost's own implementations and are edited in the
 * repository; a pasted community or user script is stored only in Research's
 * database (the repositories are public). Each script must plot a series
 * titled `buy` and/or `sell`.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Play, Save } from 'lucide-react'
import { ViewState } from '@bifrost/ui'
import { SectionHead } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  SegmentControl,
  denseTableNumCell,
} from '@/components/data-display'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import {
  checkPineScript,
  fetchPineScripts,
  savePineScript,
  type PineScriptRow,
} from '@/api/research/pine'

const SCRIPTS_KEY = ['research-engine', 'pine', 'scripts', 'with-source'] as const

const TEMPLATE = `//@version=5
indicator("My signal", overlay=true)
fast = ta.ema(close, 20)
slow = ta.ema(close, 50)
plotshape(ta.crossover(fast, slow), "buy", shape.triangleup, location.belowbar)
plotshape(ta.crossunder(fast, slow), "sell", shape.triangledown, location.abovebar)
`

interface Draft {
  id: string
  name: string
  source: string
  origin: 'community' | 'user'
  license: string
  source_url: string
  notes: string
  is_active: boolean
}

const EMPTY: Draft = {
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

export function PineLibraryTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: SCRIPTS_KEY, queryFn: () => fetchPineScripts(true), staleTime: 60_000 })
  const scripts = q.data?.scripts ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [checkSym, setCheckSym] = useState('SPY')

  const view = scripts.find((s) => s.id === selected) ?? null

  const check = useMutation({ mutationFn: checkPineScript })
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
      qc.invalidateQueries({ queryKey: ['research-engine', 'pine'] })
      setDraft(null)
      setSelected(row.id)
    },
  })

  const edit = (s: PineScriptRow, asCopy: boolean) => {
    check.reset()
    save.reset()
    setDraft({
      id: asCopy ? `${s.id}_copy` : s.id,
      name: asCopy ? `${s.name} (copy)` : s.name,
      source: s.source ?? '',
      origin: s.origin === 'community' ? 'community' : 'user',
      license: asCopy && s.origin === 'bifrost' ? '' : (s.license ?? ''),
      source_url: s.source_url ?? '',
      notes: s.notes ?? '',
      is_active: s.is_active,
    })
  }

  const source = draft?.source ?? view?.source ?? ''

  return (
    <div className="space-y-3">
      <SectionHead note="Run every day; their buy and sell sessions feed the Screener, the Symbol chart, the Simulator's entry and Signal Decay's win rates. Built-ins are Bifrost's own implementations of public rules; pasted scripts stay in Research's database, never in the repositories.">
        Pine scripts
      </SectionHead>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            check.reset()
            save.reset()
            setSelected(null)
            setDraft({ ...EMPTY })
          }}
        >
          ＋ New script
        </Button>
      </div>
      <Card variant="elevated">
        <CardContent className="px-0 py-0">
          {q.isLoading ? (
            <ViewState kind="loading" title="Loading the library" rows={6} cols={6} />
          ) : firstResearchAuthGapError(q.error) ? (
            <ResearchAuthGap error={q.error} onRetry={() => void q.refetch()} className="p-2" />
          ) : q.isError ? (
            <ViewState
              kind="failed"
              title="Couldn’t load the library"
              detail={`Research may not have the Pine tables yet (0.173.0). ${errText(q.error)}`}
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
              <DenseDataTable>
                <DenseTableHeader>
                  <DenseTableHeadRow>
                    <DenseTableHead>Script</DenseTableHead>
                    <DenseTableHead>Origin · licence</DenseTableHead>
                    <DenseTableHead className="text-right">v</DenseTableHead>
                    <DenseTableHead className="text-right">Buy</DenseTableHead>
                    <DenseTableHead className="text-right">Sell</DenseTableHead>
                    <DenseTableHead>Last signal</DenseTableHead>
                    <DenseTableHead />
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {scripts.map((s) => (
                    <DenseTableRow
                      key={s.id}
                      data-selected={s.id === selected ? 'true' : undefined}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelected(s.id)
                        setDraft(null)
                        check.reset()
                      }}
                    >
                      <DenseTableCell className="font-medium">
                        {s.name}
                        <span className="ml-1.5 font-mono text-dense-micro text-muted-foreground">{s.id}</span>
                        {!s.is_active ? (
                          <DenseTag size="cell" variant="neutral" className="ml-1.5">
                            off
                          </DenseTag>
                        ) : null}
                      </DenseTableCell>
                      <DenseTableCell className="text-dense-caption text-muted-foreground">
                        {s.origin}
                        {s.license ? ` · ${s.license}` : ''}
                      </DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>{s.version}</DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>{s.buy_signals ?? 0}</DenseTableCell>
                      <DenseTableCell className={denseTableNumCell}>{s.sell_signals ?? 0}</DenseTableCell>
                      <DenseTableCell className="font-mono text-dense-caption">{s.last_signal ?? '—'}</DenseTableCell>
                      <DenseTableCell className="text-right">
                        <button
                          type="button"
                          className="text-dense-caption text-[var(--sk-accent)] hover:underline"
                          onClick={(e) => {
                            e.stopPropagation()
                            edit(s, s.origin === 'bifrost')
                          }}
                        >
                          {s.origin === 'bifrost' ? 'Copy' : 'Edit'}
                        </button>
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseDataTable>
            </div>
          )}
        </CardContent>
      </Card>

      {draft || view ? (
        <>
          <SectionHead note={draft ? 'Must plot "buy" and/or "sell". request.* calls are not supported.' : undefined}>
            {draft ? (draft.id && scripts.some((s) => s.id === draft.id) ? `Edit ${draft.id}` : 'New script') : view?.name}
          </SectionHead>
          <Card variant="elevated">
            <CardContent className="space-y-3 px-3 py-3">
              {draft ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[12rem_1fr_10rem]">
                  <div className="space-y-1">
                    <Label htmlFor="pine-id" className="text-dense-meta font-semibold text-muted-foreground">
                      Id (a–z, 0–9, _)
                    </Label>
                    <Input
                      id="pine-id"
                      value={draft.id}
                      onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase() })}
                      className="h-8 font-mono text-dense-body"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pine-name" className="text-dense-meta font-semibold text-muted-foreground">
                      Name
                    </Label>
                    <Input
                      id="pine-name"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="h-8 text-dense-body"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-dense-meta font-semibold text-muted-foreground">Origin</Label>
                    <SegmentControl
                      options={[
                        { value: 'user', label: 'Mine' },
                        { value: 'community', label: 'Community' },
                      ]}
                      value={draft.origin}
                      onChange={(v) => setDraft({ ...draft, origin: v as Draft['origin'] })}
                    />
                  </div>
                  {draft.origin === 'community' ? (
                    <>
                      <div className="space-y-1">
                        <Label htmlFor="pine-license" className="text-dense-meta font-semibold text-muted-foreground">
                          Licence
                        </Label>
                        <Input
                          id="pine-license"
                          value={draft.license}
                          placeholder="MPL-2.0"
                          onChange={(e) => setDraft({ ...draft, license: e.target.value })}
                          className="h-8 text-dense-body"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label htmlFor="pine-url" className="text-dense-meta font-semibold text-muted-foreground">
                          Source URL
                        </Label>
                        <Input
                          id="pine-url"
                          value={draft.source_url}
                          placeholder="https://www.tradingview.com/script/…"
                          onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
                          className="h-8 text-dense-body"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}

              <textarea
                aria-label="Pine source"
                value={source}
                readOnly={!draft}
                onChange={(e) => draft && setDraft({ ...draft, source: e.target.value })}
                spellCheck={false}
                className={cn(
                  'block h-72 w-full resize-y rounded-md border border-border bg-[var(--sk-surface,transparent)] p-2 font-mono text-dense-caption leading-5',
                  !draft && 'text-muted-foreground'
                )}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Symbol to try"
                  value={checkSym}
                  onChange={(e) => setCheckSym(e.target.value.toUpperCase())}
                  className="h-8 w-24 font-mono text-dense-body"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!source.trim() || !checkSym || check.isPending}
                  onClick={() => check.mutate({ source, symbol: checkSym })}
                >
                  <Play className="h-3.5 w-3.5" />
                  {check.isPending ? 'Running…' : 'Try on two years'}
                </Button>
                {draft ? (
                  <>
                    <label className="flex items-center gap-1.5 text-dense-caption">
                      <input
                        type="checkbox"
                        checked={draft.is_active}
                        onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                      />
                      Run daily
                    </label>
                    <Button
                      size="sm"
                      disabled={!draft.id || !draft.name || save.isPending}
                      onClick={() => save.mutate(draft)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      {save.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                      Cancel
                    </Button>
                  </>
                ) : null}
                <span className="text-dense-caption text-muted-foreground">
                  Signals land in Screener, charts and backtests after the next daily build.
                </span>
              </div>

              {save.isError ? (
                firstResearchAuthGapError(save.error) ? (
                  <ResearchAuthGap error={save.error} layout="banner" />
                ) : (
                  <ViewState kind="failed" layout="strip" title="Not saved" detail={errText(save.error)} />
                )
              ) : null}
              {check.isError ? (
                <ViewState kind="failed" layout="strip" title="The script did not run" detail={errText(check.error)} />
              ) : null}
              {check.data ? (
                <div className="space-y-1">
                  <div className="text-dense-caption text-muted-foreground">
                    {check.data.symbol} · {check.data.bars} sessions ·{' '}
                    {check.data.marks.filter((m) => m.side === 'buy').length} buy ·{' '}
                    {check.data.marks.filter((m) => m.side === 'sell').length} sell ·{' '}
                    <Link to={withSymbolParam(SYMBOL_PATH, check.data.symbol)} className="hover:underline">
                      open the symbol
                    </Link>
                  </div>
                  <div className="flex max-h-40 flex-wrap gap-1 overflow-auto">
                    {check.data.marks
                      .slice()
                      .reverse()
                      .map((m) => (
                        <DenseTag key={`${m.date}-${m.side}`} size="cell" variant={m.side === 'buy' ? 'success' : 'danger'}>
                          {m.date} {m.side === 'buy' ? '↑' : '↓'} {m.close != null ? m.close.toFixed(2) : ''}
                        </DenseTag>
                      ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
