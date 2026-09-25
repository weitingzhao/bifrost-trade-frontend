/**
 * Sections 1–5 of the UI Design System page — what a colour means: direction,
 * entity, category, state, accent (design Rev .53, §14.7 · §14.8).
 */
import { Button } from '@/components/ui/button'
import {
  DenseLinkButton,
  DenseOptionCategoryLabel,
  DenseTag,
  DenseTagButton,
  ExecSourceBadge,
  InlinePnl,
  PnlCell,
  denseEntityFilterChipClass,
} from '@/components/data-display'
import { StatusLamp } from '@/components/StatusLamp'
import { fmtPctSigned } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fmtDollar, unrealizedPnlColorClass } from '@/utils/dailyChange'
import { Code, DsRules, DsSection, DsSwatch, EYEBROW, LINE0, MUTE_MONO } from './uiDsParts'

const noop = () => {}

export function DirectionSection() {
  return (
    <DsSection
      n={1}
      title="Direction — profit · loss · unrealized"
      lede="Realized P&L is green / red, brighter than the lamp green / red so a number and a status dot never share a value (§14.7). Unrealized is orange as a whole column, whatever its sign. Zero or missing is muted. The three direction tokens colour signed numbers only — never a lamp, never a tag."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
        <DsSwatch label="Profit · realized" token="--color-profit" />
        <DsSwatch label="Loss · realized" token="--color-loss" />
        <DsSwatch label="Unrealized · either sign" token="--color-unrealized" />
        <DsSwatch label="Zero / missing" token="--muted-foreground" />
      </div>
      {/* The samples go through the accessors a page calls, not the tokens. */}
      <div className="flex flex-wrap items-baseline gap-4.5 rounded-md bg-background px-2.5 py-2 font-mono text-dense-body tabular-nums">
        <InlinePnl value={1245.5}>{fmtDollar(1245.5)}</InlinePnl>
        <InlinePnl value={-872.25}>{fmtDollar(-872.25)}</InlinePnl>
        <InlinePnl value={0}>{fmtDollar(0)}</InlinePnl>
        <span className={unrealizedPnlColorClass(3120)}>{fmtDollar(3120)} unrl</span>
        <span className={unrealizedPnlColorClass(-540)}>{fmtDollar(-540)} unrl</span>
        <PnlCell dollar={1245.5} pct={2.31} formatDollar={fmtDollar} formatPct={fmtPctSigned} />
        <PnlCell dollar={-872.25} pct={-1.64} formatDollar={fmtDollar} formatPct={fmtPctSigned} />
      </div>
      <DsRules
        use={[
          <>
            <Code>pnlColorClass(v)</Code> · <Code>unrealizedPnlColorClass(v)</Code> · <Code>{'<PnlCell />'}</Code> ·{' '}
            <Code>{'<InlinePnl />'}</Code> — from <Code>@/utils/dailyChange</Code> / <Code>@/components/data-display</Code>
          </>,
        ]}
        never={[
          <>
            <Code>text-emerald-600</Code> / <Code>text-red-600</Code> / hex green-red in pages — guarded by{' '}
            <Code>npm run check:legacy-css</Code> (ratchet)
          </>,
        ]}
      />
    </DsSection>
  )
}

const ENTITIES = [
  { label: 'Symbol / stock', token: '--sk-ticker', sample: 'NVDA · TSLA · BRK.B' },
  { label: 'Option contract, whole', token: '--sk-contract', sample: 'NVDA 250620C140' },
  { label: 'Strategy instance', token: '--sk-instance', sample: 'CC-NVDA-0620' },
] as const

export function EntitySection() {
  return (
    <DsSection
      n={2}
      title="Entity — one ink per financial entity"
      lede="A symbol, a contract and a strategy instance each have one ink, the same on every page (§14.4 · §14.8). Identity columns are text or links, never tag pills. A contract is coloured whole; its underlying inside it is not coloured separately. Lime is the ticker's ink and nothing else."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
        {ENTITIES.map((e) => (
          <div key={e.token} className={cn('flex flex-col gap-1.5 rounded-md border bg-card p-2.5', LINE0)}>
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ background: `var(${e.token})` }} />
              <span className="text-dense-label">{e.label}</span>
              <span className={cn(MUTE_MONO, 'ml-auto')}>{e.token}</span>
            </span>
            <span className="font-mono text-dense-body" style={{ color: `var(${e.token})` }}>
              {e.sample}
            </span>
          </div>
        ))}
      </div>
      {/* Where each ink goes: the same token, the primitive by placement. */}
      <div data-sr-hscroll="1" className={cn('overflow-x-auto rounded-md border bg-card', LINE0)}>
        <table data-sr-table="" className="min-w-[540px]">
          <thead>
            <tr>
              <th data-sr-col="text">Placement</th>
              <th data-sr-col="text">Symbol</th>
              <th data-sr-col="text">Contract</th>
              <th data-sr-col="text">Instance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-sr-col="text">Table identity column</td>
              <td data-sr-col="wrap">
                <Code>DenseLinkButton variant=&quot;stock&quot;</Code>
              </td>
              <td data-sr-col="wrap">
                <Code>DenseLinkButton variant=&quot;option&quot;</Code>
              </td>
              <td data-sr-col="wrap">
                <Code>DenseLinkButton variant=&quot;instance&quot;</Code>
              </td>
            </tr>
            <tr>
              <td data-sr-col="text">Tab · legend · group title</td>
              <td data-sr-col="wrap">
                <Code>text-entity-symbol</Code>
              </td>
              <td data-sr-col="wrap">
                <Code>text-entity-option</Code>
              </td>
              <td data-sr-col="wrap">
                <Code>text-entity-instance</Code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-background px-2.5 py-2">
        <span className={EYEBROW}>Identity column — links</span>
        <DenseLinkButton variant="stock" label="NVDA" ariaLabel="Open NVDA" onClick={noop} />
        <DenseLinkButton variant="option" label="NVDA 250620C140" ariaLabel="Open option contract" onClick={noop} />
        <DenseLinkButton variant="instance" label="CC-NVDA-0620" ariaLabel="Open instance" onClick={noop} />
        <span className={EYEBROW}>read-only</span>
        <strong className="font-semibold text-entity-symbol">CAVA</strong>
      </div>
      <DsRules
        use={[
          <>
            Identity columns: <Code>denseTableEntityCell</Code> + <Code>DenseLinkButton</Code> — full text, wrapping,
            never <Code>truncate</Code>
          </>,
          <>
            <Code>text-entity-symbol</Code> · <Code>-option</Code> · <Code>-instance</Code> resolve to{' '}
            <Code>--sk-ticker</Code> · <Code>--sk-contract</Code> · <Code>--sk-instance</Code> — one value in both
            places
          </>,
        ]}
        never={[
          <>
            <Code>DenseTag variant=&quot;symbol&quot;</Code> pills in an identity column · per-page sky / lime pill CSS ·{' '}
            <Code>text-foreground</Code> over an entity ink · a contract string drawn as a category
          </>,
        ]}
      />
    </DsSection>
  )
}

export function CategorySection() {
  return (
    <DsSection
      n={3}
      title="Category — option category · position category"
      lede="Categories are labels, not entities: they take the category tag and never an entity ink. Option category names the strategy-domain concept; position category is watchlist / portfolio plus the trader's own named groups."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 gap-4 @2xl/page:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className={EYEBROW}>Option category</span>
          {/* Drawn as the app's option-category label rather than the
              design's category pill: this side's contract reserves the pill
              for position categories (asked of Design, Rev .55 receipt). */}
          <div className="flex flex-wrap items-center gap-3">
            <DenseOptionCategoryLabel variant="instance">Instance</DenseOptionCategoryLabel>
            <DenseOptionCategoryLabel variant="strategy">Strategy</DenseOptionCategoryLabel>
            <DenseOptionCategoryLabel variant="opportunity">Opportunity</DenseOptionCategoryLabel>
            <DenseOptionCategoryLabel variant="structure">Structure</DenseOptionCategoryLabel>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-background px-2.5 py-2">
            <DenseLinkButton variant="strategy" label="Covered Call" ariaLabel="Open strategy" onClick={noop} />
            <DenseOptionCategoryLabel variant="opportunity">DAVE Covered Call 10% OTM</DenseOptionCategoryLabel>
            <DenseOptionCategoryLabel variant="structure">Cash Secured Put</DenseOptionCategoryLabel>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={EYEBROW}>Position category</span>
          <div className="flex flex-wrap gap-1.5">
            {['watchlist', 'portfolio', 'Tech', 'Watching'].map((c) => (
              <DenseTag key={c} variant="category" size="pill">
                {c}
              </DenseTag>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-background px-2.5 py-2">
            <div className="min-w-[180px] rounded-sm border-y border-border bg-secondary/60 px-2 py-1.5">
              <span className="text-dense-label font-semibold text-entity-category">watchlist</span>
            </div>
            <Code>{'<GroupHeaderRow variant="category" />'}</Code>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-background px-2.5 py-2">
            <span className={EYEBROW}>filter</span>
            <DenseTagButton
              variant="category"
              size="pill"
              className={denseEntityFilterChipClass('category', false)}
              onClick={noop}
              aria-pressed={false}
            >
              watchlist
            </DenseTagButton>
            <DenseTagButton
              variant="category"
              size="pill"
              className={denseEntityFilterChipClass('category', true)}
              onClick={noop}
              aria-pressed
            >
              portfolio
            </DenseTagButton>
          </div>
        </div>
      </div>
      <DsRules
        use={[
          <>
            Option category in a column: <Code>DenseLinkButton</Code> or <Code>DenseOptionCategoryLabel</Code> — its
            semantic colour, no pill
          </>,
          <>
            Position category: <Code>DenseTag variant=&quot;category&quot;</Code> in cells and filters; a group header
            is <Code>GroupHeaderRow variant=&quot;category&quot;</Code> (label, raised band, border-y — no pill); a
            filter chip is grey until chosen (<Code>denseEntityFilterChipClass</Code>)
          </>,
        ]}
        never={[
          <>
            A contract string as a strategy or instance tag · category purple beside the ticker ink in one control ·
            account / range / status as category chips (those are neutral SegmentControl)
          </>,
        ]}
      />
    </DsSection>
  )
}

const TAGS = [
  { v: 'success', label: 'filled', use: 'done, in force, landed' },
  { v: 'warning', label: 'partial', use: 'needs attention, a named gap' },
  { v: 'danger', label: 'rejected', use: 'a real fault or a stop' },
  { v: 'info', label: 'working', use: 'in progress, informational' },
  { v: 'neutral', label: 'draft', use: 'no verdict, unknown, not started' },
] as const

const LAMPS = [
  { lamp: 'green', label: 'ok', use: 'healthy — trade' },
  { lamp: 'yellow', label: 'degraded', use: 'trade with the stated caveat' },
  { lamp: 'red', label: 'down', use: 'stop — a probed failure' },
  { lamp: 'gray', label: 'unknown', use: 'unprobed or unrecognised — not a failure' },
] as const

export function StateSection() {
  return (
    <DsSection
      n={4}
      title="State — tags and lamps"
      lede="A tag names a row's state; a lamp names a process's health. The variant carries the meaning, not the position. An unprobed or unrecognised reading is grey — never mapped onto red."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="grid grid-cols-1 gap-4 @2xl/page:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className={EYEBROW}>DenseTag</span>
          {TAGS.map((t) => (
            <div key={t.v} className="grid grid-cols-[96px_90px_minmax(0,1fr)] items-center gap-2.5">
              <span className="inline-flex">
                <DenseTag variant={t.v} size="cell">
                  {t.label}
                </DenseTag>
              </span>
              <span className={MUTE_MONO}>{t.v}</span>
              <span className="text-dense-label text-[var(--sk-mute2)]">{t.use}</span>
            </div>
          ))}
          <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5">
            <span className={MUTE_MONO}>exec source</span>
            <span className="flex flex-wrap gap-1.5">
              <ExecSourceBadge source="flex_trades" />
              <ExecSourceBadge source="tws_client" />
              <ExecSourceBadge source="journal_closed" />
              <ExecSourceBadge source="manual" />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className={EYEBROW}>HealthLamp</span>
          {LAMPS.map((l) => (
            <div key={l.lamp} className="grid grid-cols-[20px_70px_minmax(0,1fr)] items-center gap-2.5">
              <StatusLamp lamp={l.lamp} variant="dot" title={l.label} />
              <span className={MUTE_MONO}>{l.lamp}</span>
              <span className="text-dense-label text-[var(--sk-mute2)]">{l.use}</span>
            </div>
          ))}
        </div>
      </div>
      <DsRules
        use={[
          <>
            <Code>{'<DenseTag variant="…" />'}</Code> for a row's state · <Code>{'<ExecSourceBadge />'}</Code> for where a
            fill came from · <Code>HealthLamp</Code> for a process — daemon, IB link, API, Redis / PG
          </>,
        ]}
        never={[
          <>
            A lamp for an order's status (a tag), for freshness (text) or for a flag (a <Code>Switch</Code>) · a
            hand-written badge per page · grey readings mapped to red
          </>,
        ]}
      />
    </DsSection>
  )
}

export function AccentSection() {
  return (
    <DsSection
      n={5}
      title="Accent — the one active thing"
      lede="Violet is spent on the selected route, the primary action and the focus ring — one per view. It is not a data colour and never marks a number."
      bodyClassName="flex flex-wrap items-center gap-2.5"
    >
      <Button size="sm" onClick={noop}>
        Primary action
      </Button>
      <Button size="sm" variant="outline" onClick={noop}>
        Secondary
      </Button>
      <span className="border-l-2 border-[var(--sk-accent)] bg-[color-mix(in_srgb,var(--sk-accent)_8%,transparent)] px-2.5 py-1 text-dense-label">
        Active nav row
      </span>
      <span className="rounded px-2.5 py-1 text-dense-label outline-2 outline-offset-1 outline-[var(--sk-accent)] outline-solid">
        Focus ring
      </span>
      <span className={cn(MUTE_MONO, 'ml-auto')}>--sk-accent · --primary maps to it in Trade</span>
    </DsSection>
  )
}
