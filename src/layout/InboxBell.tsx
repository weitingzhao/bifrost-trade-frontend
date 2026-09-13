import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { InboxSummary } from '@/hooks/useInbox'

/**
 * The one bell.
 *
 * The badge has to tell three things apart that all used to look like quiet: a
 * genuine all-clear, a first fetch still out, and a source that could not be
 * reached. The last is the dangerous one — a bell that drops its badge when
 * its own check fails reads exactly like nothing is wrong, which is the bug
 * `bellState` was written for. Here it shows `?` instead, and the tooltip
 * names which source went dark: a count you cannot trust is still worth more
 * than a silence you cannot question.
 */

const BADGE_FILL: Record<'red' | 'yellow' | 'green' | 'gray', string> = {
  red: 'bg-destructive text-white',
  yellow: 'bg-warning text-black',
  green: 'bg-muted-foreground text-white',
  gray: 'bg-lamp-gray text-white',
}

function tooltip(summary: InboxSummary): string {
  const parts: string[] = []
  if (summary.count > 0) parts.push(`${summary.count} waiting`)
  else if (!summary.incomplete && !summary.checking) parts.push('Nothing waiting')
  if (summary.checking) parts.push('checking…')
  if (summary.incomplete) parts.push(`${summary.unreachable.join(', ')} unreachable — the count may be short`)
  return parts.join(' · ')
}

export function InboxBell({ summary, onOpen }: { summary: InboxSummary; onOpen: () => void }) {
  // `?` when nothing is known and something is unreachable; otherwise the
  // count, tinted by the worst thing in it.
  const showBadge = summary.count > 0 || summary.incomplete
  // 99+, not 9+: the status bar shows the same count unabbreviated, and two
  // surfaces reading `9+` and `18` for one fact is a difference the reader has
  // to resolve for no reason. The badge grows with the digits.
  const label = summary.count > 0 ? (summary.count > 99 ? '99+' : String(summary.count)) : '?'
  const fill = summary.incomplete && summary.count === 0 ? BADGE_FILL.gray : BADGE_FILL[summary.worst ?? 'gray']

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          onClick={onOpen}
          aria-label="Open the Inbox"
        >
          <Bell className="h-4 w-4" />
          {showBadge && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-dense-micro font-bold leading-none',
                fill,
              )}
            >
              {label}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip(summary)}</TooltipContent>
    </Tooltip>
  )
}
