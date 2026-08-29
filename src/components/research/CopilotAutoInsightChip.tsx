/**
 * Dismissible Copilot auto-insight chip — Wave 15.
 * Optional AskCopilot wiring via origin props.
 */
import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'

export interface CopilotAutoInsightChipProps {
  message?: string
  /** Alias used by Analyze pages */
  text?: string
  tone?: 'success' | 'danger' | 'warning' | 'info'
  originPage?: string
  originLabel?: string
  symbol?: string
  suggestedPrompt?: string
  onAsk?: () => void
  className?: string
}

const TONE_CLASS = {
  success: 'border-success/40 bg-success/5 text-success',
  danger: 'border-destructive/40 bg-destructive/5 text-destructive',
  warning: 'border-warning/40 bg-warning/5 text-warning',
  info: 'border-border bg-secondary text-foreground',
} as const

export function CopilotAutoInsightChip({
  message,
  text,
  tone = 'info',
  originPage,
  originLabel,
  symbol,
  suggestedPrompt,
  onAsk,
  className,
}: CopilotAutoInsightChipProps) {
  const [dismissed, setDismissed] = useState(false)
  const body = message ?? text ?? ''
  if (dismissed || !body) return null

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-dense-meta',
        TONE_CLASS[tone],
        className,
      )}
      role="status"
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="leading-snug">{body}</p>
        {originPage ? (
          <AskCopilotButton
            originPage={originPage}
            originLabel={originLabel ?? originPage}
            symbol={symbol}
            suggestedPrompt={suggestedPrompt}
            size="dense"
          />
        ) : onAsk ? (
          <button type="button" className="text-dense-caption underline" onClick={onAsk}>
            Ask Copilot
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
        aria-label="Dismiss insight"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
