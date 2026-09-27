/**
 * Symbol lab — the Method face of Symbol (design `Research Symbol Method.dc.html`,
 * route rev 2026-09-20.4; §16 refinement at Rev .91).
 *
 * Three tabs behind the readings Trade quotes for one name. Surface holds the
 * raw SVI fit itself: the store's five parameters seed the sliders, a drag
 * refits the smile honestly against the store's own residual rows, and the
 * no-arbitrage lamps say whether the shape in hand is even a surface. What-if
 * shifts that surface without reshaping it over a spot × vol grid for three
 * structure archetypes. Method is the assumption ledger — the six choices
 * every dealer-level and percentile reading rests on, each marked measured or
 * assumed.
 *
 * The verdict strip cites the lens registry; one place computes, both faces
 * cite — never recalculated here.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, HealthLamp, ViewState } from '@bifrost/ui'
import { fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import type { ExhibitPayload } from '@/api/research/exhibit'
import { AsofTag } from '@/components/AsofTag'
import { SegmentControl } from '@/components/data-display'
import { PageFaceSwitch, PageHead, PageShell } from '@/components/layout'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { CopilotDraftPanel } from '@/components/research/CopilotDraftPanel'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { SymbolContextGuard } from '@/components/research/SymbolContextGuard'
import { useSignalHealthSummary } from '@/hooks/useCopilotStanding'
import { useCreateHypothesis } from '@/hooks/useHypotheses'
import { useExhibitComposite } from '@/hooks/useExhibitComposite'
import { useEarningsDates } from '@/hooks/useNarrative'
import { usePreviewState } from '@/hooks/usePreviewState'
import { useResearchContext } from '@/hooks/useResearchContext'
import { useVolSurfaceFit, useResiduals } from '@/hooks/useVolSurfaceData'
import { healthFlag } from '@/lib/asofTag'
import { daysBack } from '@/lib/researchFreshness'
import { etTodayIso } from '@/lib/freshness'
import { daysTo } from '@/utils/optionTicker'
import { toneForBand } from '@/lib/lensVerdict'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/symbolTabs'
import { cn } from '@/lib/utils'
import { failedDetail, sourceState, staleDetail } from '@/lib/viewState'
import { chainFromSnapshots } from '@/utils/optionChain'
import { pnlColorClass } from '@/utils/dailyChange'
import { estimateCaveat, shortDate } from '@/utils/earningsEstimate'
import { cap, mono, panel, panelHead, td, th } from './labSymbolUi'
import { AssumptionLedger } from './AssumptionLedger'
import { SmileFitPanel } from './SmileFitPanel'
import {
  arbChecks,
  fitQuality,
  GRID_VOL_COLS,
  smileRows,
  sviFromRow,
  WHAT_IF_STRUCTURES,
  whatIfGrid,
  type SviParams,
  type WhatIfStructure,
} from './labSymbolModel'

const sliderCls = 'h-3.5 w-full accent-[var(--sk-accent)]'

type LabTab = 'surface' | 'whatif' | 'method'

const TABS: { value: LabTab; label: string }[] = [
  { value: 'surface', label: 'Surface' },
  { value: 'whatif', label: 'What-if' },
  { value: 'method', label: 'Method' },
]

/** The reading face each tab answers to — same subject, same endpoint. */
const READING_OF: Record<LabTab, { href: string; label: string }> = {
  surface: { href: '/research/vol-regime', label: '/research/vol-regime' },
  whatif: { href: '/research/scenario', label: '/research/scenario' },
  method: { href: '/research/dealer-levels', label: '/research/dealer-levels' },
}

/** The design's event threshold: an earnings print closer than this reads amber. */
const EVENT_NEAR_DAYS = 12

function numReading(ex: ExhibitPayload | undefined, key: string): number | null {
  const v = ex?.readings?.[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function toneClass(tone: string): string {
  return tone === 'success'
    ? 'text-success'
    : tone === 'danger'
      ? 'text-destructive'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-secondary-foreground'
}

/* ── the page ────────────────────────────────────────────────────────────── */

export default function LabSymbolPage() {
  const { symbol } = useResearchContext()
  const sym = symbol.trim().toUpperCase()
  const today = etTodayIso()
  const preview = usePreviewState()
  // The Symbol page's Method switch carries the face you were reading
  // (design `_Part Face` `method-to`, Rev .56): `?tab=whatif` lands on What-if.
  const [params] = useSearchParams()
  const [tab, setTab] = useState<LabTab>(() => {
    const t = params.get('tab')
    return t === 'whatif' || t === 'method' ? t : 'surface'
  })
  const [userExpiry, setUserExpiry] = useState<string | null>(null)
  const [override, setOverride] = useState<SviParams | null>(null)
  const [struct, setStruct] = useState<WhatIfStructure>('strangle')
  const [dSpot, setDSpot] = useState(0)
  const [dVol, setDVol] = useState(0)
  const [dteHeld, setDteHeld] = useState(30)
  const [settings, setSettings] = useState<Record<string, string>>({
    gex: 'oi',
    dealer: 'short_gamma',
    flow: 'oi_vol',
    pin: 'oi',
    win: '252',
    quote: 'mid',
  })
  const [hypNote, setHypNote] = useState<string | null>(null)
  const createHyp = useCreateHypothesis()
  const health = useSignalHealthSummary()

  const fitQ = useVolSurfaceFit(sym)
  const fits = useMemo(
    () =>
      (fitQ.data ?? [])
        .filter((r) => r.expiry && r.dte != null && sviFromRow(r))
        .sort((a, b) => (a.dte ?? 0) - (b.dte ?? 0)),
    [fitQ.data]
  )
  // The default expiry is the fit nearest 30 days — the tenor every cited
  // percentile is quoted at.
  const expiry = useMemo(() => {
    if (userExpiry && fits.some((r) => r.expiry === userExpiry)) return userExpiry
    let best: string | null = null
    let bestGap = Infinity
    for (const r of fits) {
      // Days from New York's today, the days the label prints — not the fit's own dte.
      const gap = Math.abs((daysTo(r.expiry as string, today) ?? 0) - 30)
      if (gap < bestGap) {
        bestGap = gap
        best = r.expiry
      }
    }
    return best
  }, [fits, userExpiry, today])
  const fitRow = useMemo(() => fits.find((r) => r.expiry === expiry) ?? null, [fits, expiry])
  const storeParams = useMemo(() => (fitRow ? sviFromRow(fitRow) : null), [fitRow])
  const p = override ?? storeParams
  // The smile is evaluated at the fit's own T (√(w(k)/T)); the label reads New York's DTE.
  const fitDte = fitRow?.dte ?? null
  const T = fitDte != null && fitDte > 0 ? fitDte / 365 : null
  const dte = fitRow?.expiry ? daysTo(fitRow.expiry, today) : null

  const residQ = useResiduals(sym, expiry ?? '')
  const chainQ = useQuery({
    queryKey: ['market', 'option-snapshots', sym, expiry],
    queryFn: () => fetchOptionSnapshots(sym, expiry!),
    enabled: Boolean(sym && expiry),
    staleTime: 5 * 60_000,
  })
  const chain = useMemo(
    () => chainFromSnapshots(chainQ.data?.rows ?? []),
    [chainQ.data?.rows]
  )
  const rows = useMemo(
    () => (p && T != null ? smileRows(residQ.data ?? [], chain, p, T) : []),
    [residQ.data, chain, p, T]
  )
  const quality = fitQuality(rows)
  const arb = p ? arbChecks(p) : []

  // The strip cites the registry — one place computes, both faces cite.
  const exQ = useExhibitComposite(['iv_rank', 'vrp', 'skew'], sym)
  const exOf = (lens: string) => exQ.data?.find((e) => e.lens === lens || e.lens_id === lens)
  const ivRankEx = exOf('iv_rank')
  const vrpEx = exOf('vrp')
  const skewEx = exOf('skew')
  const ivr = typeof ivRankEx?.verdict?.value === 'number' ? ivRankEx.verdict.value : null
  const vrpPctl = typeof vrpEx?.verdict?.value === 'number' ? vrpEx.verdict.value : null
  const skewPctl = numReading(skewEx, 'slope_pctile_252d')
  // The design labels this IV30 − RV20. The vrp store holds both spreads
  // (vrp_20d and vrp_60d, measured 2026-09-26), but the reading face and the
  // vrp exhibit quote vrp_60d — so the strip does too, and says so, to stay
  // the same number as the Reading face. Fractions → vol points once.
  const vrpDiff = numReading(vrpEx, 'vrp_60d')
  const asOf = ivRankEx?.as_of ?? vrpEx?.as_of ?? skewEx?.as_of ?? null

  // The next print, estimated by Research (0.125.0) — the Symbol page's own
  // source for its earnings marks, so the tile and those marks agree.
  const earningsQ = useEarningsDates(sym)
  const nextEarnings = earningsQ.data?.expected_next ?? null

  // The company's name off the wide universe row — one request, cached an hour.
  const wideQ = useQuery({
    queryKey: ['research', 'sepa-wide-one', sym],
    queryFn: () => fetchSepaScreenerWide(5, [sym]),
    enabled: Boolean(sym),
    staleTime: 60 * 60_000,
  })
  const company = wideQ.data?.rows.find((r) => r.symbol === sym)?.company_name ?? null

  // Spot and change are the store's closes — this face draws no live quote.
  const barsQ = useQuery({
    queryKey: ['market', 'daily-closes-tail', sym, today],
    queryFn: () => fetchStockDailyCloses(sym, daysBack(today, 10), today),
    enabled: Boolean(sym),
    staleTime: 10 * 60_000,
  })
  const closeVals = (barsQ.data ?? [])
    .map((c) => c.close)
    .filter((v): v is number => v != null)
  const lastClose = closeVals.length > 0 ? closeVals[closeVals.length - 1] : null
  const prevClose = closeVals.length > 1 ? closeVals[closeVals.length - 2] : null
  const chgPct =
    lastClose != null && prevClose ? ((lastClose - prevClose) / prevClose) * 100 : null

  const grid = useMemo(() => whatIfGrid(struct, dSpot, dVol, dteHeld), [struct, dSpot, dVol, dteHeld])
  const expiryLabel = fitRow?.expiry ? `${fitRow.expiry.slice(5)} · ${dte ?? '?'}d` : '—'

  const verdicts = [
    {
      label: 'IV rank',
      value: ivr != null ? ivr.toFixed(0) : '—',
      cls: toneClass(toneForBand('iv_rank', ivRankEx?.verdict?.band)),
    },
    {
      label: 'VRP pctl',
      value: vrpPctl != null ? vrpPctl.toFixed(0) : '—',
      cls: toneClass(toneForBand('vrp', vrpEx?.verdict?.band)),
    },
    {
      label: 'skew pctl',
      value: skewPctl != null ? skewPctl.toFixed(0) : '—',
      cls: toneClass(toneForBand('skew', skewEx?.verdict?.band)),
    },
    {
      label: 'IV30 − RV60',
      value:
        vrpDiff != null ? `${vrpDiff >= 0 ? '+' : '−'}${Math.abs(vrpDiff * 100).toFixed(1)}` : '—',
      cls: vrpDiff != null ? pnlColorClass(vrpDiff) : 'text-muted-foreground',
    },
  ]

  const sliders = p
    ? (
        [
          { key: 'a', label: 'a · level', min: 0, max: 0.2, step: 0.0005, dp: 4, note: 'vertical shift of total variance' },
          { key: 'b', label: 'b · slope', min: 0, max: 1.2, step: 0.005, dp: 3, note: 'wing steepness' },
          { key: 'rho', label: 'ρ · tilt', min: -0.95, max: 0.95, step: 0.01, dp: 2, note: 'put-side asymmetry' },
          { key: 'm', label: 'm · shift', min: -0.15, max: 0.15, step: 0.002, dp: 3, note: 'moneyness of the minimum' },
          { key: 'sigma', label: 'σ · curvature', min: 0.02, max: 0.4, step: 0.005, dp: 3, note: 'smoothness at the money' },
        ] as const
      ).map((x) => ({
        ...x,
        value: p[x.key],
        // A store fit outside the design's range widens the range, not the fit.
        lo: Math.min(x.min, p[x.key]),
        hi: Math.max(x.max, p[x.key]),
        moved: storeParams != null && p[x.key] !== storeParams[x.key],
      }))
    : []

  const setParam = (key: keyof SviParams, v: number) => {
    if (!p) return
    setOverride({ ...p, [key]: v })
  }

  // Measured 2026-09-26: the event the design cites is the next earnings
  // print, which Research estimates per name (`expected_next`) — the tile
  // reads it rather than saying no event store exists.
  const eventTile = nextEarnings
    ? nextEarnings.days_away >= 0
      ? {
          label: 'Event in',
          value: `${nextEarnings.days_away}d`,
          cls: nextEarnings.days_away < EVENT_NEAR_DAYS ? 'text-warning' : 'text-foreground',
          src: `earnings est. ${shortDate(nextEarnings.date)}`,
          title: estimateCaveat(nextEarnings),
        }
      : {
          label: 'Event in',
          value: 'late',
          cls: 'text-warning',
          src: `earnings est. ${shortDate(nextEarnings.date)} passed`,
          title: `${estimateCaveat(nextEarnings)} The estimated date has passed with no results filing on record.`,
        }
    : {
        label: 'Event in',
        value: '—',
        cls: 'text-muted-foreground',
        src: earningsQ.isError
          ? 'earnings estimate unread'
          : earningsQ.isLoading
            ? 'reading the earnings estimate'
            : 'no quarterly cadence to estimate from',
        title: undefined,
      }

  const wiStats = [
    { label: 'Worst cell', value: grid.worst.toFixed(2), cls: 'text-loss', src: 'grid extreme', title: undefined },
    { label: 'Best cell', value: `+${grid.best.toFixed(2)}`, cls: 'text-profit', src: 'grid extreme', title: undefined },
    {
      label: 'IV rank now',
      value: ivr != null ? ivr.toFixed(0) : '—',
      cls: toneClass(toneForBand('iv_rank', ivRankEx?.verdict?.band)),
      src: 'option_metric · same as trade',
      title: undefined,
    },
    eventTile,
  ]

  // §17.1: the fit is what every tab stands on; residuals and the chain only
  // add columns, so they fail as strips naming what is unread.
  const fitState =
    preview === 'loading' || preview === 'failed' || preview === 'stale' ? preview : sourceState(fitQ)
  const residUnread = residQ.isError && !residQ.data
  const chainUnread = chainQ.isError && !chainQ.data

  return (
    <PageShell padding="compact" className="space-y-3">
      {/* §16.10: the lead behind ⓘ, the cited readings' session as the stamp,
          the three tabs as the head's own. */}
      <PageHead
        title="Symbol lab"
        info={`Surface fit, what-if and the assumption ledger behind what Trade reports for ${sym || 'a symbol'}. Method and parameters only — nothing here places an order.`}
        stamp={
          <AsofTag
            asof={exQ.isLoading ? null : asOf}
            flag={healthFlag(health.data, { loading: health.isLoading, error: health.isError })}
            judgedBy="Research"
            href="/research/signal-health"
          />
        }
        tabs={TABS}
        tab={tab}
        onTab={(v) => setTab(v as LabTab)}
      />

      <div data-sr-toolbar="">
        <PageFaceSwitch path="/research/lab/symbol" />
        <span data-sr-tb="sep" />
        {/* The prototype's own pastel violet, as Backtest's lab mark. */}
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 mat-tag font-mono text-dense-micro font-semibold tracking-[0.05em] text-[var(--sk-series-violet)]"
          title="Method face — how the number is made. Analysis only; no order can be placed from here."
        >
          ◆ METHOD · NO ORDERS
        </span>
        {sym ? (
          <Link
            to={withSymbolParam(SYMBOL_PATH, sym)}
            className={cn(mono, 'type-section font-bold text-entity-symbol hover:underline')}
            title="Open in Symbol — the reading face"
          >
            {sym}
          </Link>
        ) : null}
        {company ? (
          <span className="max-w-[22ch] overflow-hidden text-ellipsis whitespace-nowrap text-dense-label text-muted-foreground">
            {company}
          </span>
        ) : null}
        {lastClose != null ? (
          <span className={cn(mono, 'text-dense-label text-secondary-foreground')}>
            {lastClose.toFixed(2)}
            {chgPct != null ? (
              <span className={cn('pl-1.5', pnlColorClass(chgPct))}>
                {chgPct >= 0 ? '+' : '−'}
                {Math.abs(chgPct).toFixed(2)}%
              </span>
            ) : null}
            <span className="pl-1.5 text-muted-foreground">at close</span>
          </span>
        ) : null}
        <Link
          to={READING_OF[tab].href}
          title="The reading face — what the market says. Same subject, same endpoint."
          className="ml-auto whitespace-nowrap font-mono text-dense-meta text-primary hover:underline"
        >
          Reading → {READING_OF[tab].label}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-x-4.5 gap-y-1.5 border px-3 py-1.5 mat-card">
        <span className={cap}>Verdict · same source as Trade</span>
        {verdicts.map((v) => (
          <span key={v.label} className="flex flex-col gap-px whitespace-nowrap">
            <span className={cn(mono, 'text-dense-body font-semibold', v.cls)}>{v.value}</span>
            <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>{v.label}</span>
          </span>
        ))}
        <span className="ml-auto whitespace-nowrap text-dense-caption text-muted-foreground">
          same number as the Reading face
        </span>
      </div>

      <SymbolContextGuard
        symbol={sym}
        description="The lab dissects one name's surface and assumptions. Pick a symbol, then come back here."
      >
        {fitState === 'stale' ? (
          <ViewState
            kind="stale"
            title="Couldn’t refresh the surface fit"
            detail={staleDetail(fitQ, 'a newer session’s fit may be missing.')}
            onAction={() => void fitQ.refetch()}
          />
        ) : null}
        {tab !== 'method' && fitState !== 'loading' && fitState !== 'failed' && (residUnread || chainUnread) ? (
          <ViewState
            kind="stale"
            layout="strip"
            title={residUnread ? 'Couldn’t read the residual rows' : 'Couldn’t read the chain’s open interest'}
            detail={
              residUnread
                ? 'The fit-residuals table is unread — an empty table here is not a clean fit.'
                : 'The Chain OI and weight columns are unread — a dash there is not a strike without interest.'
            }
            onAction={() => {
              void residQ.refetch()
              void chainQ.refetch()
            }}
          />
        ) : null}
        {fitState === 'loading' || (fitState === 'ready' && residQ.isLoading) ? (
          <section className="overflow-hidden mat-card">
            <ViewState kind="loading" title="Loading the surface fit" rows={7} cols={7} />
          </section>
        ) : fitState === 'failed' ? (
          <section className="overflow-hidden mat-card">
            <ViewState
              kind="failed"
              title="Couldn’t load the surface fit"
              detail={failedDetail(fitQ, 'No fit was read — this is not a name without a surface.')}
              onAction={() => void fitQ.refetch()}
            />
          </section>
        ) : !p || T == null ? (
          <section className="overflow-hidden mat-card">
            <ViewState
              kind="empty"
              title={`No SVI fit for ${sym}`}
              detail="The vol-surface store holds no fit for this name — there is no surface to put under the sliders. The fit engine writes one row per expiry per session for covered names."
            />
          </section>
        ) : tab === 'surface' ? (
          <div className="flex flex-wrap items-start gap-3">
            <aside className={cn(panel, 'flex max-w-[24rem] flex-[1_1_15rem] flex-col')} aria-label="Raw SVI">
              <header className={panelHead}>
                <span className={cap}>Raw SVI · {expiryLabel}</span>
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  disabled={override == null}
                  className={cn(
                    mono,
                    'ml-auto border px-1.75 py-0.5 text-dense-caption mat-btn',
                    override == null ? 'cursor-default text-muted-foreground' : 'cursor-pointer text-primary'
                  )}
                  title="Drop the hand fit and return to the store's committed parameters."
                >
                  refit
                </button>
              </header>
              <div className="flex flex-col gap-3 px-3 py-2.5">
                {sliders.map((x) => (
                  <div key={x.key} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline justify-between">
                      <span className={cn(mono, 'text-dense-caption')}>{x.label}</span>
                      <span
                        className={cn(
                          mono,
                          'text-dense-caption',
                          x.moved ? 'text-[var(--sk-accent)]' : 'text-muted-foreground'
                        )}
                      >
                        {x.value.toFixed(x.dp)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={x.lo}
                      max={x.hi}
                      step={x.step}
                      value={x.value}
                      onChange={(e) => setParam(x.key, Number(e.target.value))}
                      className={sliderCls}
                      aria-label={x.label}
                    />
                    <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>{x.note}</span>
                  </div>
                ))}
                <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
                  <span className={cap}>Calibration window</span>
                  <SegmentControl
                    ariaLabel="Calibration window"
                    size="xs"
                    value={settings.win}
                    onChange={(v) => setSettings((s) => ({ ...s, win: v }))}
                    options={[
                      { value: '60', label: '60d' },
                      { value: '252', label: '252d' },
                    ]}
                  />
                  <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                    declared here · its effect is named in the ledger — cited percentiles never
                    recompute on this page
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
                  <span className={cap}>Expiry</span>
                  <SegmentControl
                    ariaLabel="Expiry"
                    size="xs"
                    value={expiry ?? ''}
                    onChange={(v) => {
                      setUserExpiry(v)
                      setOverride(null)
                    }}
                    options={fits.slice(0, 6).map((r) => ({
                      value: r.expiry as string,
                      label: `${r.expiry?.slice(5) ?? ''}`,
                    }))}
                  />
                  <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                    {fits.length > 6 ? `nearest 6 of ${fits.length} fitted expiries` : `${fits.length} expiries fitted this session`}{' '}
                    · switching drops the hand fit
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
                  <span className={cap}>No-arbitrage</span>
                  {arb.map((a) => (
                    <div key={a.label} className="flex items-center gap-1.75">
                      <HealthLamp
                        lamp={a.ok ? 'green' : 'red'}
                        variant="dot"
                        title={a.ok ? 'Satisfied' : 'Violated — the fit admits arbitrage'}
                      />
                      <span className="flex-1 text-dense-caption">{a.label}</span>
                      <span
                        className={cn(
                          mono,
                          'text-dense-micro',
                          a.ok ? 'text-secondary-foreground' : 'text-[var(--color-lamp-red)]'
                        )}
                      >
                        {a.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <SmileFitPanel
              sym={sym}
              rows={rows}
              quality={quality}
              fitRow={fitRow}
              expiry={expiry}
              skewPctl={skewPctl}
              handFit={override != null}
            />
          </div>
        ) : tab === 'whatif' ? (
          <div className="flex flex-wrap items-start gap-3">
            <aside className={cn(panel, 'flex max-w-[24rem] flex-[1_1_15rem] flex-col')} aria-label="Hypothesis">
              <header className={panelHead}>
                <span className={cap}>Hypothesis</span>
              </header>
              <div className="flex flex-col gap-3 px-3 py-2.5">
                <SegmentControl
                  ariaLabel="Structure"
                  size="xs"
                  value={struct}
                  onChange={(v) => setStruct(v as WhatIfStructure)}
                  options={Object.entries(WHAT_IF_STRUCTURES).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
                {(
                  [
                    { label: 'spot drift', value: dSpot, min: -6, max: 6, step: 1, shown: `${dSpot >= 0 ? '+' : '−'}${Math.abs(dSpot)}%`, note: 'shifts the whole grid', set: setDSpot },
                    { label: 'IV shift', value: dVol, min: -8, max: 8, step: 1, shown: `${dVol >= 0 ? '+' : '−'}${Math.abs(dVol)}v`, note: 'parallel, no reshape', set: setDVol },
                    { label: 'days held', value: dteHeld, min: 1, max: 37, step: 1, shown: `${dteHeld}d`, note: 'theta only, no re-fit', set: setDteHeld },
                  ] as const
                ).map((x) => (
                  <div key={x.label} className="flex flex-col gap-0.5">
                    <div className="flex items-baseline justify-between">
                      <span className={cn(mono, 'text-dense-caption')}>{x.label}</span>
                      <span className={cn(mono, 'text-dense-caption text-primary')}>{x.shown}</span>
                    </div>
                    <input
                      type="range"
                      min={x.min}
                      max={x.max}
                      step={x.step}
                      value={x.value}
                      onChange={(e) => x.set(Number(e.target.value))}
                      className={sliderCls}
                      aria-label={x.label}
                    />
                    <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>{x.note}</span>
                  </div>
                ))}
                <div className="flex flex-col gap-1.75 border-t border-border pt-2.5">
                  <Button
                    type="button"
                    size="sm"
                    disabled={createHyp.isPending}
                    onClick={() =>
                      createHyp.mutate(
                        {
                          title: `What-if · ${sym} ${WHAT_IF_STRUCTURES[struct]}`,
                          thesis: `Under a parallel surface shift on ${sym} (${expiryLabel}): spot drift ${dSpot >= 0 ? '+' : ''}${dSpot}%, IV ${dVol >= 0 ? '+' : ''}${dVol}v, held ${dteHeld}d — the ${WHAT_IF_STRUCTURES[struct]} grid runs ${grid.worst.toFixed(2)} to +${grid.best.toFixed(2)} in vol-point terms.`,
                          symbols: [sym],
                          origin_page: 'lab:symbol',
                          origin_ref: {
                            struct,
                            expiry,
                            d_spot: dSpot,
                            d_vol: dVol,
                            dte_held: dteHeld,
                            worst: grid.worst,
                            best: grid.best,
                          },
                        },
                        {
                          onSuccess: (h) =>
                            setHypNote(`Hypothesis recorded · ${h.id} — settles on the Hypothesis Board.`),
                          onError: (e) => setHypNote(`Hypothesis failed: ${(e as Error).message}`),
                        }
                      )
                    }
                  >
                    Save as hypothesis
                  </Button>
                  <p className={cn(mono, 'm-0 text-dense-micro leading-normal text-muted-foreground')}>
                    No order exit here by design. A hypothesis carries its asof and lands in the
                    Hypothesis Board; sizing and routing happen in Trade.
                  </p>
                  {hypNote ? (
                    <span className="text-dense-micro text-muted-foreground">{hypNote}</span>
                  ) : null}
                </div>
              </div>
            </aside>

            <section className="flex min-w-0 flex-[999_1_32rem] flex-col gap-3">
              <div className={panel}>
                <header className={panelHead}>
                  <span className="text-dense-body font-semibold">Value under spot × vol</span>
                  <span className="text-dense-meta text-muted-foreground">
                    {WHAT_IF_STRUCTURES[struct]} · {expiryLabel}
                  </span>
                  <span className={cn(mono, 'ml-auto text-dense-meta text-muted-foreground')}>
                    surface shifted, not reshaped
                  </span>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead>
                      <tr>
                        <th className={cn(th, 'text-left')}>spot \ IV</th>
                        {GRID_VOL_COLS.map((c) => (
                          <th key={c} className={cn(th, c === 0 && 'font-bold text-foreground')}>
                            {c >= 0 ? '+' : '−'}
                            {Math.abs(c)}v
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.cells.map((row) => (
                        <tr key={row[0].dSpot}>
                          {/* The baseline row (ΔS = 0) is ink bold (Rev .91 #5): lime
                              is the ticker's, and this is not a ticker. */}
                          <td
                            className={cn(
                              td,
                              'text-left',
                              row[0].dSpot === 0 ? 'font-bold text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {row[0].dSpot >= 0 ? '+' : '−'}
                            {Math.abs(row[0].dSpot)}%
                          </td>
                          {row.map((c) => {
                            const mag = Math.min(1, Math.abs(c.value) / grid.span)
                            const dim = Math.abs(c.value) < grid.span * 0.06
                            return (
                              <td
                                key={c.dVol}
                                className={cn(td, dim ? 'text-muted-foreground' : pnlColorClass(c.value))}
                                style={{
                                  background: `color-mix(in srgb, ${
                                    c.value > 0 ? 'var(--color-profit)' : 'var(--color-loss)'
                                  } ${(mag * 13).toFixed(0)}%, transparent)`,
                                }}
                              >
                                {c.value >= 0 ? '+' : '−'}
                                {Math.abs(c.value).toFixed(2)}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="m-0 border-t border-border px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Each cell is the change in structure value in vol-point terms, holding the
                  surface shape fixed and shifting it. A parallel shift is the honest simple case;
                  a real IV move reshapes the smile, which is what the Surface tab is for.
                </p>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                {wiStats.map((s) => (
                  <div key={s.label} className={cn(panel, 'px-2.75 py-2.25')} title={s.title}>
                    <div className={cap}>{s.label}</div>
                    <div className={cn(mono, 'mt-0.75 type-section font-semibold', s.cls)}>
                      {s.value}
                    </div>
                    <div className={cn(mono, 'text-dense-caption text-muted-foreground')}>{s.src}</div>
                  </div>
                ))}
              </div>
              <CopilotDraftPanel>
                The draft store holds hypothesis reviews, digests and candidate batches; none narrates
                a what-if grid. The grid&rsquo;s corners are the story a draft would tell — the ask
                below answers live with the grid&rsquo;s snapshot.
              </CopilotDraftPanel>
              <div className="flex">
                <AskCopilotButton
                  originPage="lab-symbol"
                  originLabel="Symbol lab · what-if"
                  symbol={sym}
                  snapshot={compactSnapshot({
                    struct,
                    d_spot: dSpot,
                    d_vol: dVol,
                    dte_held: dteHeld,
                    worst: grid.worst,
                    best: grid.best,
                    iv_rank: ivr,
                    earnings_in_days: nextEarnings?.days_away ?? null,
                  })}
                  suggestedPrompt={`Where does this ${WHAT_IF_STRUCTURES[struct]} on ${sym} lose the most, and does a parallel IV shift understate the risk?`}
                />
              </div>
            </section>
          </div>
        ) : (
          <AssumptionLedger sym={sym} settings={settings} onSettings={setSettings} />
        )}
      </SymbolContextGuard>

      <p className="m-0 text-dense-caption text-muted-foreground text-pretty">
        Direction is teal/orange in every domain; red is reserved for a real fault.
      </p>
    </PageShell>
  )
}
