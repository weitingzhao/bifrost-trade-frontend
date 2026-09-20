/**
 * Everything wanting a look, in one panel, grouped by who said it.
 *
 * Design: `design/trade/_Shell StatusBar.dc.html`. It opens **upward** off the
 * status bar's count chip, which is now the only way in — until 2026-09-20
 * this was a right-hand drawer, because two bars reached it (a top-bar bell
 * and this segment) and one popover cannot anchor to two triggers without
 * becoming two popovers with two open states. The bell is gone, so the
 * compromise is gone with it and the shape is the design's again.
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
import { Button } from '@/components/ui/button'
import { formatLastUpdate } from '@/utils/positions'
import type { AlertGroup, AlertItem } from '@/hooks/useAlerts'

interface Props {
  groups: AlertGroup[]
  count: number
  onDismissAll: () => void
  /** The status-bar chip. The panel hangs off it and nothing else. */
  children: React.ReactNode
}

function tickReducer(n: number): number { return n + 1 }

function whenLabel(when: AlertItem['when']): string {
  return typeof when === 'number' ? `${formatLastUpdate(when)} ago` : when
}

function GroupHeading({ group }: { group: AlertGroup }) {
  return (
    <div className="flex items-baseline gap-2 px-3 pb-1 pt-2.5">
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

function AlertRow({ item, onGo }: { item: AlertItem; onGo: (to: string) => void }) {
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
    <div className="flex items-start gap-2 px-3 py-1.5 hover:bg-accent/50">
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

export function AlertsPopover({ groups, count, onDismissAll, children }: Props) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  // Relative timestamps only need to move while someone is reading them.
  const [, tick] = useReducer(tickReducer, 0)
  useEffect(() => {
    if (!open) return
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [open])

  const dismissable = groups.some((g) => g.items.some((i) => i.onDismiss != null))
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={6}
        className="w-[400px] p-0"
        aria-label="Alerts"
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <span className="text-dense-label font-semibold">Alerts</span>
          {count > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-dense-caption font-bold leading-none text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
          {dismissable && (
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={onDismissAll}>
              Dismiss all
            </Button>
          )}
        </div>
        {/* The one line that keeps the two counts apart. */}
        <p className="border-b px-3 py-1.5 text-dense-micro text-muted-foreground/70">
          Grouped by source · news, never work — work waits in the Decision Inbox.
        </p>

        {/* Always the four groups, never a single "nothing waiting" panel. An
            empty group still has something to say — which source answered,
            what it checked, what it does not cover — and collapsing all four
            into one cheerful line throws exactly that away. */}
        <div className="max-h-[420px] overflow-y-auto pb-2">
          {groups.map((group) => (
            <div key={group.id}>
              <GroupHeading group={group} />
              {group.items.length > 0 ? (
                group.items.map((item) => <AlertRow key={item.id} item={item} onGo={go} />)
              ) : (
                <GroupBody group={group} />
              )}
              {group.footnote ? (
                <p className="px-3 pb-1.5 pt-0.5 text-dense-micro leading-snug text-muted-foreground/60">
                  {group.footnote}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
