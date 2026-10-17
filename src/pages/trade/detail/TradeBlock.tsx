import { CollapsibleChevron } from '@/components/data-display'
import { cn } from '@/lib/utils'

/** A block the page folds itself: where a tier starts it folded (`lineageFold.ts`). */
export interface TradeBlockFold {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * One of the Instance page's grouped blocks: a caption, a title, an aside and its body.
 *
 * With `fold`, the caption and title open and close the body; without it (the
 * desk, and every block but one) the block is as it always was.
 */
export function TradeBlock({
  cap,
  title,
  note,
  action,
  fold,
  children,
}: {
  cap: string
  title: string
  note?: string
  action?: React.ReactNode
  fold?: TradeBlockFold
  children: React.ReactNode
}) {
  const folded = fold != null && !fold.open
  const name = (
    <>
      <span className="text-dense-micro font-semibold text-muted-foreground">{cap}</span>
      <span className="text-dense-body font-semibold">{title}</span>
    </>
  )
  return (
    <section className="min-w-0 mat-card">
      <header
        className={cn(
          'flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] px-3 py-2',
          folded && 'border-b-0',
        )}
      >
        {fold ? (
          <button
            type="button"
            aria-expanded={fold.open}
            onClick={() => fold.onOpenChange(!fold.open)}
            className="inline-flex cursor-pointer items-baseline gap-x-2.5 border-0 bg-transparent p-0 text-left text-inherit"
          >
            <CollapsibleChevron expanded={fold.open} className="size-3 self-center text-muted-foreground" />
            {name}
          </button>
        ) : (
          name
        )}
        {note ? <span className="text-dense-micro text-muted-foreground text-pretty">{note}</span> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </header>
      {folded ? null : children}
    </section>
  )
}
