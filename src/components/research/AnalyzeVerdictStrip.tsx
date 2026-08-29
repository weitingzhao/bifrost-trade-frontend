/**
 * Analyze verdict strip — Wave 15 shell component.
 */
import { Link } from 'react-router-dom'
import { DenseTag, type DenseTagVariant } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type AnalyzeVerdictTone = 'success' | 'danger' | 'warning' | 'neutral' | 'info'

export interface AnalyzeVerdictSignal {
  label: string
  value: string
}

export interface AnalyzeVerdictNextMove {
  label: string
  href: string
}

export interface AnalyzeVerdictStripProps {
  verdictLabel: string
  tone: AnalyzeVerdictTone
  narrative?: string
  /** Alias for narrative (Analyze pages) */
  summary?: string
  signals?: AnalyzeVerdictSignal[]
  nextMoves?: AnalyzeVerdictNextMove[]
  className?: string
}

const TONE_TAG: Record<AnalyzeVerdictTone, DenseTagVariant> = {
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  neutral: 'neutral',
  info: 'info',
}

const TONE_BORDER: Record<AnalyzeVerdictTone, string> = {
  success: 'border-success/40',
  danger: 'border-destructive/40',
  warning: 'border-warning/40',
  neutral: 'border-border',
  info: 'border-info/40',
}

export function AnalyzeVerdictStrip({
  verdictLabel,
  tone,
  narrative,
  summary,
  signals = [],
  nextMoves = [],
  className,
}: AnalyzeVerdictStripProps) {
  const body = narrative ?? summary
  return (
    <Card variant="elevated" className={cn('border', TONE_BORDER[tone], className)}>
      <CardContent className="flex flex-col gap-2 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <DenseTag variant={TONE_TAG[tone]}>{verdictLabel}</DenseTag>
          {body ? (
            <span className="text-dense-label text-foreground min-w-0 flex-1">{body}</span>
          ) : null}
        </div>
        {signals.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-dense-caption text-muted-foreground">
            {signals.map((s) => (
              <span key={s.label}>
                <span className="font-medium text-foreground">{s.label}</span> {s.value}
              </span>
            ))}
          </div>
        ) : null}
        {nextMoves.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {nextMoves.map((m) => (
              <Button
                key={m.href + m.label}
                asChild
                variant="outline"
                size="sm"
                className="h-6 px-2 text-dense-micro"
              >
                <Link to={m.href}>{m.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
