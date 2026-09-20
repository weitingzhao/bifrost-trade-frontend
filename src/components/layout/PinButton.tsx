/**
 * Pin this page to the sidebar shelf.
 *
 * The control that makes the shelf honest: a pin is something the reader put
 * there, so it has to be put there by hand and taken back the same way. The
 * refusal when the shelf is full is part of the design, not an edge case —
 * six is the point at which a shortcut list becomes a list you scan.
 */
import { useState } from 'react'
import { Pin, PinOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePins, PIN_MAX } from '@/lib/pins'

export function PinButton({ to, label, className }: { to: string; label: string; className?: string }) {
  const { toggle, has } = usePins()
  const pinned = has(to)
  const [said, setSaid] = useState<string | null>(null)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setSaid(toggle({ to, label }).why)}
          aria-pressed={pinned}
          className={cn(
            'inline-flex h-6 items-center gap-1.25 rounded border px-1.75 text-dense-meta transition-colors',
            pinned
              ? 'border-primary/45 bg-primary/[0.08] text-primary'
              : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
            className,
          )}
        >
          {pinned ? <PinOff className="h-3 w-3" aria-hidden /> : <Pin className="h-3 w-3" aria-hidden />}
          {pinned ? 'Pinned' : 'Pin'}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">
        {said ??
          (pinned
            ? 'On the sidebar shelf, below the five layers. Click to take it off.'
            : `Put this page on the sidebar shelf — your shortcut, not structure. The shelf holds ${PIN_MAX}.`)}
      </TooltipContent>
    </Tooltip>
  )
}
