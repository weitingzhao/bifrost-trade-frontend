/**
 * The macOS switch's track and knob (design Rev .72 §11, Settings Rev .80):
 * accent when on, ink 18% when off, a white knob that slides. Drawing only —
 * the caller owns the `role="switch"` control, so a row can make its whole
 * width the target (the user menu) or keep the switch beside its words
 * (Settings) without nesting one button in another.
 */
import { cn } from '@/lib/utils'

export function SwitchTrack({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('relative h-[18px] w-8 flex-none rounded-full transition-colors', className)}
      style={{
        background: on ? 'var(--sk-accent)' : 'color-mix(in srgb, var(--sk-ink) 18%, transparent)',
      }}
    >
      <span
        className="absolute top-[2px] size-[14px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.3)] transition-[left] motion-reduce:transition-none"
        style={{ left: on ? 16 : 2 }}
      />
    </span>
  )
}
