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

const BTN =
  'h-6 border-0 bg-transparent px-2.75 text-dense-label font-semibold leading-none whitespace-nowrap'

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
                'bg-[var(--sk-surface)] text-foreground',
                side === 'method'
                  ? 'shadow-[inset_0_-2px_0_var(--color-entity-strategy)]'
                  : 'shadow-[inset_0_-2px_0_var(--primary)]',
              )
            : built
              ? 'cursor-pointer text-muted-foreground hover:bg-[var(--sk-surface)] hover:text-foreground'
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
        // Rev .67: no frame — the face you are on is the fill (Method violet
        // 12%, at rest ink 6%), radius 8.
        'inline-flex min-w-0 items-center overflow-hidden rounded-[8px] border border-transparent',
        onMethod
          ? 'bg-[var(--color-entity-strategy)]/[0.12]'
          : 'bg-[var(--mat-card-fill-hover)]',
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
            'inline-flex h-6 w-6.5 flex-none items-center justify-center border-r border-border',
            'text-dense-body no-underline hover:bg-[var(--sk-surface)]',
            onMethod ? 'text-[var(--color-entity-strategy)]' : 'text-muted-foreground',
          )}
        >
          ⧉
        </Link>
      ) : (
        <span
          title="This page has a Method face in the design; it is not built on this side yet."
          className={cn(
            'inline-flex h-6 w-6.5 flex-none items-center justify-center border-r border-border',
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
