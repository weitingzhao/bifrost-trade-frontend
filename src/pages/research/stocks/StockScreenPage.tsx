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
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ViewState } from '@bifrost/ui'
import { PageFaceSwitch, PageHead, PageHeadAction, PageShell } from '@/components/layout'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { SegmentControl, type SegmentOption } from '@/components/data-display'
import { fetchSavedScreens, type SavedScreen } from '@/api/research/savedScreens'
import { firstResearchAuthGapError } from '@/lib/auth/researchAuthGap'
import { usePageViewState } from '@/lib/pageView'
import { notify } from '@/lib/shellNotify'
import { publishSymbolTrail } from '@/lib/symbolTrail'
import { composite as volScore, SERVER_WEIGHTS } from '@/lib/research/volRatingsModel'
import { LeadersFace } from './LeadersFace'
import type { LeaderSortKey } from './leadersModel'
import { FlowPanel, type FunnelFocus } from './FlowPanel'
import { MatchCards, type ModelReach } from './MatchCards'
import { ResultHead } from './ResultHead'
import { ResultTable, type Scored, type SortKey } from './ResultTable'
import { SaveScreenAction } from './SaveScreenAction'
import { ScreenPanel } from './ScreenPanel'
import { presetChoices, type WeightSet } from './stockScreenView'
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
  pineOf,
  rowHasReading,
  rowProbe,
  runStages,
  sepaScoreAt,
  stageHover,
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
import { LEGACY_SCREEN, pineChartSignal, stagesWithPine } from './stockScreenStages'
import { usePineLibrary } from '@/hooks/usePineLibrary'

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
  // Rev .131: a stage's −N focus (exclusive with the funnel and lineage focus),
  // the hovered stage, the collapsed Screen column, the Rank drawer, and the
  // model cards' pulse when stage 1 sends you back to them.
  const [sf, setSf] = useState<number | null>(null)
  const [hs, setHs] = useState<number | null>(null)
  const [scrOpen, setScrOpen] = useState(true)
  const [wOpen, setWOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const cardsRef = useRef<HTMLDivElement>(null)
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toCards = () => {
    cardsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setPulse(true)
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setPulse(false), 1400)
  }

  const data = useStockScreenData(screen.on, pineOf(screen).within)
  const pineLib = usePineLibrary()
  const stages = useMemo(() => stagesWithPine(pineLib.scripts), [pineLib.scripts])
  const probe = useMemo(() => rowProbe(data.sets), [data.sets])
  const pf = data.portfolio

  const pool = useMemo(() => {
    const inU = (r: NameRow) =>
      universe === 'options' ? r.prem != null : universe === 'watch' ? pf.isWatchlist(r.sym) : universe === 'book' ? pf.isHolding(r.sym) : true
    return data.rows.filter(inU)
  }, [data.rows, universe, pf])

  const { counts, cuts, survivors } = useMemo(() => runStages(pool, stages, screen, probe), [pool, stages, screen, probe])
  const base = useMemo(() => pool.filter((r) => passesAll(r, stages, screen, probe, 'agree')), [pool, stages, screen, probe])
  const cells = useMemo(() => matchRate(base), [base])
  const funnels = useMemo(() => funnelsOf(pool, base), [pool, base])
  const visible = visibleAxes(screen)
  const picked = AGREE_IDS.map((id, i) => (screen.on[id] ? i : -1)).filter((i) => i >= 0)
  const focus = focusOnVisible(lf, visible)
  const ffStep = ff ? funnels[ff.f]?.steps[ff.st] : undefined
  const cutAt = sf != null && cuts[sf]?.length ? sf : null
  // Under a funnel or lineage focus, that focus counted through each stage.
  const focusCounts = useMemo(() => {
    if (cutAt != null) return null
    const lfKeys = Object.keys(focus).length
    const fpool = ffStep ? ffStep.set.filter((r) => inFocus(r, focus)) : lfKeys ? base.filter((r) => inFocus(r, focus)) : null
    return fpool ? runStages(fpool, stages, screen, probe).counts : null
  }, [cutAt, ffStep, focus, base, stages, screen, probe])
  const hover = hs != null && stages[hs] ? stageHover(hs, stages[hs], base, screen, probe, cuts[hs]?.length ?? 0) : null
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

  const saved = useQuery({ queryKey: ['research-engine', 'saved-screens'], queryFn: fetchSavedScreens, staleTime: 60_000 })
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
    for (const st of stages) {
      for (const c of st.chips) {
        if (c.fromSet && !data.sets.has(c.id)) continue
        let n = 0
        for (const r of pool) if (probe(r, c.id)) n += 1
        m.set(c.id, n)
      }
    }
    return m
  }, [pool, stages, probe, data.sets])
  // Rev .157: a row-evaluated chip that no name in range has a reading for.
  const chipsWithoutReading = useMemo(() => {
    const out = new Set<string>()
    if (!pool.length) return out
    for (const st of stages) {
      for (const c of st.chips) {
        if (!c.fromSet && pool.every((r) => !rowHasReading(r, c))) out.add(c.id)
      }
    }
    return out
  }, [pool, stages])
  const chipCount = (id: string): { n: number | null; where: string; noReading?: boolean } => {
    const n = chipCounts.get(id)
    if (n != null) return { n, where: `of ${pool.length} in universe`, noReading: chipsWithoutReading.has(id) }
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
    () => (cutAt != null ? cuts[cutAt] : (ffStep ? ffStep.set : survivors).filter((r) => inFocus(r, focus))),
    [cutAt, cuts, ffStep, survivors, focus],
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
    ...(cutAt != null ? [{ key: 'sf', label: `Cut by stage ${cutAt + 1} · ${stages[cutAt].title}`, clear: () => setSf(null) }] : []),
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
  const focusNote =
    cutAt != null
      ? `${shown.length} names · outside the result`
      : ffStep
        ? `${shown.length} names · funnel${Object.keys(focus).length ? ' + lineage' : ''}`
        : `${shown.length} of ${survivors.length} · lineage`
  const clearFocus = () => {
    setLf({})
    setFf(null)
    setSf(null)
  }
  const allThreeListed = !!ff && ff.f === 3 && ff.st === 4 && !Object.keys(focus).length
  const clearAll = () => {
    const prev = screen
    clearFocus()
    if (universe !== 'all') setUniverse('all')
    if (nOn) {
      commit(EMPTY_SCREEN, 'clear all', null, 'all')
      notify('Criteria cleared', { undo: () => commit(prev, 'undo clear') })
    }
  }
  const nClear = (universe !== 'all' ? 1 : 0) + nOn + Object.keys(focus).length + (ff ? 1 : 0) + (cutAt != null ? 1 : 0)
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
    ? firstResearchAuthGapError(saved.error)
      ? 'My screens: not read — Research user not set.'
      : 'My screens did not load (/research/screens).'
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
            <SaveScreenAction screen={screen} stages={stages} nOn={nOn} />
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
                model={model}
                reach={reach}
                onToggle={toggleAgree}
                onRankBy={rankBy}
                allRequired={AGREE_IDS.every((id) => screen.on[id]) && !((screen.mins.agree ?? 0) > 0)}
                onRequireAll={allThree}
                noFocus={!hasLf}
                onListAll={() => {
                  clearFocus()
                  setView('ranked')
                }}
                allThreeListed={allThreeListed}
                onListAllThree={() => {
                  setFf(allThreeListed ? null : { f: 3, st: 4 })
                  setLf({})
                  setSf(null)
                }}
                cardsRef={cardsRef}
                pulse={pulse}
              />
              <FlowPanel
                open={flowOpen}
                onToggle={() => setFlowOpen(!flowOpen)}
                funnels={funnels}
                poolN={pool.length}
                baseN={base.length}
                reach={reach}
                ff={ff}
                onFunnelStep={(f, st) => {
                  setFf(ff && ff.f === f && ff.st === st ? null : { f, st })
                  setSf(null)
                }}
                base={base}
                visible={visible}
                pickedModels={picked}
                focus={focus}
                selected={sel}
                onNode={(a, n) => {
                  setSf(null)
                  setLf((f) => {
                    const o = { ...f }
                    if (o[a] === n) delete o[a]
                    else o[a] = n
                    return o
                  })
                }}
                onPick={(sym) => setSel(sym)}
                hover={hover}
              />
            </>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-start gap-3">
              <ScreenPanel
                title={screenTitle}
                poolN={pool.length}
                resultN={survivors.length}
                nOn={nOn}
                onClear={clearAll}
                starts={starts}
                startId={startId}
                savedNote={savedNote}
                stages={stages}
                counts={counts}
                screen={screen}
                chipCountOf={chipCount}
                pending={data.setsPending}
                onChip={toggle}
                onMin={(stageId, n, why) => commit({ ...screen, mins: { ...screen.mins, [stageId]: n } }, why)}
                onPine={(pine, why) => commit({ ...screen, pine }, why)}
                collapsed={!scrOpen}
                onToggle={() => setScrOpen(!scrOpen)}
                hovered={hs}
                onHover={setHs}
                cutIdx={cutAt}
                onCut={(i) => {
                  setSf(cutAt === i ? null : i)
                  setFf(null)
                  setLf({})
                  setView('ranked')
                }}
                focusCounts={focusCounts}
                onToCards={toCards}
              />
            <section className="mat-card min-w-[min(100%,480px)] max-w-full flex-[999_1_0] overflow-hidden border">
              {view === 'ranked' ? (
                <>
                  <ResultHead
                    title={
                      model === 'none'
                        ? `${rated.length} names · A–Z`
                        : `${rated.length} ranked by ${MODEL_LABEL[model]}${unrated.length ? ` · ${unrated.length} not rated` : ''}`
                    }
                    version={curV ? `v${curV.v}` : 'v…'}
                    universeN={pool.length}
                    resultN={survivors.length}
                    diff={curV ? versionDiff({ ...curV, syms: survivorSyms }, parentV) : ''}
                    chips={lfChips}
                    focusNote={focusNote}
                    onClearFocus={clearFocus}
                    model={model}
                    onModel={rankBy}
                    wOpen={wOpen}
                    onToggleW={() => setWOpen(!wOpen)}
                    weights={weights}
                    onWeights={setWeights}
                    source={source[model]}
                    versions={versions}
                    cur={cur}
                    countOf={(i) => symsOf(i).length}
                    onStand={standOn}
                  />
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
                      chartSignal={pineChartSignal(screen.on)}
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
            stages={stages}
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
