/**
 * Sections 6–10 of the UI Design System page — how a page is set: density,
 * surfaces, filters, the states of not knowing, and the checklist a page is
 * walked against (design Rev .53).
 */
import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import {
  DenseDataTable,
  DenseLinkButton,
  DenseOptionCategoryLabel,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  DenseTagButton,
  ExecSourceBadge,
  IconActionButton,
  PnlCell,
  SegmentControl,
  denseTableEntityLink,
  type SegmentOption,
} from '@/components/data-display'
import { ViewState, type ViewStateKind } from '@bifrost/ui'
import { fmtPctSigned } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fmtDollar, unrealizedPnlColorClass } from '@/utils/dailyChange'
import { Code, DsRules, DsSection, EYEBROW, LINE0, MUTE_MONO } from './uiDsParts'

const noop = () => {}

const SCALE = [
  { cls: 'text-dense-body', px: '13px', use: 'Cells and page copy' },
  { cls: 'text-dense-label', px: '12px', use: 'Form labels, row names' },
  { cls: 'text-dense-meta', px: '11px', use: 'Secondary line, units' },
  { cls: 'text-dense-caption', px: '10px', use: 'Column heads, captions' },
  { cls: 'text-dense-micro', px: '9px', use: 'Stamps, badges' },
] as const

const DEMO = [
  { symbol: 'NVDA', contract: 'NVDA 250620C140', strategy: 'Covered Call', instance: 'CC-NVDA-0620', source: 'flex_trades', day: 1245.5, pct: 2.31, unrl: 3120 },
  { symbol: 'TSLA', contract: 'TSLA 250718P200', strategy: 'Wheel', instance: 'WH-TSLA-0718', source: 'tws_client', day: -872.25, pct: -1.64, unrl: -540 },
  { symbol: 'AAPL', contract: '—', strategy: 'Buy & Hold', instance: 'BH-AAPL-CORE', source: 'journal_closed', day: 0, pct: 0, unrl: 12480 },
  { symbol: 'BRK.B', contract: 'BRK.B 251219C500000', strategy: 'Long Gamma Scalping NVDA Straddle', instance: 'GS-NVDA-STRADDLE-2025-Q4-HOST', source: 'manual', day: 42, pct: 0.12, unrl: -18 },
] as const

export function DensitySection() {
  return (
    <DsSection
      n={6}
      title="Density & type"
      lede="Body is 13px DM Sans. Anything compared digit by digit — prices, Greeks, quantities, contract symbols — is JetBrains Mono with tabular figures, right-aligned. Identity columns show full text and wrap inside the cell; they never ellipsis."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1.5">
        {SCALE.map((s) => (
          <div key={s.cls} className="grid grid-cols-[130px_40px_minmax(0,1fr)] items-baseline gap-2">
            <span className={MUTE_MONO}>{s.cls}</span>
            <span className={MUTE_MONO}>{s.px}</span>
            <span className={s.cls}>{s.use}</span>
          </div>
        ))}
      </div>
      {/* The composite: every rule above in one table, on the §17 standard. */}
      <DenseDataTable standard>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead col="entity">Symbol</DenseTableHead>
            <DenseTableHead col="entity">Contract</DenseTableHead>
            <DenseTableHead col="wrap">Strategy · instance</DenseTableHead>
            <DenseTableHead col="tag">Source</DenseTableHead>
            <DenseTableHead col="num">Day $ / %</DenseTableHead>
            <DenseTableHead col="num">Unrealized</DenseTableHead>
            <DenseTableHead col="act">Actions</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {DEMO.map((r) => (
            <DenseTableRow key={r.symbol}>
              <DenseTableCell col="entity">
                <DenseLinkButton variant="stock" label={r.symbol} ariaLabel={`Open ${r.symbol}`} onClick={noop} className={denseTableEntityLink} />
              </DenseTableCell>
              <DenseTableCell col="entity">
                {r.contract === '—' ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <DenseLinkButton variant="option" label={r.contract} ariaLabel={`Open ${r.contract}`} onClick={noop} className={denseTableEntityLink} />
                )}
              </DenseTableCell>
              <DenseTableCell col="wrap">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
                    {r.strategy}
                  </DenseOptionCategoryLabel>
                  <DenseLinkButton variant="instance" label={r.instance} ariaLabel={`Open ${r.instance}`} onClick={noop} className={denseTableEntityLink} />
                </div>
              </DenseTableCell>
              <DenseTableCell col="tag">
                <ExecSourceBadge source={r.source} />
              </DenseTableCell>
              <DenseTableCell col="num">
                <PnlCell dollar={r.day} pct={r.pct} formatDollar={fmtDollar} formatPct={fmtPctSigned} />
              </DenseTableCell>
              <DenseTableCell col="num" className={unrealizedPnlColorClass(r.unrl)}>
                {fmtDollar(r.unrl)}
              </DenseTableCell>
              <DenseTableCell col="act">
                <span className="inline-flex items-center gap-0.5">
                  <IconActionButton title="Edit" ariaLabel="Edit row" onClick={noop}>
                    <Pencil className="h-3.5 w-3.5" />
                  </IconActionButton>
                  <IconActionButton title="Delete" ariaLabel="Delete row" tone="danger" onClick={noop}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconActionButton>
                </span>
              </DenseTableCell>
            </DenseTableRow>
          ))}
        </DenseTableBody>
      </DenseDataTable>
      <DsRules
        use={[
          <>
            The <Code>DenseDataTable</Code> family with <Code>standard</Code> and a column type on every head and cell (
            <Code>entity · num · tag · text · wrap · act</Code>, §17.2) · the five-stop scale above
          </>,
        ]}
        never={[
          <>
            <Code>truncate</Code> / <Code>line-clamp</Code> on an identity cell (the long row above wraps) · shadcn{' '}
            <Code>Table</Code> or a bare <Code>{'<table>'}</Code> for data · <Code>{'text-[Npx]'}</Code> (a ratchet in{' '}
            <Code>check:legacy-css</Code>)
          </>,
        ]}
      />
    </DsSection>
  )
}

export function SurfacesSection() {
  const label = cn(MUTE_MONO, 'block')
  return (
    <DsSection
      n={7}
      title="Surfaces"
      lede="One window ground, then grouped content on it (Rev .61–.62). The page is transparent — the floating sidebar, the top bar and the page share the body's ground — and a group is a fill, not a frame. Four roles; none draws a neutral outline."
    >
      <div className="flex flex-col gap-2 p-1">
        <span className={label}>ground · the window — PageShell is transparent</span>
        <div className="flex flex-col gap-2 border p-3 mat-card">
          <span className={label}>group · Card / mat-card — ink 4%, radius 12, no frame</span>
          <div className="flex flex-col gap-2 border p-3 mat-card">
            <span className={label}>nested group · reads a step up (8%)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border text-dense-meta text-[var(--sk-ticker)] mat-tag">mat-tag</span>
            <button type="button" className="h-6 border px-2.5 text-dense-meta mat-btn">mat-btn</button>
            <input aria-label="mat-field sample" className="h-6 w-28 border px-2 text-dense-meta mat-field" placeholder="mat-field" />
          </div>
          <span className={cn(label, 'border-t pt-2')}>rule · ink 6% — dividers and table lines inside a page</span>
        </div>
      </div>
    </DsSection>
  )
}

const SEGMENTS: SegmentOption[] = [
  { value: 'host', label: 'Host' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'all', label: 'All' },
]

export function FiltersSection() {
  const [seg, setSeg] = useState('host')
  return (
    <DsSection
      n={8}
      title="Filters"
      lede="Up to five fixed options: SegmentControl. A longer list or a form: Select. Chip filters over tags: DenseTagButton. Never a native select or per-page pill CSS."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-4.5">
        <SegmentControl size="xs" options={SEGMENTS} value={seg} onChange={setSeg} ariaLabel="Account" />
        <span className="flex gap-1.5">
          <DenseTagButton variant="category" size="pill" onClick={noop}>
            Tech
          </DenseTagButton>
          <DenseTagButton variant="category" size="pill" onClick={noop}>
            Watching
          </DenseTagButton>
          <DenseTagButton variant="neutral" size="pill" onClick={noop}>
            Clear
          </DenseTagButton>
        </span>
      </div>
      <div data-sr-toolbar="" className="flex items-center gap-3">
        <span data-sr-tb="label">Filters</span>
        <SegmentControl size="xs" options={SEGMENTS} value={seg} onChange={setSeg} ariaLabel="Filter bar demo" />
        <span data-sr-tb="meta">the toolbar under a page head (§17)</span>
      </div>
      <DsRules
        use={[
          <>
            <Code>SegmentControl</Code> for five or fewer · shadcn <Code>{'<Select>'}</Code> for a list or a form ·{' '}
            <Code>DenseTagButton</Code> for chips over tags · a toolbar is <Code>data-sr-toolbar</Code> with{' '}
            <Code>ToolbarClear</Code> when anything is set
          </>,
        ]}
        never={[
          <>
            A native <Code>{'<select>'}</Code> · hand-rolled pill CSS · <Code>bg-primary</Code> toggle buttons · a
            filter bar with its own ground
          </>,
        ]}
      />
    </DsSection>
  )
}

const STATES: { kind: ViewStateKind; title?: string; detail: string; action?: string }[] = [
  { kind: 'loading', detail: 'First load: a skeleton, and only after 300ms.' },
  { kind: 'empty', title: 'No open positions', detail: 'The account holds nothing right now. Open a position to see it here.' },
  { kind: 'failed', title: 'Positions did not load', detail: 'The Trade API timed out; nothing below was evaluated.' },
  { kind: 'filtered', title: 'No rows match', detail: 'Filter: Secondary · Wheel. Clear filters to see all 14.' },
  { kind: 'stale', title: 'Showing the last reading', detail: 'The refresh failed at 14:02 ET; the figures are from 13:57.' },
  { kind: 'signedout', detail: 'The Research API wants a sign-in before it answers.' },
  { kind: 'notwired', detail: 'No endpoint serves this reading yet — named, not drawn as zero.' },
]

export function NotKnowingSection() {
  return (
    <DsSection
      n={9}
      title="Not knowing — the §17 states"
      lede="Loading, failed, empty and filtered-to-nothing are separate states. An empty result is a fact about the query; a failed fetch is a fact about the system. Each says which it is and offers the action that ends it."
      bodyClassName="flex flex-col gap-3"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
        {STATES.map((s) => (
          <div key={s.kind} className={cn('flex flex-col gap-1 rounded-md border bg-card p-3', LINE0)}>
            <span className={EYEBROW}>{s.kind}</span>
            <ViewState kind={s.kind} title={s.title} detail={s.detail} onAction={s.kind === 'loading' ? undefined : noop} />
          </div>
        ))}
      </div>
      <DsRules
        use={[
          <>
            <Code>ViewState</Code> from <Code>@bifrost/ui</Code> with <Code>lib/viewState.ts</Code> (
            <Code>sourceState</Code>, <Code>failedDetail</Code>) — a failure reported once, a failed refresh as a strip,
            and <Code>filtered</Code>&rsquo;s action resetting every axis · DEV previews with <Code>?preview=</Code>
          </>,
        ]}
        never={[<>A bare &ldquo;Loading…&rdquo; · an empty <Code>{'<div>'}</Code> per page · a zero drawn where nothing was read</>]}
      />
    </DsSection>
  )
}

/** `guard` only where `check:legacy-css` really checks it; the rest is read against the samples. */
const CHECKS: [string, 'guard' | 'review'][] = [
  ['Every numeric column is mono, tabular, right-aligned', 'review'],
  ['P&L colour comes from the accessor (pnlColorClass · PnlCell · InlinePnl), never a hex or a Tailwind hue', 'guard'],
  ['Unrealized is orange as a whole column, either sign', 'review'],
  ['A symbol, contract or instance uses its entity ink and is text or a link, not a tag', 'review'],
  ['Lamps and tags never take a direction colour; direction colours never mark a lamp or tag', 'guard'],
  ['Grey means unknown / unprobed; nothing unrecognised renders red', 'review'],
  ['Loading · failed · empty · filtered — and stale, signed out, not wired — each has its own copy and action', 'review'],
  ['Violet appears once per view — the active route, the primary action or focus', 'review'],
  ['Icon-only controls carry both title and aria-label', 'review'],
  ['No legacy classes (replay-*, pnl-positive / -negative), no *Legacy.css, no :global()', 'guard'],
  ['Type from the five-stop dense scale; no text-[Npx]', 'guard'],
  ['Data tables are the DenseDataTable family; identity cells wrap, never truncate', 'review'],
  ['Row actions are IconActionButton; a destructive one confirms in ConfirmDialog, never window.confirm', 'review'],
  ['Page root is PageShell with PageHead; surfaces follow the three levels (§7)', 'review'],
  ['A lamp marks process health only — not an order, not freshness', 'review'],
  ['A new colour is a token in src/index.css first — never an inline hex in a page', 'review'],
]

export function ChecklistSection() {
  return (
    <DsSection
      n={10}
      title="Compliance checklist"
      aside
      lede={
        <>
          Walk a page against these. Rows marked guard run in <span className="font-mono">npm run check:legacy-css</span>;
          the rest are reviewed against the samples above.
        </>
      }
      bodyClassName="p-0"
    >
      {CHECKS.map(([text, how], i) => (
        <div
          key={text}
          className="grid grid-cols-[28px_minmax(0,1fr)_70px] items-baseline gap-2.5 border-b border-[color-mix(in_srgb,var(--sk-line)_55%,transparent)] px-3.5 py-2"
        >
          <span className="font-mono text-dense-meta text-muted-foreground">{i + 1}</span>
          <span className="text-dense-label leading-normal text-pretty">{text}</span>
          <span className="inline-flex justify-end">
            <DenseTag variant={how === 'guard' ? 'info' : 'neutral'} size="cell">
              {how}
            </DenseTag>
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-1.5 px-3.5 py-2.5">
        <code className="rounded-md bg-background px-3 py-2 font-mono text-dense-label text-foreground">
          npm run lint && npm run build && npm run check:legacy-css
        </code>
        <span className="text-dense-meta text-muted-foreground">
          Sources: <Code>docs/DENSE_UI.md</Code> · <Code>.cursor/rules/dense-ui-system.mdc</Code> · <Code>src/index.css</Code>{' '}
          (tokens) · <Code>scripts/check-legacy-css.sh</Code> (guards) · <Code>@bifrost/ui/styles/patterns</Code> (§17)
        </span>
      </div>
    </DsSection>
  )
}
