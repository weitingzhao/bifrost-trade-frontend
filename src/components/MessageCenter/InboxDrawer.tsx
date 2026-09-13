/**
 * One drawer for everything waiting on you, grouped by who said it.
 *
 * Design: `design/trade/_Shell TopBar.dc.html` renders this as a 380px popover
 * under a top-bar button. It stays a drawer here because two bars reach it —
 * the header bell and the status-bar Inbox segment — and one popover cannot
 * anchor to two triggers without becoming two popovers with two open states.
 * The shape is the drawer's; the content is the design's.
 */
import { useReducer, useEffect } from 'react'
import { X, BellOff } from 'lucide-react'
import { HealthLamp } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { formatLastUpdate } from '@/utils/positions'
import type { InboxGroup, InboxItem } from '@/hooks/useInbox'

interface Props {
  open: boolean
  groups: InboxGroup[]
  count: number
  onDismissAll: () => void
  onClose: () => void
  onNavigate: (to: string) => void
}

function tickReducer(n: number): number { return n + 1 }

function whenLabel(when: InboxItem['when']): string {
  return typeof when === 'number' ? `${formatLastUpdate(when)} ago` : when
}

function GroupHeading({ group }: { group: InboxGroup }) {
  return (
    <div className="flex items-baseline gap-2 px-4 pb-1 pt-3">
      <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {group.title}
      </span>
      <span className="font-mono text-dense-micro tabular-nums text-muted-foreground/70">
        {group.items.length}
      </span>
      <span className="ml-auto text-dense-micro text-muted-foreground/60">{group.source}</span>
    </div>
  )
}

function InboxRow({ item, onClose, onNavigate }: {
  item: InboxItem
  onClose: () => void
  onNavigate: (to: string) => void
}) {
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
    <div className="flex items-start gap-2 px-4 py-1.5 hover:bg-accent/50">
      {item.to ? (
        <button
          type="button"
          onClick={() => {
            onClose()
            onNavigate(item.to!)
          }}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          {body}
        </button>
      ) : (
        <span className="flex min-w-0 flex-1 items-start gap-2">{body}</span>
      )}
      {item.onDismiss ? (
        <button
          type="button"
          onClick={item.onDismiss}
          className="shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        // Keeps every row's right edge on one line whether or not it can be
        // cleared — a dismiss button that appears on some rows and not others
        // should not also move the timestamp.
        <span className="h-4 w-4 shrink-0" aria-hidden />
      )}
    </div>
  )
}

/** Three of the four states. `ready` with rows is the fourth and renders above. */
function GroupBody({ group }: { group: InboxGroup }) {
  if (group.state === 'checking') {
    return <p className="px-4 pb-1 text-dense-meta text-muted-foreground">Checking…</p>
  }
  if (group.state === 'unavailable') {
    return (
      <div className="space-y-1 px-4 pb-2">
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
  return <p className="px-4 pb-1 text-dense-meta text-muted-foreground/60">Nothing waiting</p>
}

export function InboxDrawer({ open, groups, count, onDismissAll, onClose, onNavigate }: Props) {
  // Relative timestamps only need to move while someone is reading them.
  const [, tick] = useReducer(tickReducer, 0)
  useEffect(() => {
    if (!open) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [open])

  const dismissable = groups.some((g) => g.items.some((i) => i.onDismiss != null))

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l bg-popover shadow-xl',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="Inbox"
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
          <span className="text-sm font-semibold">Inbox</span>
          {count > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-dense-caption font-bold leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
          <span className="text-dense-micro text-muted-foreground/60">grouped by source</span>
          <div className="ml-auto flex items-center gap-1">
            {dismissable && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDismissAll}>
                Dismiss all
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-3">
          {count === 0 && groups.every((g) => g.state === 'ready') ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <BellOff className="h-10 w-10 opacity-30" />
              <p className="text-sm">Nothing waiting</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id}>
                <GroupHeading group={group} />
                {group.items.length > 0 ? (
                  group.items.map((item) => (
                    <InboxRow key={item.id} item={item} onClose={onClose} onNavigate={onNavigate} />
                  ))
                ) : (
                  <GroupBody group={group} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
