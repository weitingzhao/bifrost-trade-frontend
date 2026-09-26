/**
 * The grouped inset rows of the Settings pane (design Rev .80): the group's
 * name outside the card, rows at least 44 tall with the words on the left and
 * the control on the right, an ink-6% hairline between rows, and the group's
 * footnote under the card. A form group rather than a KPI card — the design
 * keeps it Trade-side for now, so it lives with its one page.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SettingGroup({
  title,
  foot,
  children,
}: {
  title?: string
  foot?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {title ? (
        <span className="px-3 text-dense-label font-semibold text-[var(--sk-soft)]">{title}</span>
      ) : null}
      <div className="mat-card overflow-hidden [&>*+*]:border-t [&>*+*]:border-border">
        {children}
      </div>
      {foot ? (
        <span className="px-3 text-dense-meta leading-normal text-pretty text-[var(--sk-mute2)]">
          {foot}
        </span>
      ) : null}
    </div>
  )
}

export function SettingLine({
  label,
  sub,
  children,
}: {
  label: ReactNode
  sub?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-2">
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-dense-body text-foreground">{label}</span>
        {sub ? (
          <span className="text-dense-meta leading-[1.45] text-pretty text-[var(--sk-mute2)]">
            {sub}
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 items-center justify-end gap-2.5">{children}</span>
    </div>
  )
}

/** A value as it stands: mono, one line, the full text on hover when it is cut. */
export function SettingValue({ children, tone }: { children: string; tone?: 'error' }) {
  return (
    <span
      title={children}
      className={cn(
        'max-w-[18rem] truncate font-mono text-dense-label tabular-nums',
        tone === 'error' ? 'text-destructive' : 'text-[var(--sk-soft)]'
      )}
    >
      {children}
    </span>
  )
}

export function SettingKbd({ children }: { children: string }) {
  return (
    <kbd className="whitespace-nowrap rounded-md bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-[7px] py-0.5 font-mono text-dense-meta text-[var(--sk-soft)]">
      {children}
    </kbd>
  )
}

/** The pane's head: its name, then a lamp and one line on how it stands. */
const LAMP_BG = {
  green: 'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red: 'bg-lamp-red',
  gray: 'bg-lamp-gray',
} as const

export function SettingPaneHead({
  title,
  lead,
  lamp,
}: {
  title: string
  lead: string
  lamp?: keyof typeof LAMP_BG
}) {
  return (
    <header className="flex flex-col gap-0.5 px-1 pt-0.5">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <span className="flex items-center gap-1.5 text-dense-label text-[var(--sk-mute2)]">
        {lamp ? (
          <span aria-hidden className={cn('size-[7px] flex-none rounded-full', LAMP_BG[lamp])} />
        ) : null}
        <span>{lead}</span>
      </span>
    </header>
  )
}
