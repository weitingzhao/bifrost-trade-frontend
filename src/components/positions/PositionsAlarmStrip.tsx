/**
 * The one block that stays visible, and the only thing above the book.
 *
 * It answers a single question — is anything wrong right now — so the rest of
 * the page can stay collapsed. Every chip is a check with a threshold; a chip
 * that is quiet reads as muted text and a chip that fires reads as a tag, so
 * the strip's height does not change but its weight does.
 *
 * Clicking a chip opens the section that holds the detail and scrolls to it.
 * That is the whole navigation model: the alarm says which question to ask, and
 * the section it points at is where the answer already lives.
 */
import { cn } from '@/lib/utils'
import { DenseTagButton } from '@/components/data-display'
import type { AlarmCheck, AlarmTarget } from '@/hooks/usePositionsAlarm'

const TONE_TAG = {
  danger: 'danger',
  warn: 'warning',
  ok: 'neutral',
} as const

export function PositionsAlarmStrip({
  checks,
  onOpenTarget,
  className,
}: {
  checks: AlarmCheck[]
  onOpenTarget: (target: AlarmTarget) => void
  className?: string
}) {
  if (checks.length === 0) return null
  const firing = checks.filter((c) => c.tone !== 'ok')

  return (
    <div
      className={cn(
        'mb-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 rounded-md border px-2 py-1.5',
        firing.length > 0 ? 'border-border bg-secondary/60' : 'border-border/60 bg-card',
        className,
      )}
      role="status"
      aria-label="Position alarms"
    >
      <span className="mr-0.5 shrink-0 text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
        {firing.length > 0 ? `${firing.length} to check` : 'All clear'}
      </span>
      {checks.map((c) => (
        <AlarmChip key={c.id} check={c} onOpenTarget={onOpenTarget} />
      ))}
    </div>
  )
}

function AlarmChip({
  check,
  onOpenTarget,
}: {
  check: AlarmCheck
  onOpenTarget: (target: AlarmTarget) => void
}) {
  const label = (
    <>
      {check.label} <span className="font-mono tabular-nums">{check.value}</span>
    </>
  )

  // A quiet check still shows its number — knowing it was checked is the point —
  // and it still navigates. It simply does not borrow the visual weight of one
  // that fired: muted, but not inert, because "4% of buying power" is exactly
  // the number worth opening the detail on before it becomes a problem.
  if (check.tone === 'ok' && check.target) {
    const quietTarget = check.target
    return (
      <button
        type="button"
        className="shrink-0 cursor-pointer rounded px-1 text-dense-caption text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        title={`${check.detail}\nClick to open the section with the detail.`}
        onClick={() => onOpenTarget(quietTarget)}
      >
        {label}
      </button>
    )
  }

  if (check.tone === 'ok' || !check.target) {
    return (
      <span
        className={cn(
          'shrink-0 rounded px-1 text-dense-caption',
          check.tone === 'danger'
            ? 'font-semibold text-loss'
            : check.tone === 'warn'
              ? 'font-semibold text-warning'
              : 'text-muted-foreground',
        )}
        title={check.detail}
      >
        {label}
      </span>
    )
  }

  const target = check.target
  return (
    <DenseTagButton
      variant={TONE_TAG[check.tone]}
      size="cell"
      title={`${check.detail}\nClick to open the section with the detail.`}
      onClick={() => onOpenTarget(target)}
    >
      {label}
    </DenseTagButton>
  )
}
