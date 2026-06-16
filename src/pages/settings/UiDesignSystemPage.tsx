import { type ReactNode } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseLinkButton,
  DenseOptionCategoryLabel,
  DenseTag,
  DenseTagButton,
  ExecSourceBadge,
  denseEntityFilterChipClass,
  IconActionButton,
  InlinePnl,
  PnlCell,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtDollar, fmtPct, unrealizedPnlColorClass } from '@/utils/dailyChange'
import { cn } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { PromptCopyDialog } from './uiDesignSystem/PromptCopyDialog'
import type { PromptSpecId } from './uiDesignSystem/promptSpecs'

// ─── Section nav ─────────────────────────────────────────────────────────────

const DESIGN_SYSTEM_SECTIONS = [
  { id: 'pnl-semantics', label: 'PnL' },
  { id: 'entity-asset-class', label: 'Entity' },
  { id: 'option-category', label: 'Option Category' },
  { id: 'position-category', label: 'Position Category' },
  { id: 'status-tags', label: 'Status' },
  { id: 'density', label: 'Density' },
  { id: 'surfaces', label: 'Surfaces' },
  { id: 'compliance', label: 'Compliance' },
] as const

function DesignSystemQuickNav() {
  return (
    <nav
      aria-label="Design system sections"
      className="sticky top-0 z-10 rounded-lg border border-border bg-secondary/95 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-secondary/85"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {DESIGN_SYSTEM_SECTIONS.map(section => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-md border border-border bg-background/70 px-2.5',
              'text-xs font-medium text-foreground transition-colors hover:bg-background hover:text-primary',
            )}
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

// ─── Building blocks ─────────────────────────────────────────────────────────

function SectionCard({
  id,
  title,
  description,
  specId,
  promptLabel = 'Copy Prompt',
  children,
}: {
  id: string
  title: string
  description?: string
  specId?: PromptSpecId
  promptLabel?: string
  children: ReactNode
}) {
  return (
    <Card id={id} variant="elevated" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          {specId ? <PromptCopyDialog specId={specId} label={promptLabel} /> : null}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

function CodeRef({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
      {children}
    </code>
  )
}

function TokenSwatch({ label, varName }: { label: string; varName: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2">
      <span
        className="h-5 w-5 shrink-0 rounded-full border border-border/60"
        style={{ background: `var(${varName})` }}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{varName}</p>
      </div>
    </div>
  )
}

function PlannedTokenSwatch({
  label,
  color,
  note,
}: {
  label: string
  color: string
  note: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-dashed border-border bg-background px-2.5 py-2">
      <span
        className="h-5 w-5 shrink-0 rounded-full border border-border/60"
        style={{ background: color }}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{note}</p>
      </div>
    </div>
  )
}

function SampleBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Demo data ───────────────────────────────────────────────────────────────

const noop = () => {}

interface DemoRow {
  symbol: string
  contract: string
  strategy: string
  instance: string
  source: string
  dailyDollar: number
  dailyPct: number
  unrealized: number
}

const DEMO_ROWS: DemoRow[] = [
  {
    symbol: 'NVDA',
    contract: 'NVDA 250620C140',
    strategy: 'Covered Call',
    instance: 'CC-NVDA-0620',
    source: 'flex_trades',
    dailyDollar: 1245.5,
    dailyPct: 2.31,
    unrealized: 3120,
  },
  {
    symbol: 'TSLA',
    contract: 'TSLA 250718P200',
    strategy: 'Wheel',
    instance: 'WH-TSLA-0718',
    source: 'tws_client',
    dailyDollar: -872.25,
    dailyPct: -1.64,
    unrealized: -540,
  },
  {
    symbol: 'AAPL',
    contract: '—',
    strategy: 'Buy & Hold',
    instance: 'BH-AAPL-CORE',
    source: 'journal_closed',
    dailyDollar: 0,
    dailyPct: 0,
    unrealized: 12480,
  },
  {
    symbol: 'BRK.B',
    contract: 'BRK.B 251219C500000',
    strategy: 'Long Gamma Scalping NVDA Straddle',
    instance: 'GS-NVDA-STRADDLE-2025-Q4-HOST',
    source: 'manual',
    dailyDollar: 42,
    dailyPct: 0.12,
    unrealized: -18,
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function UiDesignSystemPage() {
  return (
    <PageShell className="w-full min-w-0 space-y-4 pb-10">
      <PageHeader
        breadcrumb={
          <p className="text-xs font-medium text-primary/90">Settings / Configuration</p>
        }
        title="UI Design System"
        description="Site-wide business semantics — PnL colors, entity asset classes, option category, position category, status tags, density. Same token everywhere; primitive varies by placement. Use this page to validate compliance."
        actions={
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
            Visual contract
          </Badge>
        }
      />

      <DesignSystemQuickNav />

      {/* 1 — PnL semantics */}
      <SectionCard
        id="pnl-semantics"
        title="1 · PnL Semantics — profit green / loss red / unrealized yellow"
        specId="pnl"
        description="Realized PnL uses classic green (profit) and red (loss) — same tokens as --color-success / --color-danger. Unrealized PnL is always yellow — never green/red. Zero or missing values are muted. Pages never pick these colors directly; they call the accessor functions."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TokenSwatch label="Profit (realized)" varName="--color-profit" />
          <TokenSwatch label="Loss (realized)" varName="--color-loss" />
          <TokenSwatch label="Unrealized" varName="--color-unrealized" />
          <TokenSwatch label="Zero / missing" varName="--muted-foreground" />
        </div>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Inline</span>
          <InlinePnl value={1245.5}>
            <span className="font-mono tabular-nums">{fmtDollar(1245.5)}</span>
          </InlinePnl>
          <InlinePnl value={-872.25}>
            <span className="font-mono tabular-nums">{fmtDollar(-872.25)}</span>
          </InlinePnl>
          <InlinePnl value={0}>
            <span className="font-mono tabular-nums">{fmtDollar(0)}</span>
          </InlinePnl>
          <span className={cn('font-mono tabular-nums', unrealizedPnlColorClass(3120))}>
            {fmtDollar(3120)} unrl
          </span>
          <span className={cn('font-mono tabular-nums', unrealizedPnlColorClass(-540))}>
            {fmtDollar(-540)} unrl
          </span>
        </SampleBox>

        <SampleBox className="gap-6">
          <span className="text-xs font-semibold uppercase tracking-wide">PnlCell ($ / %)</span>
          <PnlCell dollar={1245.5} pct={2.31} formatDollar={fmtDollar} formatPct={fmtPct} />
          <PnlCell dollar={-872.25} pct={-1.64} formatDollar={fmtDollar} formatPct={fmtPct} />
        </SampleBox>

        <div className="space-y-1 text-xs">
          <p>
            ✅ <CodeRef>pnlColorClass(v)</CodeRef> · <CodeRef>unrealizedPnlColorClass(v)</CodeRef> ·{' '}
            <CodeRef>{'<PnlCell />'}</CodeRef> · <CodeRef>{'<InlinePnl />'}</CodeRef> — from{' '}
            <CodeRef>@/utils/dailyChange</CodeRef> / <CodeRef>@/components/data-display</CodeRef>
          </p>
          <p>
            ❌ <CodeRef>text-emerald-600</CodeRef> / <CodeRef>text-red-600</CodeRef> / hex green-red
            in pages — guarded by <CodeRef>npm run check:legacy-css</CodeRef> (ratchet)
          </p>
        </div>
      </SectionCard>

      {/* 2 — Entity asset class (Stock / Option / Fixed Income / Cash-like) */}
      <SectionCard
        id="entity-asset-class"
        title="2 · Entity — Stock / Option / Fixed Income / Cash-like"
        specId="entity"
        description="Four asset-class entities share distinct token colors site-wide. Strategy / Instance / Opportunity / Structure are Option Category (§3), not Entity. Table identity columns use link/text — never Tag pills."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TokenSwatch label="Stock" varName="--color-entity-symbol" />
          <TokenSwatch label="Option" varName="--color-entity-option" />
          <PlannedTokenSwatch
            label="Fixed Income"
            color="oklch(0.72 0.14 75)"
            note="--color-entity-fixed-income (planned)"
          />
          <PlannedTokenSwatch
            label="Cash-like"
            color="oklch(0.68 0.12 305)"
            note="--color-entity-cash-like (planned)"
          />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Placement matrix — same token, primitive by context
        </p>
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full min-w-[540px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-2.5 py-2 font-semibold text-foreground">Context</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Stock</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Option</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Fixed Income</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Cash-like</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              <tr className="border-b border-border/60">
                <td className="px-2.5 py-2 font-medium text-foreground">Table identity column</td>
                <td className="px-2.5 py-2">
                  <CodeRef>DenseLinkButton variant=&quot;stock&quot;</CodeRef> or{' '}
                  <CodeRef>strong + text-entity-symbol</CodeRef>
                </td>
                <td className="px-2.5 py-2">
                  <CodeRef>DenseLinkButton variant=&quot;option&quot;</CodeRef>
                </td>
                <td className="px-2.5 py-2 text-muted-foreground">
                  Planned entity link / label (token pending)
                </td>
                <td className="px-2.5 py-2 text-muted-foreground">
                  Planned entity link / label (token pending)
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-2.5 py-2 font-medium text-foreground">Tab / chart legend / group title</td>
                <td className="px-2.5 py-2">
                  <CodeRef>text-entity-symbol</CodeRef> label
                </td>
                <td className="px-2.5 py-2">
                  <CodeRef>text-entity-option</CodeRef> label
                </td>
                <td className="px-2.5 py-2 text-muted-foreground">amber entity color (planned)</td>
                <td className="px-2.5 py-2 text-muted-foreground">violet entity color (planned)</td>
              </tr>
              <tr>
                <td className="px-2.5 py-2 font-medium text-foreground">Forbidden in identity column</td>
                <td className="px-2.5 py-2 text-destructive/90" colSpan={4}>
                  <CodeRef>DenseTag variant=&quot;symbol&quot;</CodeRef> pill · Position Category purple pill
                  (§4) · generic gray filter pills ·{' '}
                  <CodeRef>text-foreground</CodeRef> overriding entity token
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Identity column — links</span>
          <DenseLinkButton variant="stock" label="NVDA" ariaLabel="Open NVDA" onClick={noop} />
          <DenseLinkButton
            variant="option"
            label="NVDA 250620C140"
            ariaLabel="Open option contract"
            onClick={noop}
          />
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Read-only Stock (e.g. Live drag row)
          </span>
          <strong className="font-semibold text-entity-symbol">CAVA</strong>
        </SampleBox>

        <div className="space-y-1 text-xs">
          <p>
            ✅ Stock / Option identity columns: <CodeRef>denseTableEntityCell</CodeRef> +{' '}
            <CodeRef>DenseLinkButton</CodeRef> / <CodeRef>text-entity-symbol</CodeRef> — never{' '}
            <CodeRef>truncate</CodeRef>
          </p>
          <p>
            ✅ Option contract strings always use Option <strong>Entity</strong> — never Option
            Category tags (§3)
          </p>
          <p>
            ❌ Stock as Tag pill in grid Symbol column · per-page sky/lime pill CSS · mixing FI/Cash-like
            entity colors with Position Category purple (§4)
          </p>
        </div>
      </SectionCard>

      {/* 3 — Option Category (Instance / Strategy / Opportunity / Structure) */}
      <SectionCard
        id="option-category"
        title="3 · Option Category — Instance / Strategy / Opportunity / Structure"
        specId="option-category"
        description="Four strategy-domain concepts for options workflows. Distinct from Entity (§2) and Position Category (§4). Contract strings remain Option Entity — never render as Option Category tags."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TokenSwatch label="Instance" varName="--color-entity-instance" />
          <TokenSwatch label="Strategy" varName="--color-entity-strategy" />
          <TokenSwatch label="Opportunity" varName="--color-option-category-opportunity" />
          <TokenSwatch label="Structure" varName="--color-option-category-structure" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Tag vs Link matrix — Option Category only
        </p>
        <div className="overflow-x-auto rounded-md border border-border bg-background">
          <table className="w-full min-w-[540px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-2.5 py-2 font-semibold text-foreground">Context</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Strategy</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Instance</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Opportunity</th>
                <th className="px-2.5 py-2 font-semibold text-foreground">Structure</th>
              </tr>
            </thead>
            <tbody className="text-foreground/90">
              <tr className="border-b border-border/60">
                <td className="px-2.5 py-2 font-medium text-foreground">Dedicated identity column</td>
                <td className="px-2.5 py-2">
                  <CodeRef>DenseLinkButton variant=&quot;strategy&quot;</CodeRef>
                  {' · '}
                  <CodeRef>DenseOptionCategoryLabel</CodeRef>
                </td>
                <td className="px-2.5 py-2">
                  <CodeRef>DenseLinkButton variant=&quot;instance&quot;</CodeRef>
                  {' · '}
                  <CodeRef>DenseOptionCategoryLabel</CodeRef>
                </td>
                <td className="px-2.5 py-2">
                  <CodeRef>DenseOptionCategoryLabel variant=&quot;opportunity&quot;</CodeRef>
                </td>
                <td className="px-2.5 py-2 text-muted-foreground">
                  Planned link / label variant (token pending)
                </td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="px-2.5 py-2 font-medium text-foreground">Must not use</td>
                <td className="px-2.5 py-2 text-destructive/90" colSpan={4}>
                  <CodeRef>DenseTag</CodeRef> pills for Option Category anywhere · option contract strings
                  (use Option Entity §2) · Stock symbols · Position Category labels (§4)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Identity column — text / links (no pill)</span>
          <DenseLinkButton
            variant="strategy"
            label="Covered Call"
            ariaLabel="Open strategy"
            onClick={noop}
          />
          <DenseLinkButton
            variant="instance"
            label="CC-NVDA-0620"
            ariaLabel="Open instance"
            onClick={noop}
          />
          <DenseOptionCategoryLabel variant="opportunity">DAVE Covered Call 10% OTM</DenseOptionCategoryLabel>
          <DenseOptionCategoryLabel variant="structure">Cash Secured Put</DenseOptionCategoryLabel>
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Status / source — outline pills OK</span>
          <DenseTag variant="success">Open</DenseTag>
          <DenseTag variant="neutral">No fills</DenseTag>
          <DenseTag variant="source-tws">TWS</DenseTag>
        </SampleBox>

        <div className="space-y-1 text-xs">
          <p>
            ✅ Table Opp / Strategy / Instance / Structure:{' '}
            <CodeRef>DenseLinkButton</CodeRef> or <CodeRef>DenseOptionCategoryLabel</CodeRef> — semantic
            color only, never <CodeRef>DenseTag</CodeRef> pills
          </p>
          <p>
            ✅ Status, exec source, Position Category: <CodeRef>DenseTag</CodeRef> outline pills
          </p>
          <p>
            ✅ Ledger / Instances / Opportunities / Structures pages — audit Option Category separately
            from Entity
          </p>
          <p>
            ❌ <CodeRef>DenseTag</CodeRef> pills in grid identity columns · rendering NVDA 250620C140 as
            Strategy or Instance tag · reusing entity-symbol color for
            Option Category
          </p>
        </div>
      </SectionCard>

      {/* 4 — Position category (watchlist / portfolio + user-defined names) */}
      <SectionCard
        id="position-category"
        title="4 · Position Category — watchlist / portfolio"
        specId="position-category"
        description="watchlist and portfolio are two fixed Position Category labels. User-defined names (Fix Income, Tech, Watching…) share the same purple outline pill. Not tradable entities — never mix with Entity (§2) or Option Category (§3)."
      >
        <TokenSwatch label="Position Category" varName="--color-entity-category" />

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Fixed labels · size=&quot;cell&quot;
          </span>
          <DenseTag variant="category" size="cell">
            watchlist
          </DenseTag>
          <DenseTag variant="category" size="cell">
            portfolio
          </DenseTag>
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">
            User-defined names · same visual
          </span>
          <DenseTag variant="category" size="cell">
            Fix Income
          </DenseTag>
          <DenseTag variant="category" size="cell">
            Tech
          </DenseTag>
          <DenseTag variant="category" size="cell">
            Watching
          </DenseTag>
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Group header row — elevated band + borders (no pill)
          </span>
          <div className="w-full min-w-[240px] rounded-sm border-y border-border bg-secondary/60 px-2 py-1.5">
            <span className="text-xs font-semibold text-entity-category">watchlist</span>
          </div>
          <CodeRef>{'<GroupHeaderRow variant="category" />'}</CodeRef>
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Filter bar · inactive gray, active entity color
          </span>
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
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">
            Not category — generic operational filters
          </span>
          <button
            type="button"
            className="inline-flex rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            Host
          </button>
          <button
            type="button"
            className="inline-flex rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
          >
            Secondary
          </button>
          <span className="text-[11px] text-muted-foreground">
            Account / time range / status — neutral pills or SegmentControl, not Position Category
          </span>
        </SampleBox>

        <div className="space-y-1 text-xs">
          <p>
            ✅ Table cells / filters: <CodeRef>DenseTag variant=&quot;category&quot;</CodeRef> pill · group
            header: <CodeRef>GroupHeaderRow variant=&quot;category&quot;</CodeRef> (purple label, elevated
            bg, top/bottom border — no pill)
          </p>
          <p>
            ✅ Filter chips: default neutral gray (same as Account pills); selected → entity token via{' '}
            <CodeRef>denseEntityFilterChipClass</CodeRef>
          </p>
          <p>
            ❌ Category filter with gray generic pills · mixing category purple with Stock entity color
            in the same control
          </p>
        </div>
      </SectionCard>

      {/* 5 — Status & source tags */}
      <SectionCard
        id="status-tags"
        title="5 · Status & Source Tags"
        specId="status"
        description="Generic state (success / warning / danger / info / neutral) and execution source badges share one outline-pill language."
      >
        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Status</span>
          <DenseTag variant="success">filled</DenseTag>
          <DenseTag variant="warning">pending</DenseTag>
          <DenseTag variant="danger">rejected</DenseTag>
          <DenseTag variant="info">queued</DenseTag>
          <DenseTag variant="neutral">closed</DenseTag>
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Exec source</span>
          <ExecSourceBadge source="flex_trades" />
          <ExecSourceBadge source="tws_client" />
          <ExecSourceBadge source="journal_closed" />
          <ExecSourceBadge source="manual" />
        </SampleBox>

        <p className="text-xs">
          ✅ <CodeRef>{'<DenseTag variant="…" />'}</CodeRef> ·{' '}
          <CodeRef>{'<ExecSourceBadge source="…" />'}</CodeRef> — ❌ hand-written badges per page
        </p>
      </SectionCard>

      {/* 6 — Density & typography */}
      <SectionCard
        id="density"
        title="6 · Density & Typography"
        specId="density"
        description="Dense tables: 13px body, 11px meta, fixed layout. Entity identity columns (Stock, Option) and Option Category columns must show full text — wrap inside the cell, never ellipsis (...)."
      >
        <SampleBox className="gap-6">
          <span className="text-[length:var(--text-dense)] text-foreground">
            --text-dense · 13px body
          </span>
          <span className="text-[length:var(--text-dense-meta)]">--text-dense-meta · 11px meta</span>
          <span className="font-mono tabular-nums text-foreground">1,234.56 mono tabular</span>
        </SampleBox>

        <p className="text-xs font-semibold uppercase tracking-wide">
          Live composite sample — everything above in one DenseDataTable
        </p>
        <DenseDataTable>
          <DenseTableHeader>
            <DenseTableHeadRow>
              <DenseTableHead>Symbol</DenseTableHead>
              <DenseTableHead>Contract</DenseTableHead>
              <DenseTableHead>Strategy / Instance (§3)</DenseTableHead>
              <DenseTableHead>Source</DenseTableHead>
              <DenseTableHead align="right">Daily $ / %</DenseTableHead>
              <DenseTableHead align="right">Unrealized</DenseTableHead>
              <DenseTableHead align="center">Actions</DenseTableHead>
            </DenseTableHeadRow>
          </DenseTableHeader>
          <DenseTableBody>
            {DEMO_ROWS.map((row) => (
              <DenseTableRow key={row.symbol}>
                <DenseTableCell className={denseTableEntityCell}>
                  <DenseLinkButton
                    variant="stock"
                    label={row.symbol}
                    ariaLabel={`Open ${row.symbol}`}
                    onClick={noop}
                    className={denseTableEntityLink}
                  />
                </DenseTableCell>
                <DenseTableCell className={denseTableEntityCell}>
                  {row.contract === '—' ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <DenseLinkButton
                      variant="option"
                      label={row.contract}
                      ariaLabel={`Open ${row.contract}`}
                      onClick={noop}
                      className={denseTableEntityLink}
                    />
                  )}
                </DenseTableCell>
                <DenseTableCell className={denseTableEntityCell}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <DenseOptionCategoryLabel variant="opportunity" className="whitespace-normal">
                      {row.strategy}
                    </DenseOptionCategoryLabel>
                    <DenseLinkButton
                      variant="instance"
                      label={row.instance}
                      ariaLabel={`Open ${row.instance}`}
                      onClick={noop}
                      className={denseTableEntityLink}
                    />
                  </div>
                </DenseTableCell>
                <DenseTableCell>
                  <ExecSourceBadge source={row.source} />
                </DenseTableCell>
                <DenseTableCell className="text-right">
                  <PnlCell
                    dollar={row.dailyDollar}
                    pct={row.dailyPct}
                    formatDollar={fmtDollar}
                    formatPct={fmtPct}
                  />
                </DenseTableCell>
                <DenseTableCell
                  className={cn(denseTableNumCell, unrealizedPnlColorClass(row.unrealized))}
                >
                  {fmtDollar(row.unrealized)}
                </DenseTableCell>
                <DenseTableCell className="text-center">
                  <span className="inline-flex items-center gap-0.5">
                    <IconActionButton title="Edit" ariaLabel="Edit row" onClick={noop}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconActionButton>
                    <IconActionButton
                      title="Delete"
                      ariaLabel="Delete row"
                      tone="danger"
                      onClick={noop}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconActionButton>
                  </span>
                </DenseTableCell>
              </DenseTableRow>
            ))}
          </DenseTableBody>
        </DenseDataTable>

        <p className="text-xs space-y-1">
          <span className="block">
            ✅ <CodeRef>DenseDataTable</CodeRef> + <CodeRef>denseTableNumCell</CodeRef> +{' '}
            <CodeRef>denseTableEntityCell</CodeRef> / <CodeRef>denseTableEntityLink</CodeRef> on Stock /
            Option (§2) and Option Category (§3) columns
          </span>
          <span className="block">
            ❌ <CodeRef>truncate</CodeRef> / <CodeRef>line-clamp</CodeRef> /{' '}
            <CodeRef>detailCellClip</CodeRef> on identity cells — prefer wrap (see long demo row)
          </span>
          <span className="block">
            ❌ shadcn <CodeRef>Table</CodeRef> or raw <CodeRef>{'<table>'}</CodeRef> for data tables
          </span>
        </p>
      </SectionCard>

      {/* 7 — Surface layers */}
      <SectionCard
        id="surfaces"
        title="7 · Surface Layers"
        specId="surface"
        description="Three-level canvas: page root bg-card → elevated panels bg-secondary → inset wells bg-background."
      >
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-2 text-xs font-mono">bg-card — canvas (PageShell)</p>
          <div className="rounded-md border border-border bg-secondary p-3">
            <p className="mb-2 text-xs font-mono">bg-secondary — elevated (KPI / filter bars)</p>
            <div className="rounded-md border border-border bg-background p-3">
              <p className="text-xs font-mono">bg-background — inset (charts / deep wells)</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* 8 — Compliance checklist */}
      <SectionCard
        id="compliance"
        title="8 · Compliance Checklist — validate any page against this contract"
        specId="full"
        promptLabel="Copy Full Prompt"
        description="Walk a page against these checks. Mechanical guards run in npm run check:legacy-css; the rest is reviewed against the samples above."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-foreground/85">
          <li>
            Realized PnL via <CodeRef>pnlColorClass</CodeRef> / <CodeRef>PnlCell</CodeRef>; unrealized
            via <CodeRef>unrealizedPnlColorClass</CodeRef> (yellow) — no raw green/red classes (§1)
          </li>
          <li>
            Entity (§2): Stock / Option identity columns use <CodeRef>DenseLinkButton</CodeRef> or{' '}
            <CodeRef>text-entity-symbol</CodeRef> — not Tag pills; FI/Cash-like use entity colors when
            tokens land — not Position Category purple
          </li>
          <li>
            Option Category (§3): Strategy / Instance / Opportunity / Structure use{' '}
            <CodeRef>DenseLinkButton</CodeRef> or <CodeRef>DenseTag</CodeRef> variants — never for option
            contract strings (those are Option Entity §2)
          </li>
          <li>
            Position Category (§4): <strong>watchlist</strong> / <strong>portfolio</strong> and user
            custom names: purple <CodeRef>DenseTag variant=&quot;category&quot;</CodeRef> in cells and
            filters; group headers use <CodeRef>GroupHeaderRow variant=&quot;category&quot;</CodeRef> (purple
            label, <CodeRef>bg-secondary</CodeRef> band, border-y — no pill) — not gray generic pills
          </li>
          <li>
            Data tables use the <CodeRef>DenseDataTable</CodeRef> family — never shadcn{' '}
            <CodeRef>Table</CodeRef> or raw <CodeRef>{'<table>'}</CodeRef>
          </li>
          <li>
            Numeric columns: <CodeRef>denseTableNumCell</CodeRef> (right-aligned mono tabular-nums)
          </li>
          <li>
            Identity columns: <CodeRef>denseTableEntityCell</CodeRef> +{' '}
            <CodeRef>denseTableEntityLink</CodeRef> — full text visible (wrap), never{' '}
            <CodeRef>truncate</CodeRef> or ellipsis
          </li>
          <li>
            Row actions: <CodeRef>IconActionButton</CodeRef>; destructive confirm via{' '}
            <CodeRef>ConfirmDialog</CodeRef> — never <CodeRef>window.confirm</CodeRef>
          </li>
          <li>
            Page shell: <CodeRef>PageShell</CodeRef> + <CodeRef>PageHeader</CodeRef>; surfaces follow
            the 3-layer canvas (§7)
          </li>
          <li>
            New colors go through <CodeRef>src/index.css</CodeRef> tokens first — never inline hex in
            pages
          </li>
        </ul>

        <div className="rounded-md border border-border bg-background px-3 py-2.5 font-mono text-xs text-foreground">
          npm run lint && npm run build && npm run check:legacy-css
        </div>

        <p className="text-xs">
          Sources: <CodeRef>docs/DENSE_UI.md</CodeRef> ·{' '}
          <CodeRef>.cursor/rules/dense-ui-system.mdc</CodeRef> ·{' '}
          <CodeRef>src/index.css</CodeRef> (tokens) ·{' '}
          <CodeRef>scripts/check-legacy-css.sh</CodeRef> (guards)
        </p>
      </SectionCard>
    </PageShell>
  )
}
