/**
 * A titled panel: a caption, what it says, and what it is reading over.
 *
 * The shape the layer pages settled on — `/risk`, `/portfolio`,
 * `/research/book` and `/review/objectives` each grew an identical local copy
 * within a day of each other, which is how a pattern announces itself. Four
 * copies of a header row is also four chances for them to drift apart, and
 * these four sit one click from each other.
 *
 * The slots each carry a different kind of thing, and keeping them apart is
 * the whole point: the **cap** names the reading in the page's own vocabulary
 * ("Trust", "Headroom", "Census"), the **title** says what it shows in a
 * reader's words, and the **note** is the scope or the count the numbers are
 * true within. A panel whose note is really a second title has lost that.
 *
 * The cap is optional because the prototypes draw headers both ways — a panel
 * whose title already names the reading ("Where they die") does not want the
 * same words twice in two sizes.
 *
 * **action** holds the way out of the panel. It takes the right edge, which
 * is the note's usual place, so a panel with both prints the note beside the
 * title instead — the note is part of the sentence the header makes, and the
 * way out is not.
 *
 * **tone** is for the panel whose header is itself a verdict: the Portfolio
 * layer page goes amber when a source has gone quiet, the way a breach panel
 * goes red. It is a meaning, not a colour — the component decides how amber
 * looks, so two panels saying the same thing cannot say it differently.
 *
 * ## The two surfaces
 *
 * A panel is a **well**: its body is the inset surface and its header is the
 * elevated one, so the header lifts off the body and the body sits below the
 * canvas. Both come straight from the design's own tokens — the prototypes
 * paint `.os-panel` with `--sk-ground` and `.os-panel-h` with `--sk-surface`,
 * which are `bg-background` and `bg-secondary` here, value for value.
 *
 * It was `bg-card` on both until 2026-09-21, which is the canvas colour: the
 * panels were the same shade as the page behind them and only a hairline
 * border said where one ended. Pages built this way read flat beside their
 * prototypes, and the repo's own canvas rule had been saying so the whole
 * time — *a `bg-card` block the same colour as the canvas is forbidden*.
 * Changed for every reader at once rather than per page, because a panel that
 * looks different on two pages one click apart is worse than one that
 * disagrees with a prototype.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The caption grammar, for the panels the design draws without a header bar:
 * 11/600 sentence case, like every small label since design Rev .85–.92 — the
 * tracked caps were the last uppercase tier on a page.
 */
export const SECTION_CAP_CLASS = 'text-dense-meta font-semibold text-muted-foreground'

export type SectionPanelTone = 'warning' | 'danger'

const TONE_PANEL: Record<SectionPanelTone, string> = {
  warning: 'border-warning/40',
  danger: 'border-destructive/40',
}
const TONE_CAP: Record<SectionPanelTone, string> = {
  warning: 'text-warning',
  danger: 'text-destructive',
}

export function SectionPanel({
  cap,
  title,
  note,
  action,
  tone,
  className,
  children,
}: {
  cap?: string
  title: ReactNode
  note?: ReactNode
  action?: ReactNode
  tone?: SectionPanelTone
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        // Panel material (design Rev .62, Page Look 1a): a grouped inset — no
        // frame, ink 4%, radius 12. A toned panel keeps its tinted edge: that
        // edge is the reading, not decoration.
        'overflow-hidden border mat-card',
        tone == null ? null : TONE_PANEL[tone],
        className,
      )}
    >
      <header
        className={
          // The card head is a rule, not a band (Rev .62): no fill, the ink-6% line.
          // A toned panel colours its edge and its cap only — a severity never
          // fills the head (§16.2, Rev .82–.83).
          'flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b px-3 py-2'
        }
      >
        {cap != null ? (
          <span className={cn(SECTION_CAP_CLASS, tone != null && TONE_CAP[tone])}>{cap}</span>
        ) : null}
        <h2 className="text-dense-body font-semibold">{title}</h2>
        {note != null ? (
          <span className={cn('text-dense-meta text-muted-foreground', action == null && 'ml-auto')}>
            {note}
          </span>
        ) : null}
        {action != null ? <span className="ml-auto text-dense-meta">{action}</span> : null}
      </header>
      {children}
    </section>
  )
}
