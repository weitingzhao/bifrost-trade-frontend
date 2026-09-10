/**
 * The first thing in the tab order, and invisible until it is focused.
 *
 * Every page here opens behind a sidebar of ~40 nav links and a header of
 * controls. Without this, reaching the table you came for means tabbing past
 * all of it, on every page, every time.
 *
 * `focus-visible` rather than `focus`: this should appear for someone who
 * arrived by keyboard, not flash when a pointer user happens to click near it.
 */
export function SkipToContent({ targetId = 'main-content' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className={
        'sr-only z-[300] rounded-md bg-popover px-3 py-2 text-dense-body font-medium ' +
        'text-popover-foreground ring-1 ring-foreground/20 shadow-lg ' +
        'focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      }
      onClick={(e) => {
        // The href alone moves the scroll but not the focus ring in every
        // browser; move focus explicitly so the next Tab continues from the
        // content rather than resuming in the nav.
        const el = document.getElementById(targetId)
        if (!el) return
        e.preventDefault()
        // focus() scrolls the element into view by default; a separate
        // scrollIntoView adds nothing and is not implemented in jsdom.
        el.focus()
      }}
    >
      Skip to content
    </a>
  )
}
