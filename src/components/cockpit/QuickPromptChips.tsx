import {
  BarChart3,
  ClipboardList,
  LineChart,
  Radar,
  Sunrise,
  Sunset,
  TrendingUp,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

type QuickPrompt = {
  id: string
  label: string
  Icon: Icon
  prompt: string
}

/**
 * Common conversation starters surfaced above the composer when the chat is
 * empty.  Chosen for high-frequency workflows a discretionary options trader
 * runs every day: pre-market brief, post-market recap, portfolio risk, VRP,
 * SEPA, and the event radar.
 *
 * Prompts are English so the specialist agents (which read tools/instructions
 * in English) get a clean handoff.  Users can still type Chinese freely.
 */
export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'premarket',
    label: 'Pre-market brief',
    Icon: Sunrise,
    prompt:
      'Give me a pre-market brief: overnight news, macro events today, and how they affect my current portfolio and watchlist. Cite the tools you used.',
  },
  {
    id: 'postmarket',
    label: 'Post-market recap',
    Icon: Sunset,
    prompt:
      'Post-market recap: key market moves today, notable changes in my portfolio, and any hypotheses worth logging for tomorrow.',
  },
  {
    id: 'portfolio-risk',
    label: 'Portfolio risk',
    Icon: BarChart3,
    prompt:
      'Analyze my current portfolio risk exposure — concentration, delta/vega net, IV of my names, and any positions worth trimming or hedging.',
  },
  {
    id: 'vol-overview',
    label: 'Volatility watch',
    Icon: LineChart,
    prompt:
      'Volatility overview for my watchlist and portfolio names: IV rank, term-structure anomalies, and event-driven vol trades worth exploring.',
  },
  {
    id: 'sepa',
    label: 'SEPA candidates',
    Icon: TrendingUp,
    prompt:
      "Show me today's top SEPA screener candidates with strong momentum, and cross-check with the latest hypotheses I have active.",
  },
  {
    id: 'event-radar',
    label: 'Event radar',
    Icon: Radar,
    prompt:
      'Any earnings, macro events, or unusual flow signals I should watch in the next 5 trading days — especially anything touching my portfolio.',
  },
  {
    id: 'hypotheses',
    label: 'Active hypotheses',
    Icon: ClipboardList,
    prompt:
      'Summarize my active hypotheses, their current market backdrop, and next validation steps.',
  },
]

interface Props {
  onPick: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function QuickPromptChips({ onPick, disabled, className }: Props) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)} aria-label="Suggested prompts">
      {QUICK_PROMPTS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(p.prompt)}
          title={p.prompt}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            'text-dense-caption text-primary',
            'border border-primary/25 bg-primary/[0.06]',
            'transition-colors hover:bg-primary/15 hover:border-primary/40',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          )}
        >
          <p.Icon className="size-3" aria-hidden />
          {p.label}
        </button>
      ))}
    </div>
  )
}
