/**
 * The `⧉ Reading | Method` switch — one page, shown closed or shown open.
 *
 * The design's control, and its rules: the glyph is both the state lamp and
 * the flip handle, violet means you are on the back of the page, and the same
 * violet is the Lens's active-scope violet so the two read as one vocabulary.
 *
 * One deviation, and it is a truth rather than a taste: the design pairs eight
 * routes and this side has built one of them. A switch that navigates to a
 * route with no page would be a control that lies about where it goes, so the
 * unbuilt face renders disabled and says so. It lights up by itself the day
 * that page is built — nothing here has to be revisited.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { faceOf } from '@/lib/design/faces'

// Rev .142: a capsule segmented control — track ink 7%, the face you are on a
// raised glass pill; on the Method side the pill keeps the violet, at 26%.
const BTN =
  'h-[22px] rounded-full border-0 bg-transparent px-3 text-xs font-semibold leading-none whitespace-nowrap transition-colors active:[filter:var(--press)]'

export function PageFaceSwitch({
  path,
  className,
  methodTo,
  methodTitle,
}: {
  path: string
  className?: string
  /**
   * Where Method opens, when the page carries its own context there — the
   * design's `_Part Face` `method-to` (Rev .56): Symbol passes the tab it is on.
   */
  methodTo?: string
  methodTitle?: string
}) {
  const face = faceOf(path)
  if (!face) return null

  const onMethod = face.side === 'method'
  const flipTo = onMethod ? face.other : (methodTo ?? face.other)
  const flipTitle = onMethod
    ? 'You are on the Method face — how the number is made. Flip back to the Reading.'
    : 'This page has a Method face. Flip it over.'

  const tab = (side: 'reading' | 'method', to: string, label: string, title: string) => {
    const active = face.side === side
    const built = active || face.otherBuilt
    const body = (
      <span
        className={cn(
          BTN,
          'inline-flex items-center',
          active
            ? cn(
                'text-foreground shadow-[var(--glass-lens),0_1px_2px_rgba(0,0,0,0.22)]',
                side === 'method'
                  ? 'bg-[color-mix(in_srgb,var(--color-entity-strategy)_26%,transparent)]'
                  : 'bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)]',
              )
            : built
              ? 'cursor-pointer text-[var(--sk-mute2)] hover:text-foreground'
              : 'cursor-not-allowed text-muted-foreground/60',
        )}
      >
        {label}
      </span>
    )
    if (active) return body
    if (!built) {
      return (
        <span key={side} title={`${label} is not built on this side yet.`} aria-disabled>
          {body}
        </span>
      )
    }
    return (
      <Link key={side} to={to} title={title} className="no-underline">
        {body}
      </Link>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-0.5 overflow-hidden rounded-full border border-transparent p-0.5',
        'bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]',
        className,
      )}
      role="group"
      aria-label="Reading or Method"
    >
      {face.otherBuilt ? (
        <Link
          to={flipTo}
          title={flipTitle}
          className={cn(
            'inline-flex h-[22px] w-6 flex-none items-center justify-center rounded-full',
            'text-dense-body no-underline hover:bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]',
            onMethod ? 'text-[var(--color-entity-strategy)]' : 'text-muted-foreground',
          )}
        >
          ⧉
        </Link>
      ) : (
        <span
          title="This page has a Method face in the design; it is not built on this side yet."
          className={cn(
            'inline-flex h-[22px] w-6 flex-none items-center justify-center rounded-full',
            'text-dense-body text-muted-foreground/60',
          )}
          aria-disabled
        >
          ⧉
        </span>
      )}
      {tab('reading', face.reading, 'Reading', 'What the market says.')}
      {tab(
        'method',
        methodTo ?? face.method,
        'Method',
        methodTitle ?? 'How the number is made — same subject, same endpoint, shown open.',
      )}
    </span>
  )
}
