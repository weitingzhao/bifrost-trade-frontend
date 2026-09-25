/**
 * The pieces the UI Design System page is drawn from (design Rev .53): a
 * numbered raised panel per section, the sticky section bar that follows the
 * scroll, a token swatch, and the Use / Never lines the app's page carried
 * before the redraw — kept, so the page is no weaker than the one it replaced
 * (§15).
 */
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const LINE0 = 'border-[var(--sk-line0)]'
export const EYEBROW = 'text-dense-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground'
export const MUTE_MONO = 'font-mono text-dense-caption text-muted-foreground'

export function DsSection({
  n,
  title,
  lede,
  aside,
  children,
  bodyClassName,
}: {
  n: number
  title: string
  lede: ReactNode
  /** Header text that sits on the title's line rather than under it. */
  aside?: boolean
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <section
      id={`ds-${n}`}
      data-sec={`ds-${n}`}
      className={cn('overflow-hidden rounded-[var(--radius)] border bg-[var(--sk-raised)]', LINE0)}
    >
      <header
        className={cn(
          'flex gap-0.75 border-b px-3.5 py-2.5',
          LINE0,
          aside ? 'flex-wrap items-baseline gap-2.5' : 'flex-col',
        )}
      >
        <span className="text-dense-body font-semibold">
          <span className="mr-2 font-mono text-muted-foreground">{n}</span>
          {title}
        </span>
        <span className="max-w-[96ch] text-dense-label leading-normal text-[var(--sk-mute2)]">{lede}</span>
      </header>
      <div className={cn('px-3.5 py-3', bodyClassName)}>{children}</div>
    </section>
  )
}

/** A token read from the running stylesheet: the square, its name, the variable. */
export function DsSwatch({ label, token }: { label: string; token: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-md border bg-card p-2', LINE0)}>
      <span className="size-7 flex-none rounded" style={{ background: `var(${token})` }} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-dense-label">{label}</span>
        <span className={MUTE_MONO}>{token}</span>
      </span>
    </div>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[3px] bg-[var(--sk-raised2)] px-1 font-mono text-[0.9em] text-foreground">{children}</code>
  )
}

/** What to reach for, and what never to — the app's own compliance lines. */
export function DsRules({ use, never }: { use: ReactNode[]; never?: ReactNode[] }) {
  const row = (label: string, ink: string, items: ReactNode[]) => (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] items-baseline gap-2">
      <span className={cn('font-mono text-dense-caption font-semibold uppercase tracking-[0.08em]', ink)}>{label}</span>
      <span className="flex flex-col gap-1 text-dense-label leading-normal text-[var(--sk-mute2)]">
        {items.map((it, i) => (
          <span key={i}>{it}</span>
        ))}
      </span>
    </div>
  )
  return (
    <div className={cn('flex flex-col gap-1.5 border-t pt-2.5', LINE0)}>
      {row('Use', 'text-muted-foreground', use)}
      {never && never.length > 0 ? row('Never', 'text-[var(--color-lamp-red)]', never) : null}
    </div>
  )
}

/** The sticky bar of section chips, lit by the scroll the page tracks. */
export function DsNav({
  labels,
  active,
  onJump,
}: {
  labels: readonly string[]
  active: string | null
  onJump: (anchor: string) => void
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn('sticky -top-3 z-[2] mt-1 flex flex-wrap gap-1 border-b bg-card py-2.5', LINE0)}
    >
      {labels.map((label, i) => {
        const id = `ds-${i + 1}`
        const on = id === active
        return (
          <button
            key={id}
            type="button"
            onClick={() => onJump(id)}
            aria-current={on ? 'location' : undefined}
            className={cn(
              'inline-flex cursor-pointer items-baseline gap-1.25 rounded border px-2 py-0.5 text-dense-meta',
              on
                ? 'border-[var(--sk-accent)] bg-[color-mix(in_srgb,var(--sk-accent)_10%,transparent)] text-foreground'
                : cn(LINE0, 'bg-transparent text-[var(--sk-mute2)] hover:text-foreground'),
            )}
          >
            <span className="font-mono text-dense-caption text-muted-foreground">{i + 1}</span>
            {label}
          </button>
        )
      })}
    </nav>
  )
}
