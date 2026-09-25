/**
 * The building blocks the reference pages under `/docs/*` are drawn from.
 *
 * These lived inside `UiDesignSystemPage.tsx` while it was the only page that
 * needed them. Options Kit is the second reader, so they move here first
 * rather than being copied — the same §14.2 rule the design system itself
 * states: one definition, referenced, never two that drift.
 *
 * `SectionCard` takes an `action` node rather than a prompt id: the prompt
 * dialog belongs to the design-system page, not to every reference page, and a
 * shared component that imports one page's feature folder is a seam pointing
 * the wrong way.
 */
import { type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface DocsSection {
  id: string
  label: string
}

/** The sticky in-page jump strip. Sections are the page's own, passed in. */
export function DocsQuickNav({
  sections,
  ariaLabel,
}: {
  sections: readonly DocsSection[]
  ariaLabel: string
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-0 z-10 rounded-lg border border-border bg-secondary/95 px-3 py-2.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-secondary/85"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {sections.map(section => (
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

export function SectionCard({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string
  title: string
  description?: string
  /** Rendered at the top right of the header — a copy button, a link, nothing. */
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card id={id} variant="elevated" className="scroll-mt-24">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          {action ?? null}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

export function CodeRef({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
      {children}
    </code>
  )
}

/** A token that is live: the swatch reads the running stylesheet, not a literal. */
export function TokenSwatch({ label, varName }: { label: string; varName: string }) {
  return (
    <div className="flex items-center gap-2.5 border px-2.5 py-2 mat-card">
      <span
        className="h-5 w-5 shrink-0 rounded-full border border-border/60"
        style={{ background: `var(${varName})` }}
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{label}</p>
        <p className="truncate font-mono text-dense-caption text-muted-foreground">{varName}</p>
      </div>
    </div>
  )
}

/**
 * A token that is specified and not landed. Dashed, and the literal is spelled
 * out because there is no variable to read it from yet.
 */
export function PlannedTokenSwatch({
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
        <p className="truncate font-mono text-dense-caption text-muted-foreground">{note}</p>
      </div>
    </div>
  )
}

export function SampleBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border px-3 py-2.5 mat-card',
        className,
      )}
    >
      {children}
    </div>
  )
}
