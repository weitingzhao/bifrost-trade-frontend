import type { ReactNode } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

function DocPath({ path }: { path: string }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">{path}</code>
  )
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card id={id} variant="elevated" className="scroll-mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

function ProseBlock({ children }: { children: ReactNode }) {
  return <div className="space-y-2 text-foreground/90">{children}</div>
}

function MonoList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-foreground/85">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

const STACK_ROWS: { layer: string; choice: string; role: string }[] = [
  { layer: 'Framework', choice: 'React 18 + TypeScript + Vite', role: 'SPA, fast dev/build' },
  { layer: 'Routing', choice: 'React Router v7', role: 'URL state, lazy routes' },
  { layer: 'Server state', choice: 'TanStack Query v5', role: 'API cache, polling, SSE cache' },
  {
    layer: 'Generic UI',
    choice: 'shadcn/ui + Radix UI',
    role: 'Dialog, Tabs, Select, Sidebar (radix-nova style)',
  },
  { layer: 'Styling', choice: 'Tailwind CSS v4 + index.css tokens', role: 'Theme, dense typography' },
  { layer: 'Icons', choice: 'Lucide React', role: 'Nav, inspector section tones' },
  { layer: 'Validation', choice: 'Zod', role: 'API shapes where used' },
]

const DENSE_LAYERS: { n: string; where: string; role: string }[] = [
  { n: '1', where: 'src/index.css', role: 'Dense tokens (--text-dense, table cell spacing, PnL semantics)' },
  { n: '2', where: 'components/layout/', role: 'PageShell, PageHeader, RightInspectorShell' },
  { n: '3', where: 'components/data-display/', role: 'DenseDataTable, PnlCell, SegmentControl, CollapsibleGroup' },
  { n: '4', where: 'Domain pages', role: 'Columns, hooks, API only — minimal styling' },
]

const PRIMITIVE_MAP: { use: string; never: string }[] = [
  { use: 'DenseDataTable + head/row/cell', never: 'New *.module.css tables, replay-* classes' },
  { use: 'pnlColorClass / PnlCell / InlinePnl', never: 'Legacy pnl color classes, inline hex green/red' },
  { use: 'SegmentControl / IncludeExcludeToggle', never: 'Custom pill CSS per page' },
  { use: 'IconActionButton', never: 'Hand-rolled 20×20 icon buttons' },
  { use: 'CollapsibleGroup', never: 'Legacy strategyGroup module classes' },
  { use: 'ConfirmDialog pattern', never: 'window.confirm / window.alert' },
]

const EXCLUDED: { name: string; reason: string }[] = [
  { name: 'Next.js', reason: 'No SSR/RSC; SSE-heavy internal SPA' },
  { name: 'Ant Design / MUI (primary)', reason: 'Second visual system; conflicts with shadcn' },
  { name: 'AG Grid / MUI X (primary)', reason: 'Heavy; hard to match Dense UI + Legacy parity' },
  { name: 'Base UI', reason: 'Not used; Radix via shadcn instead' },
  { name: 'Radix Themes as skin', reason: 'Tailwind + project tokens define look' },
]

const REPO_PATHS: { label: string; path: string }[] = [
  { label: 'Dense UI guide', path: 'docs/DENSE_UI.md' },
  { label: 'This document (markdown)', path: 'docs/TECH_STACK.md' },
  { label: 'Agent rule', path: '.cursor/rules/dense-ui-system.mdc' },
  { label: 'Data-display primitives', path: 'src/components/data-display/' },
  { label: 'shadcn config', path: 'components.json' },
  { label: 'Legacy CSS guards', path: 'scripts/check-legacy-css.sh' },
  { label: 'Frontend CLAUDE', path: 'CLAUDE.md' },
]

export default function TechStackPage() {
  return (
    <PageShell className="mx-auto max-w-4xl space-y-4 pb-10">
      <PageHeader
        breadcrumb={
          <p className="text-xs font-medium text-primary/90">Settings / Configuration</p>
        }
        title="Tech Stack"
        description="Authoritative technology choices, Dense UI standards, and UI governance for Bifrost Trade Frontend."
        actions={
          <Badge variant="secondary" className="font-mono text-dense-caption uppercase tracking-wide">
            Core reference
          </Badge>
        }
      />

      <SectionCard
        id="context"
        title="Product context"
        description="Why this stack fits the product"
      >
        <ProseBlock>
          <p>
            Internal monitoring console for a single operator: data-dense tables, collapsible groups,
            right-hand inspectors, and SSE streams. Strong domain semantics (PnL, Host / Secondary
            accounts, options, strategy instances).
          </p>
          <p>
            <strong className="text-foreground">Phase 1:</strong> New Frontend + Legacy API — validate
            business parity against Legacy Frontend before migrating API domains.
          </p>
        </ProseBlock>
      </SectionCard>

      <SectionCard
        id="locked-stack"
        title="Locked stack"
        description="Do not replace without an explicit architecture decision"
      >
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 w-[7rem]">Layer</TableHead>
                <TableHead className="h-9">Choice</TableHead>
                <TableHead className="h-9">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {STACK_ROWS.map((row) => (
                <TableRow key={row.layer}>
                  <TableCell className="py-2 font-medium text-foreground">{row.layer}</TableCell>
                  <TableCell className="py-2 font-mono text-xs text-foreground">{row.choice}</TableCell>
                  <TableCell className="py-2">{row.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        id="radix"
        title="Radix UI, Base UI, and visual design"
        description="Headless primitives vs design system"
      >
        <ProseBlock>
          <p>
            <strong className="text-foreground">Radix UI</strong> is used as the headless layer under
            shadcn (<DocPath path="src/components/ui/*" />). Package:{' '}
            <code className="text-xs font-mono">radix-ui</code>; shadcn style:{' '}
            <code className="text-xs font-mono">radix-nova</code>. Radix provides focus, keyboard, ARIA,
            and portal behavior — not the visual skin.
          </p>
          <p>
            <strong className="text-foreground">Base UI</strong> is not used.{' '}
            <strong className="text-foreground">Radix Themes</strong> is not used — appearance comes
            from Tailwind + CSS variables in <DocPath path="src/index.css" />.
          </p>
          <p>
            Split: Radix/shadcn for <em>interactive shells</em> (Dialog, Tabs, Select);{' '}
            <strong className="text-foreground">Dense UI</strong> for tables and monitoring density.
          </p>
        </ProseBlock>
      </SectionCard>

      <SectionCard
        id="dense-ui"
        title="Dense UI — Data-Display Design System"
        description="Internal standard for Positions, Ledger, Performance, Live"
      >
        <ProseBlock>
          <p>
            Dense UI is not an npm package. It is the project convention: tokens + layout +{' '}
            <DocPath path="src/components/data-display/" /> + domain pages. Full guide:{' '}
            <DocPath path="docs/DENSE_UI.md" />.
          </p>
        </ProseBlock>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            Layer stack
          </p>
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 w-10">#</TableHead>
                  <TableHead className="h-8">Location</TableHead>
                  <TableHead className="h-8">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DENSE_LAYERS.map((row) => (
                  <TableRow key={row.n}>
                    <TableCell className="py-1.5 font-mono text-xs">{row.n}</TableCell>
                    <TableCell className="py-1.5 font-mono text-xs text-foreground">{row.where}</TableCell>
                    <TableCell className="py-1.5">{row.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            Page canvas (three surfaces)
          </p>
          <MonoList
            items={[
              'Canvas — PageShell + bg-card (same surface as sidebar)',
              'Elevated — Card variant="elevated" or bg-secondary (filters, KPI, chart panels)',
              'Inset — bg-background (nested chart wells)',
            ]}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            Mandatory mapping
          </p>
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 text-emerald-600 dark:text-emerald-400">Use</TableHead>
                  <TableHead className="h-8 text-destructive">Never</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PRIMITIVE_MAP.map((row) => (
                  <TableRow key={row.use}>
                    <TableCell className="py-1.5 font-mono text-xs text-foreground">{row.use}</TableCell>
                    <TableCell className="py-1.5 text-xs">{row.never}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs">
            Reference table: <DocPath path="src/components/positions/StocksTab.tsx" />
          </p>
        </div>

        <div className="rounded-md border border-border/80 bg-muted/30 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">Verification</p>
          <code className="mt-1 block text-xs font-mono text-foreground">
            npm run lint && npm run build && npm run check:legacy-css
          </code>
        </div>
      </SectionCard>

      <SectionCard
        id="inspector"
        title="Right inspector pattern"
        description="Stock, Option, and Instance detail sidebars"
      >
        <MonoList
          items={[
            'Shell — RightInspectorShell + rightInspectorShell.module.css',
            'Line tabs — InspectorSectionNav (icon + semantic tone per section)',
            'Collapsible headers — RightInspectorCollapsibleSection with the same navItem as tabs',
            'Config — stockInspectorSections.ts, optionInspectorSections.ts, instanceInspectorSections.ts',
          ]}
        />
      </SectionCard>

      <SectionCard
        id="charts"
        title="Charts"
        description="Scoped modules + SVG tokens"
      >
        <MonoList
          items={[
            'Coverage donuts — DonutChart.module.css + ChartLegend (Tailwind grid)',
            'K-line / bars — BarsCandlestickChart (SVG) + @/lib/chartTokens',
            'Risk payoff — riskProfile.module.css (geometry exception only)',
            'Optional later: @tanstack/react-virtual or @tanstack/react-table (headless; keep Dense UI skin)',
          ]}
        />
      </SectionCard>

      <SectionCard
        id="excluded"
        title="Not adopted as primary"
      >
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8">Option</TableHead>
                <TableHead className="h-8">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EXCLUDED.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="py-1.5 font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="py-1.5">{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        id="migration"
        title="Migration phase"
      >
        <ProseBlock>
          <p>
            Phase 1: New Frontend → Legacy API via <code className="text-xs font-mono">VITE_API_*</code>.
            Do not migrate bifrost-trade-api until frontend business parity is proven. Legacy Frontend
            (bifrost-trader-engine) is read-only reference — no App.css imports.
          </p>
        </ProseBlock>
      </SectionCard>

      <SectionCard
        id="repo-paths"
        title="Repository paths"
        description="Canonical files for agents and contributors"
      >
        <ul className="space-y-2">
          {REPO_PATHS.map(({ label, path }) => (
            <li key={path} className="flex flex-wrap items-baseline gap-2">
              <span className="min-w-[8rem] font-medium text-foreground">{label}</span>
              <DocPath path={path} />
            </li>
          ))}
        </ul>
        <p className="flex items-center gap-1.5 text-xs">
          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
          Markdown source of truth: <DocPath path="docs/TECH_STACK.md" /> — keep in sync when changing
          locked decisions.
        </p>
      </SectionCard>

      <SectionCard id="decision-log" title="Decision log">
        <ul className="space-y-2 font-mono text-xs text-foreground/90">
          <li className={cn('border-l-2 border-border pl-3')}>
            <span className="text-muted-foreground">2026-05</span> — shadcn + Tailwind + TanStack Query
            locked; Next.js excluded
          </li>
          <li className="border-l-2 border-border pl-3">
            <span className="text-muted-foreground">2026-05</span> — Dense UI + check:legacy-css
            governance
          </li>
          <li className="border-l-2 border-border pl-3">
            <span className="text-muted-foreground">2026-05</span> — Inspector: shared icon + tone for
            tabs and section headers
          </li>
          <li className="border-l-2 border-primary pl-3">
            <span className="text-muted-foreground">2026-05</span> — Tech Stack page (Settings →
            Configuration)
          </li>
        </ul>
      </SectionCard>
    </PageShell>
  )
}
