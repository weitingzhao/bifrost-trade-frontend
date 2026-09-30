/**
 * Stock screen — `/research/stocks` (design Rev .121–.130, Owner option A).
 *
 * One page for picking stocks: a universe, a model to order it (or none),
 * and a screen to narrow it. Stock ratings and the old Stock screen read the
 * same SEPA tables twice; their old addresses land here
 * (`/research/ratings/stocks` → Rank by SEPA, `/research/screener` and
 * `/research/explorer` → Rank by None with the old opening criteria).
 *
 * The data and every rule are in `stockScreenModel` / `stockScreenStages`;
 * this file holds state and wiring.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ViewState } from '@bifrost/ui'
import { PageFaceSwitch, PageHead, PageHeadAction, PageShell } from '@/components/layout'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { SegmentControl, type SegmentOption } from '@/components/data-display'
import { fetchSavedScreens, type SavedScreen } from '@/api/research/savedScreens'
import { usePageViewState } from '@/lib/pageView'
import { notify } from '@/lib/shellNotify'
import { publishSymbolTrail } from '@/lib/symbolTrail'
import { composite as volScore, SERVER_WEIGHTS } from '@/lib/research/volRatingsModel'
import { LeadersFace } from './LeadersFace'
import type { LeaderSortKey } from './leadersModel'
import { FlowPanel, type FunnelFocus } from './FlowPanel'
import { MatchCards, type ModelReach } from './MatchCards'
import { RankByPanel, type WeightSet } from './RankByPanel'
import { ResultTable, type Scored, type SortKey } from './ResultTable'
import { SaveScreenAction } from './SaveScreenAction'
import { ScreenPanel } from './ScreenPanel'
import { presetChoices } from './stockScreenView'
import { WhyDrawer } from './WhyDrawer'
import { useStockScreenData } from './useStockScreenData'
import {
  AGREE_IDS,
  AXES,
  EMPTY_SCREEN,
  MODEL_LABEL,
  SEPA_PRESETS,
  conditionCount,
  focusOnVisible,
  funnelsOf,
  inFocus,
  matchRate,
  passesAll,
  rowProbe,
  runStages,
  sepaScoreAt,
  versionDiff,
  visibleAxes,
  type AgreeId,
  type LineageFocus,
  type ModelKey,
  type NameRow,
  type RankModel,
  type ScreenState,
  type ScreenVersion,
} from './stockScreenModel'
import { LEGACY_SCREEN, STAGES } from './stockScreenStages'

type UniverseId = 'all' | 'options' | 'sp500' | 'watch' | 'book'

const UNIVERSE_LABEL: Record<UniverseId, string> = {
  all: 'All evaluated',
  options: 'Option universe',
  sp500: 'S&P 500',
  watch: 'Watchlist',
  book: 'In the book',
}

const UNIVERSE_OPTIONS: SegmentOption[] = [
  { value: 'all', label: 'All evaluated', title: 'Every name a model or the SEPA evaluation covers. The platform lists options for 691 of them, so “all optionable” is the Option universe.' },
  { value: 'options', label: 'Option universe', title: 'research.option_universe — the 691 underlyings the platform lists options for' },
  { value: 'sp500', label: 'S&P 500', disabled: true, title: 'No index membership is held on any side (Trade, Research or the market-data plugin).' },
  { value: 'watch', label: 'Watchlist' },
  { value: 'book', label: 'In the book' },
]

const VIEW_OPTIONS: SegmentOption[] = [
  { value: 'ranked', label: 'Ranked' },
  { value: 'leaders', label: 'Leaders', title: 'Radar across sessions — not constrained by the screen' },
]

const FOOT: Record<RankModel, string> = {
  sepa: 'SEPA and the Trend / Growth stages read the same evaluation table: a name’s Trend 9/11 here is the count the Trend template stage tests. Grade · path are the mart’s cuts at Model weights.',
  radar: 'Radar is its own engine and grades A+ · A · B · C · D. It is not SEPA’s momentum tier. Factor columns are 0–100 sub-scores for the latest session.',
  premium: 'Premium ranks the underlying for selling options, not the company. The same model has its own page, Vol ratings, for one more version.',
  none: 'No model: the screen is a set, A–Z. “Rule” names an active opportunity registered on the name; it does not say its entry conditions are met.',
}

const DEFAULT_W: WeightSet = { sepa: { ...SEPA_PRESETS[0].weights }, premium: { ...SERVER_WEIGHTS } }

function nowZ(): string {
  return `${new Date().toISOString().slice(11, 16)}Z`
}

export default function StockScreenPage() {
  const [params, setParams] = useSearchParams()
  const [model, setModel] = usePageViewState<RankModel>('model', 'sepa')
  const [weights, setWeights] = usePageViewState<WeightSet>('w', DEFAULT_W)
  const [sort, setSort] = usePageViewState<SortKey>('sort', 'score')
  const [dir, setDir] = usePageViewState<-1 | 1>('dir', -1)
  const [universe, setUniverse] = usePageViewState<UniverseId>('universe', 'all')
  const [screen, setScreen] = usePageViewState<ScreenState>('screen', EMPTY_SCREEN)
  const [sel, setSel] = usePageViewState<string | null>('sel', null)
  const [view, setView] = usePageViewState<'ranked' | 'leaders'>('view', 'ranked')
  const [lsort, setLsort] = usePageViewState<LeaderSortKey>('lsort', 'peak')
  const [lsel, setLsel] = usePageViewState<{ symbol: string; date: string } | null>('lsel', null)
  const [flowOpen, setFlowOpen] = usePageViewState('flowOpen', true)
  const [lf, setLf] = usePageViewState<LineageFocus>('lf', {})
  const [ff, setFf] = usePageViewState<FunnelFocus | null>('ff', null)
  const [startId, setStartId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [versions, setVersions] = useState<ScreenVersion[]>([])
  const [cur, setCur] = useState(-1)

  const data = useStockScreenData(screen.on)
  const probe = useMemo(() => rowProbe(data.sets), [data.sets])
  const pf = data.portfolio

  const pool = useMemo(() => {
    const inU = (r: NameRow) =>
      universe === 'options' ? r.prem != null : universe === 'watch' ? pf.isWatchlist(r.sym) : universe === 'book' ? pf.isHolding(r.sym) : true
    return data.rows.filter(inU)
  }, [data.rows, universe, pf])

  const { counts, survivors } = useMemo(() => runStages(pool, STAGES, screen, probe), [pool, screen, probe])
  const base = useMemo(() => pool.filter((r) => passesAll(r, STAGES, screen, probe, 'agree')), [pool, screen, probe])
  const cells = useMemo(() => matchRate(base), [base])
  const funnels = useMemo(() => funnelsOf(pool, base), [pool, base])
  const visible = visibleAxes(screen)
  const picked = AGREE_IDS.map((id, i) => (screen.on[id] ? i : -1)).filter((i) => i >= 0)
  const focus = focusOnVisible(lf, visible)
  const ffStep = ff ? funnels[ff.f]?.steps[ff.st] : undefined
  const nOn = conditionCount(screen)

  // ── Versions (Rev .121 #4): every change is a fork of the one you stand on.
  // The version you stand on reads its set live; a version you leave keeps the
  // set it had when you left it.
  const survivorSyms = useMemo(() => survivors.map((r) => r.sym), [survivors])
  const stamped = useCallback(
    (vs: ScreenVersion[]) => {
      const v = vs[cur]
      if (!v || data.setsPending || !survivorSyms.length) return vs
      const out = vs.slice()
      out[cur] = { ...v, syms: survivorSyms }
      return out
    },
    [cur, survivorSyms, data.setsPending],
  )
  const commit = useCallback(
    (next: ScreenState, why: string, start: string | null = null, uni: string = universe) => {
      setScreen(next)
      setStartId(start)
      setShowAll(false)
      const v: ScreenVersion = { v: versions.length + 1, parent: cur, screen: next, universe: uni, syms: [], why, at: nowZ() }
      setVersions(stamped(versions).concat([v]))
      setCur(versions.length)
    },
    [cur, versions, stamped, setScreen, universe],
  )
  const standOn = (i: number) => {
    const v = versions[i]
    if (!v) return
    setVersions(stamped(versions))
    setScreen(v.screen)
    setCur(i)
    setStartId(null)
  }
  const symsOf = (i: number) => (i === cur ? survivorSyms : versions[i]?.syms ?? [])

  // ── Arriving from an old address (Rev .121 #7) or a deep link: `model`,
  // `view=leaders`, `start=legacy` (the old screener's opening criteria),
  // `require=<chip,…>` and `symbol` (opens that name's Why). Read once, then
  // dropped from the address so the page's own view takes over.
  const arrived = useRef(false)
  useEffect(() => {
    if (arrived.current) return
    arrived.current = true
    /* The address is read once on arrival and then dropped; the view state it
       sets is the page's own from here on. */
    const m = params.get('model')
    const v = params.get('view')
    const legacy = params.get('start') === 'legacy'
    const require = (params.get('require') ?? '').split(',').filter(Boolean)
    const sym = (params.get('symbol') ?? '').trim().toUpperCase()
    if (!m && !v && !legacy && !require.length && !sym) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- arrival: the first version is made once, from the view the page came back with
      if (versions.length === 0) commit(screen, 'initial')
      return
    }
    if (v === 'leaders') {
      setView('leaders')
      setModel('radar')
    } else if (m === 'sepa' || m === 'radar' || m === 'premium' || m === 'none') {
      setModel(m)
      setView('ranked')
    }
    let first = legacy ? LEGACY_SCREEN : screen
    if (require.length) first = { ...first, on: { ...first.on, ...Object.fromEntries(require.map((id) => [id, true])) } }
    commit(first, legacy ? 'initial · old screener’s opening criteria' : require.length ? `initial · + ${require.join(' + ')}` : 'initial')
    if (sym) setSel(sym)
    const next = new URLSearchParams(params)
    for (const k of ['model', 'view', 'start', 'require', 'symbol']) next.delete(k)
    setParams(next, { replace: true })
  }, [params, setParams, setModel, setView, setSel, commit, screen, versions.length])

  const saved = useQuery({ queryKey: ['research', 'saved-screens'], queryFn: fetchSavedScreens, staleTime: 60_000 })
  const applySaved = (s: SavedScreen) => {
    const on: Record<string, boolean> = {}
    for (const id of [...s.definition.tech, ...s.definition.fund]) on[id] = true
    const paths = s.definition.paths ?? []
    if (paths.length && paths.every((p) => p === 'SETUP' || p === 'PIVOT')) on.m_sepa = true
    const lost = [
      paths.some((p) => p !== 'SETUP' && p !== 'PIVOT') ? `path ${paths.join('|')}` : null,
      s.definition.grades?.length ? `grade ${s.definition.grades.join('|')}` : null,
      s.definition.min_composite > 0 ? `composite ≥ ${s.definition.min_composite}` : null,
      s.definition.q ? `search “${s.definition.q}”` : null,
    ].filter(Boolean)
    commit({ on, mins: {} }, `start ${s.name}`, `saved:${s.id}`)
    notify(
      lost.length
        ? `Loaded “${s.name}”. Not a stage on this face: ${lost.join(' · ')} — open it on the Method face.`
        : `Loaded “${s.name}” from My screens.`,
    )
  }
  const starts = presetChoices(saved.data?.screens ?? [], (p) => commit(p.screen, `start ${p.label}`, p.id), applySaved)

  // Chip counts in this universe; a server-set chip not loaded yet reads its tier's own count.
  const chipCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const st of STAGES) {
      for (const c of st.chips) {
        if (c.fromSet && !data.sets.has(c.id)) continue
        let n = 0
        for (const r of pool) if (probe(r, c.id)) n += 1
        m.set(c.id, n)
      }
    }
    return m
  }, [pool, probe, data.sets])
  const chipCount = (id: string): { n: number | null; where: string } => {
    const n = chipCounts.get(id)
    if (n != null) return { n, where: `of ${pool.length} in universe` }
    const tier = data.setCounts.get(id)
    return { n: tier ?? null, where: 'in its tier’s own universe (select it to count this universe)' }
  }

  // ── Ranking.
  const scoreOf = useCallback(
    (r: NameRow): number | null =>
      model === 'sepa'
        ? r.sepa
          ? sepaScoreAt(r.sepa, weights.sepa)
          : null
        : model === 'radar'
          ? (r.radar?.score ?? null)
          : model === 'premium'
            ? r.prem
              ? volScore(r.prem, weights.premium).score
              : null
            : null,
    [model, weights],
  )
  const shown = useMemo(
    () => (ffStep ? ffStep.set : survivors).filter((r) => inFocus(r, focus)),
    [ffStep, survivors, focus],
  )
  const { rated, unrated } = useMemo(() => {
    const scored: Scored[] = shown.map((row) => ({ row, score: scoreOf(row) }))
    const bySym = (a: Scored, b: Scored) => a.row.sym.localeCompare(b.row.sym)
    if (model === 'none') return { rated: scored.sort(bySym), unrated: [] as Scored[] }
    const key = (x: Scored): number =>
      sort === 'trend'
        ? (x.row.sepa?.trendN ?? -1)
        : sort === 'growth'
          ? (x.row.sepa?.growthN ?? -1)
          : sort === 'ivr'
            ? (x.row.prem?.raw.ivRank ?? -1)
            : sort === 'vrp'
              ? (x.row.prem?.raw.vrp ?? -1)
              : (x.score ?? -1)
    return {
      rated: scored.filter((x) => x.score != null).sort((a, b) => (key(b) - key(a)) * -dir || (b.score ?? 0) - (a.score ?? 0)),
      unrated: scored.filter((x) => x.score == null).sort(bySym),
    }
  }, [shown, scoreOf, model, sort, dir])
  const walk = useMemo(() => rated.concat(unrated).map((x) => x.row.sym), [rated, unrated])

  useEffect(() => {
    if (!rated.length) return
    publishSymbolTrail({
      label: 'Stock screen',
      href: '/research/stocks',
      note: `ranked by ${MODEL_LABEL[model]}`,
      drove: 'trend',
      items: rated.slice(0, 200).map((x) => ({
        symbol: x.row.sym,
        why: x.row.sepa ? `${x.row.sepa.grade} · ${x.row.sepa.path}` : undefined,
        chips: [{ k: MODEL_LABEL[model], v: x.score == null ? '—' : x.score.toFixed(1), tone: 'neutral' as const }],
      })),
    })
  }, [rated, model])

  // ── Keyboard: j / k walk, esc closes.
  const step = useCallback(
    (d: number) => {
      if (!walk.length) return
      const i = walk.indexOf(sel ?? '')
      setSel(walk[(i + d + walk.length) % walk.length])
    },
    [walk, sel, setSel],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return
      if (!sel || view !== 'ranked') return
      if (e.key === 'j') step(1)
      if (e.key === 'k') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sel, view, step])

  // ── Reach, for the cards and the funnels: what each store holds today.
  const reach: Record<ModelKey, ModelReach> = {
    sepa: { universe: data.structUniverse, rated: data.wide.data?.rows.length ?? null, unit: '' },
    radar: { universe: data.structUniverse, rated: data.radar.data?.rows.length ?? null, unit: '' },
    premium: { universe: data.scanUniverse, rated: data.scan.data?.rows.length ?? null, unit: ' underlyings' },
  }
  const source: Record<RankModel, string> = {
    sepa: `dw_stock.mart_sepa_screener_wide · ${reach.sepa.rated ?? '—'} evaluated · ${data.sepaDate ?? '—'}`,
    radar: `/research/momentum/radar · ${reach.radar.rated ?? '—'} graded · session ${data.radarDate ?? '—'}`,
    premium: `/research/scan · neutral preset · ${reach.premium.rated ?? '—'} of ${data.scanUniverse ?? '—'} underlyings · ${data.scanDate?.slice(0, 10) ?? '—'}`,
    none: 'conditions only · SEPA evaluation + tier marts + 8-K narrative',
  }

  const curV = versions[cur] ?? null
  const parentV = curV && curV.parent >= 0 ? versions[curV.parent] : null
  const lineage = versions.length > 6 ? versions.slice(versions.length - 6) : versions
  const selRow = sel ? (data.rows.find((r) => r.sym === sel) ?? null) : null
  const lselRow = view === 'leaders' && lsel ? (data.rows.find((r) => r.sym === lsel.symbol) ?? null) : null
  const whyRow = view === 'leaders' ? lselRow : selRow
  const rankIn = (m: ModelKey) => {
    if (!whyRow) return ''
    const val = (r: NameRow) => (m === 'sepa' ? r.sepa?.comp : m === 'radar' ? r.radar?.score : r.prem?.serverScore) ?? null
    const mine = val(whyRow)
    if (mine == null) return ''
    const above = pool.filter((r) => (val(r) ?? -Infinity) > mine).length
    const of = pool.filter((r) => val(r) != null).length
    return `#${above + 1} of ${of} in ${UNIVERSE_LABEL[universe]}`
  }
  const lfChips = [
    ...(ffStep && ff ? [{ key: 'ff', label: `${funnels[ff.f].title} funnel · ${ffStep.label}`, clear: () => setFf(null) }] : []),
    ...Object.entries(focus).map(([a, n]) => ({
      key: `lf${a}`,
      label: `${AXES[Number(a)].title} · ${AXES[Number(a)].nodes[n as number]}`,
      clear: () =>
        setLf((f) => {
          const o = { ...f }
          delete o[Number(a)]
          return o
        }),
    })),
  ]
  const hasLf = lfChips.length > 0
  const clearAll = () => {
    const prev = screen
    setLf({})
    setFf(null)
    if (universe !== 'all') setUniverse('all')
    if (nOn) {
      commit(EMPTY_SCREEN, 'clear all', null, 'all')
      notify('Criteria cleared', { undo: () => commit(prev, 'undo clear') })
    }
  }
  const nClear = (universe !== 'all' ? 1 : 0) + nOn + Object.keys(focus).length + (ff ? 1 : 0)
  const toggle = (id: string, label: string) => commit({ ...screen, on: { ...screen.on, [id]: !screen.on[id] } }, `${screen.on[id] ? '−' : '+'} ${label}`)
  const toggleAgree = (id: AgreeId) => toggle(id, `${MODEL_LABEL[id === 'm_sepa' ? 'sepa' : id === 'm_radar' ? 'radar' : 'premium']} agrees`)
  const allThree = () => {
    const allOn = AGREE_IDS.every((id) => screen.on[id]) && !((screen.mins.agree ?? 0) > 0)
    const on = { ...screen.on }
    for (const id of AGREE_IDS) on[id] = !allOn
    commit({ on, mins: { ...screen.mins, agree: 0 } }, allOn ? '− all three agree' : '+ all three agree')
  }
  const rankBy = (m: RankModel) => {
    setModel(m)
    setSort('score')
    setDir(-1)
    if (m !== 'radar') setView('ranked')
    setLsel(null)
  }
  const startObj = starts.find((p) => p.id === startId)
  const screenTitle = startObj
    ? startObj.label + (curV && curV.why.startsWith('start') ? '' : ' · edited')
    : nOn
      ? `${nOn} conditions`
      : 'No screen · all pass'
  const savedNote = saved.isError
    ? 'My screens did not load (/research/screens).'
    : saved.data && saved.data.count === 0
      ? 'My screens: none saved yet — Save screen above, or write one on the Method face.'
      : null

  const failed = data.error && !data.rows.length
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Stock screen"
        info="One page for picking stocks. A model ranks, a screen cuts, and each works alone or with the other: choose a universe, a model to order it (or none), then a screen to narrow it. The Method face (⧉) is where models are defined, conditions are written and screens are versioned."
        actions={
          <>
            <SaveScreenAction screen={screen} stages={STAGES} nOn={nOn} />
            <PageHeadAction
              disabled
              title="An objective from a screen writes a standing schedule, and what it stamps as its source is a product call — owed, as on Vol ratings."
            >
              → Autopilot objective
            </PageHeadAction>
          </>
        }
      />
      <div data-sr-toolbar="">
        <PageFaceSwitch path="/research/stocks" />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">View</span>
        <SegmentControl
          size="xs"
          ariaLabel="View"
          value={view}
          options={VIEW_OPTIONS}
          onChange={(v) => {
            setView(v as 'ranked' | 'leaders')
            setSel(null)
            setLsel(null)
            if (v === 'leaders') setModel('radar')
          }}
        />
        <span data-sr-tb="sep" />
        <span data-sr-tb="label">Universe</span>
        <SegmentControl
          size="xs"
          ariaLabel="Universe"
          value={universe}
          options={UNIVERSE_OPTIONS}
          onChange={(v) => {
            setUniverse(v as UniverseId)
            commit(screen, `universe ${UNIVERSE_LABEL[v as UniverseId]}`, startId, v)
          }}
        />
        {nClear > 0 && view === 'ranked' ? (
          <button type="button" onClick={clearAll} className="mat-btn h-6 border px-2 text-dense-meta">
            Clear {nClear}
          </button>
        ) : null}
        <span data-sr-tb="meta" className="ml-auto whitespace-nowrap font-mono">
          {view === 'leaders'
            ? `Radar · across sessions`
            : `${pool.length.toLocaleString('en-US')} in universe · ${survivors.length.toLocaleString('en-US')} pass${model === 'none' ? '' : ` · ${rated.length} rated by ${MODEL_LABEL[model]}`}`}
        </span>
      </div>

      {data.isLoading && !data.rows.length ? (
        <ViewState kind="loading" title="Loading models and the screen universe" rows={8} cols={6} />
      ) : failed ? (
        <ViewState
          kind="failed"
          title="Couldn't load stock data"
          detail={`${data.error?.message ?? 'A model store did not answer'}. No model was read and no condition evaluated, so an empty list here would not be a result.`}
          onAction={data.refetch}
        />
      ) : (
        <>
          {data.error ? <ViewState kind="stale" title="One model store did not answer" detail={data.error.message} onAction={data.refetch} /> : null}
          {data.setError ? <ViewState kind="failed" layout="strip" title="A condition set did not load" detail={data.setError} /> : null}
          {view === 'ranked' ? (
            <>
              <MatchCards
                pass={survivors.length}
                poolN={pool.length}
                universeLabel={UNIVERSE_LABEL[universe]}
                cells={cells}
                base={base}
                on={screen.on}
                mins={screen.mins}
                model={model}
                reach={reach}
                onToggle={toggleAgree}
                onAllThree={allThree}
                onRankBy={rankBy}
              />
              <FlowPanel
                open={flowOpen}
                onToggle={() => setFlowOpen(!flowOpen)}
                funnels={funnels}
                poolN={pool.length}
                baseN={base.length}
                reach={reach}
                ff={ff}
                onFunnelStep={(f, st) => setFf(ff && ff.f === f && ff.st === st ? null : { f, st })}
                base={base}
                visible={visible}
                pickedModels={picked}
                focus={focus}
                selected={sel}
                onNode={(a, n) =>
                  setLf((f) => {
                    const o = { ...f }
                    if (o[a] === n) delete o[a]
                    else o[a] = n
                    return o
                  })
                }
                onPick={(sym) => setSel(sym)}
              />
            </>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <aside className="flex min-w-[290px] max-w-full flex-[0_1_330px] flex-col gap-2.5">
              <RankByPanel model={model} onModel={rankBy} weights={weights} onWeights={setWeights} source={source[model]} />
              <ScreenPanel
                title={screenTitle}
                poolN={pool.length}
                resultN={survivors.length}
                nOn={nOn}
                onClear={clearAll}
                starts={starts}
                startId={startId}
                savedNote={savedNote}
                stages={STAGES}
                counts={counts}
                screen={screen}
                chipCountOf={chipCount}
                pending={data.setsPending}
                onChip={toggle}
                onMin={(stageId, n, why) => commit({ ...screen, mins: { ...screen.mins, [stageId]: n } }, why)}
              />
            </aside>
            <section className="mat-card min-w-0 max-w-full flex-[999_1_600px] overflow-hidden border">
              {view === 'ranked' ? (
                <>
                  <header className="flex flex-wrap items-baseline gap-2 border-b border-foreground/[0.06] px-3 py-2">
                    <span data-sr-tb="label">Result</span>
                    <span className="text-dense-body font-semibold">
                      {model === 'none'
                        ? `${rated.length} names · A–Z`
                        : `${rated.length} ranked by ${MODEL_LABEL[model]}${unrated.length ? ` · ${unrated.length} not rated` : ''}`}
                    </span>
                    {hasLf ? (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        {lfChips.map((c) => (
                          <button key={c.key} type="button" onClick={c.clear} title="Focus · click to remove" className="mat-tag inline-flex h-[22px] items-center gap-1 border !border-primary bg-primary/15 text-dense-meta">
                            {c.label} <span className="text-muted-foreground">×</span>
                          </button>
                        ))}
                        <span className="font-mono text-dense-meta text-muted-foreground">
                          {shown.length} of {survivors.length} · {ffStep ? 'funnel' : 'lineage'} focus
                        </span>
                      </span>
                    ) : null}
                    <span className="font-mono text-dense-meta font-bold text-primary" title="The screen's version in this session. Every change is a new version whose parent is the one you stood on.">
                      {curV ? `v${curV.v}` : 'v…'}
                    </span>
                    <span className="font-mono text-dense-meta text-[var(--sk-mute2)]">{curV ? versionDiff({ ...curV, syms: survivorSyms }, parentV) : ''}</span>
                    <span className="ml-auto text-dense-meta text-muted-foreground">click a row for why · j k walk · esc</span>
                  </header>
                  <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b border-foreground/[0.06] px-3 py-1.5">
                    <span data-sr-tb="label" className="mr-1">
                      Lineage
                    </span>
                    {lineage.map((v, k) => {
                      const i = versions.indexOf(v)
                      const n = symsOf(i).length
                      const d = v.parent >= 0 ? n - symsOf(v.parent).length : 0
                      return (
                        <span key={v.v} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => standOn(i)}
                            title={`${v.why} · ${v.at}${v.parent >= 0 && v.parent !== i - 1 ? ` · branched from v${versions[v.parent].v}` : ''} · click to stand here; the next change branches from it`}
                            className={
                              i === cur
                                ? 'inline-flex h-5 items-baseline gap-1 rounded-md border border-primary bg-primary/15 px-2 font-mono text-dense-caption text-foreground'
                                : 'inline-flex h-5 items-baseline gap-1 rounded-md border border-transparent bg-foreground/[0.06] px-2 font-mono text-dense-caption text-[var(--sk-soft)]'
                            }
                          >
                            v{v.v}
                            <span className="text-muted-foreground">{n || '…'}</span>
                            {v.parent >= 0 ? (
                              <span className={d < 0 ? 'text-destructive' : d > 0 ? 'text-[var(--sk-state-green)]' : 'text-muted-foreground'}>
                                {d === 0 ? '±0' : `${d > 0 ? '+' : '−'}${Math.abs(d)}`}
                              </span>
                            ) : null}
                          </button>
                          {k < lineage.length - 1 ? <span className="text-dense-caption text-[var(--sk-faint)]">→</span> : null}
                        </span>
                      )
                    })}
                    <span className="ml-auto inline-flex items-baseline gap-2.5">
                      <Link to="/research/lab/stocks?tab=screens" className="text-dense-meta text-primary hover:underline" title="Saved screens and provenance live on the Method face">
                        Explain · lineage ⧉
                      </Link>
                      <span
                        className="font-mono text-dense-caption text-muted-foreground"
                        title="Not linked: these versions live in this tab. The screen store keeps saved screens, not their versions, so no Journal node exists for one."
                      >
                        Journal →
                      </span>
                    </span>
                  </div>
                  {rated.length + unrated.length > 0 ? (
                    <ResultTable
                      model={model}
                      rated={rated}
                      unrated={unrated}
                      showAll={showAll}
                      onShowAll={() => setShowAll(true)}
                      sort={sort}
                      dir={dir}
                      onSort={(k) => {
                        setDir(sort === k ? (dir === -1 ? 1 : -1) : -1)
                        setSort(k)
                      }}
                      selected={sel}
                      onSelect={setSel}
                      bookOf={(s) => {
                        const b = pf.isHolding(s)
                        const w = pf.isWatchlist(s)
                        return b ? (w ? 'book · watch' : 'in book') : w ? 'watchlist' : '—'
                      }}
                      rules={data.rules}
                      sepaDate={data.sepaDate}
                    />
                  ) : (
                    <ViewState
                      kind="filtered"
                      title="Nothing survives this screen"
                      detail={
                        hasLf && survivors.length
                          ? `The focus (${lfChips.map((c) => c.label).join(' + ')}) leaves none of the ${survivors.length} names that pass the full screen. The ribbons count names before the Model agreement stage.`
                          : `${pool.length} in ${UNIVERSE_LABEL[universe]} · 0 after stage ${counts.findIndex((c) => c.after === 0) + 1}. Loosen that stage or widen the universe.`
                      }
                      actionLabel="Clear criteria"
                      onAction={clearAll}
                    />
                  )}
                  <div className="text-pretty border-t border-foreground/[0.06] px-3 py-2 text-dense-meta leading-normal text-muted-foreground">
                    {FOOT[model]} Earn is — on every row: no earnings date is served across the universe.
                  </div>
                </>
              ) : (
                <LeadersFace
                  universe={universe === 'all' || universe === 'options' ? 'all' : universe}
                  inUniverse={(s) => (universe === 'book' ? pf.isHolding(s) : pf.isWatchlist(s))}
                  sort={lsort}
                  onSort={setLsort}
                  selected={lsel}
                  onSelect={setLsel}
                  todayOf={(s) => {
                    const r = data.rows.find((x) => x.sym === s)
                    return r?.sepa ? { grade: r.sepa.grade, path: r.sepa.path } : null
                  }}
                  onUniverseAll={() => setUniverse('all')}
                />
              )}
            </section>
          </div>
        </>
      )}

      <RightInspectorShell
        open={whyRow != null}
        ariaLabel="Why this name"
        onClose={() => {
          setSel(null)
          setLsel(null)
        }}
      >
        {whyRow ? (
          <WhyDrawer
            row={whyRow}
            model={view === 'leaders' ? 'radar' : model}
            weights={weights}
            score={scoreOf(whyRow)}
            pos={
              view === 'leaders' && lsel
                ? `Leaders · ${lsel.date}`
                : model === 'none'
                  ? `${walk.indexOf(whyRow.sym) + 1} of ${walk.length} · A–Z`
                  : scoreOf(whyRow) == null
                    ? `not rated by ${MODEL_LABEL[model]}`
                    : `#${walk.indexOf(whyRow.sym) + 1} of ${rated.length} ranked by ${MODEL_LABEL[model]}`
            }
            screen={screen}
            stages={STAGES}
            probe={probe}
            rankIn={rankIn}
            leadersSession={view === 'leaders' && lsel ? lsel.date : null}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onClose={() => {
              setSel(null)
              setLsel(null)
            }}
          />
        ) : null}
      </RightInspectorShell>
    </PageShell>
  )

}
