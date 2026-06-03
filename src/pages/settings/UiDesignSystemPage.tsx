import { useRef, useState, type ReactNode } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  DenseTag,
  ExecSourceBadge,
  IconActionButton,
  InlinePnl,
  PnlCell,
  denseTableEntityCell,
  denseTableEntityLink,
  denseTableNumCell,
} from '@/components/data-display'
import { fmtDollar, fmtPct, unrealizedPnlColorClass } from '@/utils/dailyChange'
import { cn } from '@/lib/utils'
import { Check, ClipboardCopy, Pencil, Trash2 } from 'lucide-react'
import {
  QA_PROMPT_DENSITY,
  QA_PROMPT_ENTITY,
  QA_PROMPT_FULL,
  QA_PROMPT_PNL,
  QA_PROMPT_STATUS,
  QA_PROMPT_SURFACE,
} from './uiDesignSystem/qaPrompts'

// ─── Building blocks ─────────────────────────────────────────────────────────

function CopyQaPromptButton({ prompt, label = 'Copy QA Prompt' }: { prompt: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      // Clipboard API unavailable (non-secure context) — fall back to a hidden textarea
      const ta = document.createElement('textarea')
      ta.value = prompt
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-7 shrink-0 gap-1.5 px-2.5 text-xs font-medium"
      title="Copy section spec + QA audit prompt for LLM Agent (variant checks, not grep-only)"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" />
          Copied
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  )
}

function SectionCard({
  id,
  title,
  description,
  qaPrompt,
  qaLabel,
  children,
}: {
  id: string
  title: string
  description?: string
  qaPrompt?: string
  qaLabel?: string
  children: ReactNode
}) {
  return (
    <Card id={id} variant="elevated" className="scroll-mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          {qaPrompt ? <CopyQaPromptButton prompt={qaPrompt} label={qaLabel} /> : null}
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
    <PageShell className="w-full min-w-0 space-y-6 pb-10">
      <PageHeader
        breadcrumb={
          <p className="text-xs font-medium text-primary/90">Settings / Configuration</p>
        }
        title="UI Design System"
        description="Site-wide business semantics — PnL colors, entity identity, status tags, density. Every page must render the same business concept the same way. Use this page to validate compliance."
        actions={
          <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wide">
            Visual contract
          </Badge>
        }
      />

      {/* 1 — PnL semantics */}
      <SectionCard
        id="pnl-semantics"
        title="1 · PnL Semantics — profit green / loss red / unrealized yellow"
        qaPrompt={QA_PROMPT_PNL}
        description="Realized PnL is green (profit) or red (loss). Unrealized PnL is always yellow — never green/red. Zero or missing values are muted. Pages never pick these colors directly; they call the accessor functions."
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

      {/* 2 — Entity identity */}
      <SectionCard
        id="entity-identity"
        title="2 · Entity Identity — Symbol / Option / Strategy / Instance / Category"
        qaPrompt={QA_PROMPT_ENTITY}
        description="Each business entity has one fixed color and one rendering primitive, identical on every page. A symbol looks the same in Positions, Ledger, Live, and Research."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <TokenSwatch label="Symbol" varName="--color-entity-symbol" />
          <TokenSwatch label="Option" varName="--color-entity-option" />
          <TokenSwatch label="Strategy" varName="--color-entity-strategy" />
          <TokenSwatch label="Instance" varName="--color-entity-instance" />
          <TokenSwatch label="Category" varName="--color-entity-category" />
        </div>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Tags</span>
          <DenseTag variant="symbol">NVDA</DenseTag>
          <DenseTag variant="strategy">Covered Call</DenseTag>
          <DenseTag variant="instance">CC-NVDA-0620</DenseTag>
          <DenseTag variant="category">options</DenseTag>
          <DenseTag variant="category">stock</DenseTag>
        </SampleBox>

        <SampleBox>
          <span className="text-xs font-semibold uppercase tracking-wide">Links</span>
          <DenseLinkButton variant="stock" label="NVDA" ariaLabel="Open NVDA" onClick={noop} />
          <DenseLinkButton
            variant="option"
            label="NVDA 250620C140"
            ariaLabel="Open option contract"
            onClick={noop}
          />
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
        </SampleBox>

        <div className="space-y-1 text-xs">
          <p>
            ✅ <CodeRef>{'<DenseTag variant="symbol|strategy|instance|category" />'}</CodeRef> ·{' '}
            <CodeRef>{'<DenseLinkButton variant="stock|option|strategy|instance" />'}</CodeRef>
          </p>
          <p>
            ❌ per-page pill CSS, raw <CodeRef>text-sky-600</CodeRef> for options, ad-hoc symbol
            styling
          </p>
        </div>
      </SectionCard>

      {/* 3 — Status & source tags */}
      <SectionCard
        id="status-tags"
        title="3 · Status & Source Tags"
        qaPrompt={QA_PROMPT_STATUS}
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

      {/* 4 — Density & typography */}
      <SectionCard
        id="density"
        title="4 · Density & Typography"
        qaPrompt={QA_PROMPT_DENSITY}
        description="Dense tables: 13px body, 11px meta, fixed layout. Identity columns (Symbol, Contract, Strategy, Instance) must show full text — wrap inside the cell, never ellipsis (...)."
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
              <DenseTableHead>Strategy / Instance</DenseTableHead>
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
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <DenseTag variant="strategy">{row.strategy}</DenseTag>
                    <DenseTag variant="instance">{row.instance}</DenseTag>
                  </span>
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
            <CodeRef>denseTableEntityCell</CodeRef> / <CodeRef>denseTableEntityLink</CodeRef> on
            Symbol / Contract / Strategy / Instance columns
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

      {/* 5 — Surface layers */}
      <SectionCard
        id="surfaces"
        title="5 · Surface Layers"
        qaPrompt={QA_PROMPT_SURFACE}
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

      {/* 6 — Compliance checklist */}
      <SectionCard
        id="compliance"
        title="6 · Compliance Checklist — validate any page against this contract"
        qaPrompt={QA_PROMPT_FULL}
        qaLabel="Copy Full QA Prompt"
        description="Walk a page against these checks. Mechanical guards run in npm run check:legacy-css; the rest is reviewed against the samples above."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-foreground/85">
          <li>
            Realized PnL via <CodeRef>pnlColorClass</CodeRef> / <CodeRef>PnlCell</CodeRef>; unrealized
            via <CodeRef>unrealizedPnlColorClass</CodeRef> (yellow) — no raw green/red classes
          </li>
          <li>
            Symbol / Option / Strategy / Instance / Category rendered with{' '}
            <CodeRef>DenseTag</CodeRef> / <CodeRef>DenseLinkButton</CodeRef> variants only
          </li>
          <li>
            Data tables use the <CodeRef>DenseDataTable</CodeRef> family — never shadcn{' '}
            <CodeRef>Table</CodeRef> or raw <CodeRef>{'<table>'}</CodeRef>
          </li>
          <li>
            Numeric columns: <CodeRef>denseTableNumCell</CodeRef> (right-aligned mono tabular-nums)
          </li>
          <li>
            Identity columns (Symbol, Contract, Strategy, Instance):{' '}
            <CodeRef>denseTableEntityCell</CodeRef> + <CodeRef>denseTableEntityLink</CodeRef> — full
            text visible (wrap), never <CodeRef>truncate</CodeRef> or ellipsis
          </li>
          <li>
            Row actions: <CodeRef>IconActionButton</CodeRef>; destructive confirm via{' '}
            <CodeRef>ConfirmDialog</CodeRef> — never <CodeRef>window.confirm</CodeRef>
          </li>
          <li>
            Page shell: <CodeRef>PageShell</CodeRef> + <CodeRef>PageHeader</CodeRef>; surfaces follow
            the 3-layer canvas
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
