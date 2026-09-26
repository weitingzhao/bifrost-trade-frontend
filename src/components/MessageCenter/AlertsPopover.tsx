/**
 * Everything wanting a look, in one panel, grouped by who said it — the menu
 * bar's notification centre (design Rev .60 §4, `_Shell StatusBar`).
 *
 * It hangs off the session clock at the right end of the top bar and opens
 * downward, right-aligned, since the status pill it used to rise from retired
 * into the bar. Each source is one rounded card. A source with nothing in it
 * is left out (the design's rule), but one that is still checking or could
 * not be reached stays: that is a fact about us, not a quiet world. When
 * every source is empty the panel says so in one line.
 *
 * The header says what the panel is *not*: news, never work. Work waits in the
 * Decision Inbox, and after the naming ruling that is the only thing in the
 * app allowed to be called an inbox.
 */
import { useReducer, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { HealthLamp } from '@bifrost/ui'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatLastUpdate } from '@/utils/positions'
import { useShellPopover } from '@/lib/shellPopover'
import { alertKey, clearAlerts } from '@/lib/alertsCleared'
import { cn } from '@/lib/utils'
import type { AlertGroup, AlertItem } from '@/hooks/useAlerts'

interface Props {
  groups: AlertGroup[]
  count: number
  onDismissAll: () => void
  /** The menu-bar item. The panel hangs off it and nothing else. */
  children: React.ReactNode
  /** The menu bar's glass, from the caller that owns it. */
  contentClassName?: string
  /** Told when the panel opens or closes — the item's tip stays down meanwhile. */
  onOpenChange?: (open: boolean) => void
}

function tickReducer(n: number): number { return n + 1 }

function whenLabel(when: AlertItem['when']): string {
  return typeof when === 'number' ? `${formatLastUpdate(when)} ago` : when
}

/** The small round × the centre uses for a source and for a row (Rev .72 §10). */
const X_CLASS =
  'inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] text-[var(--sk-mute2)] transition-colors hover:bg-[color-mix(in_srgb,var(--sk-ink)_16%,transparent)] hover:text-foreground'

/** Clear an item: its own dismissal when it has one, and this session's hide either way. */
function clearItems(group: AlertGroup, items: readonly AlertItem[]): void {
  items.forEach((i) => i.onDismiss?.())
  clearAlerts(items.map((i) => alertKey(group.id, i.id)))
}

function GroupHeading({ group, canFold, onFold }: { group: AlertGroup; canFold: boolean; onFold: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 pb-1 pt-2">
      <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {group.title}
      </span>
      <span className="font-mono text-dense-micro tabular-nums text-muted-foreground/70">
        {group.items.length}
      </span>
      <span className="ml-auto text-dense-micro text-muted-foreground/60">{group.source}</span>
      {canFold ? (
        <button type="button" className={CLR_CLASS} onClick={onFold}>
          Show less
        </button>
      ) : null}
      {group.items.length > 0 ? (
        <button
          type="button"
          className={X_CLASS}
          aria-label={`Clear ${group.title}`}
          title="Clear this source"
          onClick={() => clearItems(group, group.items)}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  )
}

const CLR_CLASS =
  'h-5 rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_8%,transparent)] px-2.5 text-dense-caption font-semibold text-[var(--sk-soft)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_14%,transparent)]'

function AlertRow({ group, item, onGo }: { group: AlertGroup; item: AlertItem; onGo: (to: string) => void }) {
  const body = (
    <>
      <HealthLamp lamp={item.lamp} variant="dot" className="mt-1" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-dense-label text-foreground">{item.title}</span>
        {item.sub ? (
          <span className="block truncate text-dense-meta text-muted-foreground">{item.sub}</span>
        ) : null}
      </span>
      <span className="shrink-0 font-mono text-dense-micro tabular-nums text-muted-foreground/60">
        {whenLabel(item.when)}
      </span>
    </>
  )

  return (
    <div className="group/row flex items-start gap-2 px-3 py-1.5 hover:bg-accent/50">
      {item.to ? (
        <button
          type="button"
          onClick={() => onGo(item.to!)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-start gap-2">{body}</span>
      )}
      {/* Every row can be cleared now (Rev .72 §10): the × shows on hover
          or keyboard focus, so it never moves the timestamp. */}
      <button
        type="button"
        onClick={() => clearItems(group, [item])}
        className={cn(X_CLASS, 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100')}
        aria-label="Clear"
        title="Clear"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

/** Three of the four states. `ready` with rows is the fourth and renders above. */
function GroupBody({ group }: { group: AlertGroup }) {
  if (group.state === 'checking') {
    return <p className="px-3 pb-1 text-dense-meta text-muted-foreground">Checking…</p>
  }
  if (group.state === 'unavailable') {
    return (
      <div className="space-y-1 px-3 pb-2">
        <p className="text-dense-meta text-warning">{group.note ?? 'Could not be reached.'}</p>
        {group.onRetry ? (
          <button
            type="button"
            onClick={group.onRetry}
            className="text-dense-caption underline underline-offset-2 hover:text-foreground"
          >
            Check again
          </button>
        ) : null}
      </div>
    )
  }
  return (
    <p className="px-3 pb-1 text-dense-meta text-muted-foreground/60">
      {group.emptyLabel ?? 'Nothing waiting'}
    </p>
  )
}

export function AlertsPopover({ groups, count, onDismissAll, children, contentClassName, onOpenChange }: Props) {
  // One shell popover at a time (Rev .68). Another item opening closes this
  // one from outside, so the owner hears about the open state, not the calls.
  const [open, setOpen] = useShellPopover('alerts')
  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])
  const navigate = useNavigate()
  // Relative timestamps only need to move while someone is reading them.
  const [, tick] = useReducer(tickReducer, 0)
  useEffect(() => {
    if (!open) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [open])

  // Sources fanned out; the rest stack (Rev .72 §10).
  const [fanned, setFanned] = useState<ReadonlySet<AlertGroup['id']>>(new Set())
  const toggleFan = (id: AlertGroup['id']) =>
    setFanned((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const anyItems = groups.some((g) => g.items.length > 0)
  const clearAll = () => {
    onDismissAll()
    groups.forEach((g) => clearItems(g, g.items))
  }
  // An empty, answered source is left out; one still checking or unreachable
  // is not empty — it is unknown — and stays.
  const shown = groups.filter((g) => g.items.length > 0 || g.state !== 'ready')
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className={cn('w-[380px] max-w-[calc(100vw-24px)] p-0', contentClassName)}
        aria-label="Alerts"
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <span className="text-dense-label font-semibold">Alerts</span>
          {count > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-dense-caption font-bold leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
          {anyItems && (
            <button type="button" className={cn(CLR_CLASS, 'ml-auto')} onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
        {/* The one line that keeps the two counts apart. */}
        <p className="border-b px-3 py-1.5 text-dense-micro text-muted-foreground/70">
          Grouped by source · news, never work — work waits in the Decision Inbox.
        </p>

        <div className="flex max-h-[min(70vh,520px)] flex-col gap-2 overflow-y-auto p-2.5">
          {shown.length === 0 ? (
            <p className="m-0 px-2 py-4 text-center text-dense-meta text-muted-foreground">
              No new alerts. Cleared items stay in each source's own page.
            </p>
          ) : null}
          {shown.map((group) => {
            // A source with two or more stacks: the newest shows, the rest
            // lie under it as two shadow layers and an "N more" (Rev .72 §10).
            const open = fanned.has(group.id)
            const stacked = !open && group.items.length > 1
            const rows = stacked ? group.items.slice(0, 1) : group.items
            return (
            <div
              key={group.id}
              className={cn(
                'flex-none rounded-[10px] bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)] pb-1',
                stacked &&
                  'mb-2 shadow-[0_5px_0_-2px_color-mix(in_srgb,var(--sk-ink)_5%,transparent),0_10px_0_-5px_color-mix(in_srgb,var(--sk-ink)_3%,transparent)]',
              )}
            >
              <GroupHeading group={group} canFold={open && group.items.length > 1} onFold={() => toggleFan(group.id)} />
              {group.items.length > 0 ? (
                rows.map((item) => <AlertRow key={item.id} group={group} item={item} onGo={go} />)
              ) : (
                <GroupBody group={group} />
              )}
              {stacked ? (
                <button
                  type="button"
                  onClick={() => toggleFan(group.id)}
                  className="mx-2 mb-1 mt-0.5 block h-[22px] w-[calc(100%-16px)] rounded-full bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] text-dense-caption font-semibold text-[var(--sk-mute2)] hover:text-foreground"
                >
                  {group.items.length - 1} more
                </button>
              ) : null}
              {group.footnote ? (
                <p className="px-3 pb-1.5 pt-0.5 text-dense-micro leading-snug text-muted-foreground/60">
                  {group.footnote}
                </p>
              ) : null}
            </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
