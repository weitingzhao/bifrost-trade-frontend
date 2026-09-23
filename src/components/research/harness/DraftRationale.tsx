import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A curator's argument, clamped rather than scrolled.
 *
 * It runs 697–1254 characters on DEV and used to sit in a 160px scroll area
 * inside a card that has no height of its own — a second scrollbar for one
 * paragraph. The design's answer (Rev 2026-09-22.7) is three lines and a
 * `Read all`, and it is deliberately not remembered: the queue is read top to
 * bottom, and a card left open from yesterday pushes the next call off screen.
 *
 * Shared by both kinds that carry one, extracted before the second copy (§14.2).
 */
export function DraftRationale({ text }: { text: string }) {
  const [full, setFull] = useState(false)
  return (
    <div className="space-y-0.5">
      <p
        className={cn('max-w-prose whitespace-pre-line text-foreground/85', full ? '' : 'overflow-hidden')}
        style={full ? undefined : { maxHeight: '4.5em' }}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setFull((v) => !v)}
        className="text-dense-micro text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
      >
        {full ? 'Collapse' : `Read all · ${text.length.toLocaleString('en-US')} chars`}
      </button>
    </div>
  )
}
