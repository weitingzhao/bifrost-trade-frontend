/**
 * The Method tab — the design's six-assumption ledger, transcribed whole.
 * Each choice carries what it drives, where it comes from, and whether
 * anything was ever measured behind it.
 */
import { DenseTag } from '@bifrost/ui'
import { SegmentControl } from '@/components/data-display'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { CopilotDraftPanel } from '@/components/research/CopilotDraftPanel'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cn } from '@/lib/utils'
import { cap, mono, panel, panelHead } from './labSymbolUi'


interface AssumptionDef {
  key: string
  title: string
  opts: [string, string][]
  why: string
  effect: (v: string) => string
  drives: string
  source: string
  measured: boolean
}

const ASSUMPTIONS: AssumptionDef[] = [
  {
    key: 'gex',
    title: 'GEX aggregation basis',
    opts: [
      ['oi', 'open interest'],
      ['vol', 'day volume'],
    ],
    why: 'Gamma exposure can be summed over open interest or over the day’s volume. OI answers "what is hedged"; volume answers "what got hedged today". They disagree most on the days that matter.',
    effect: (v) => (v === 'oi' ? 'stock of hedges' : 'flow of hedges'),
    drives: 'Dealer levels · zero-gamma flip, call/put wall',
    source: 'features.option_metric_gex_daily',
    measured: true,
  },
  {
    key: 'dealer',
    title: 'Dealer positioning assumption',
    opts: [
      ['short_gamma', 'dealers short'],
      ['net_oi', 'net OI'],
    ],
    why: 'GEX has no sign without an assumption about who holds what. The convention here is that dealers are short customer options; it is an assumption, not a measurement.',
    effect: (v) => (v === 'short_gamma' ? 'sign convention applied' : 'no sign claimed'),
    drives: 'Dealer levels · the whole sign of the reading',
    source: 'assumption · no vendor field exists',
    measured: false,
  },
  {
    key: 'flow',
    title: 'Order-flow proxy construction',
    opts: [
      ['oi_vol', 'OI × volume'],
      ['vol_only', 'volume only'],
    ],
    why: 'The aggressor side is not in the data. The tilt is built from OI change against volume, which cannot distinguish an opening buy from a closing sell.',
    effect: () => 'proxy tilt, aggressor unknown',
    drives: 'Flow · order_sentiment lens',
    source: 'features.option_flow_* · aggressor never measured',
    measured: false,
  },
  {
    key: 'pin',
    title: 'Pin distance denominator',
    opts: [
      ['oi', 'largest OI'],
      ['max_pain', 'max pain'],
    ],
    why: 'Pin proximity can be measured against the largest-OI strike or the max-pain strike. On a thin chain these are often different strikes.',
    effect: (v) => (v === 'oi' ? 'single strike' : 'payout-weighted'),
    drives: 'opex_pin lens · pin magnet flag',
    source: 'features.option_metric_max_pain_daily',
    measured: true,
  },
  {
    key: 'win',
    title: 'Calibration window',
    opts: [
      ['60', '60d'],
      ['252', '252d'],
    ],
    why: 'A percentile needs a window. Sixty days follows the current regime; 252 days is stable but slow to admit a regime change. Under 60 sessions the lab marks the reading as a caveat rather than a band.',
    effect: (v) => (v === '60' ? 'regime-following' : 'slow, stable'),
    drives: 'IV rank, VRP, skew percentile · all bands',
    source: 'features.option_metric_* · rolling',
    measured: true,
  },
  {
    key: 'quote',
    title: 'Quote used for market IV',
    opts: [
      ['mid', 'mid'],
      ['last', 'last trade'],
    ],
    why: 'Mid is the default. On strikes whose OI is under a thousand the mid is mostly a modelled midpoint rather than a traded price, which is why those rows carry a warn weight above.',
    effect: (v) => (v === 'mid' ? 'thin strikes down-weighted' : 'stale prints possible'),
    drives: 'Surface · fit residuals and RMSE',
    source: 'raw_market.option_snapshot · judged by Ops',
    measured: true,
  },
]


export function AssumptionLedger({
  sym,
  settings,
  onSettings,
}: {
  sym: string
  settings: Record<string, string>
  onSettings: (next: Record<string, string>) => void
}) {
  const unmeasured = ASSUMPTIONS.filter((a) => !a.measured)
  return (
          <div className="space-y-3">
            <div className={panel}>
              <header className={panelHead}>
                <span className="text-dense-body font-semibold">Assumption ledger</span>
                <span className="text-dense-caption text-muted-foreground">
                  every reading Trade shows rests on one of these
                </span>
                <span className={cn(mono, 'ml-auto text-dense-caption text-muted-foreground')}>
                  {ASSUMPTIONS.length} assumptions · {unmeasured.length} with nothing measured
                  behind them
                </span>
              </header>
              {ASSUMPTIONS.map((a) => (
                <div
                  key={a.key}
                  className="grid grid-cols-1 items-start gap-x-4 gap-y-2.5 border-b border-border/60 px-3 py-2.75 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-1.75">
                      <span className="text-dense-body font-semibold">{a.title}</span>
                      <DenseTag size="cell" variant={a.measured ? 'neutral' : 'warning'}>
                        {a.measured ? 'measured' : 'assumed'}
                      </DenseTag>
                    </span>
                    <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
                      {a.why}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className={cap}>setting</span>
                    <SegmentControl
                      ariaLabel={a.title}
                      size="xs"
                      value={settings[a.key]}
                      onChange={(v) => onSettings({ ...settings, [a.key]: v })}
                      options={a.opts.map(([value, label]) => ({ value, label }))}
                    />
                    <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                      {a.effect(settings[a.key])}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className={cap}>drives · provenance</span>
                    <span className="text-dense-caption">{a.drives}</span>
                    <span
                      className={cn(
                        mono,
                        'text-dense-micro',
                        a.measured ? 'text-muted-foreground' : 'text-warning'
                      )}
                    >
                      {a.source}
                    </span>
                  </div>
                </div>
              ))}
              <p className="m-0 px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                Changing a setting here changes what the lab computes, not what Trade reports.
                Trade reads the committed assumption set; a change becomes a proposal until it is
                accepted, so the two sides never quietly disagree.
              </p>
            </div>
            <CopilotDraftPanel>
              No per-run draft store exists yet — the unmeasured assumptions are what a draft
              would lead with. The panel keeps its seat; the ask below carries the ledger&rsquo;s
              open contracts live.
            </CopilotDraftPanel>
            <div className="flex">
              <AskCopilotButton
                originPage="lab-symbol"
                originLabel="Symbol lab · method"
                symbol={sym}
                snapshot={compactSnapshot({
                  settings,
                  unmeasured: unmeasured.map((a) => a.key),
                })}
                suggestedPrompt={`Which of the ${ASSUMPTIONS.length} assumptions behind ${sym}'s dealer-level readings would flip the sign of the reading if wrong?`}
              />
            </div>
          </div>
  )
}
