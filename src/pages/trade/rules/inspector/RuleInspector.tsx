/**
 * The Desk's inspector shell (design Rev .140 §2): the object picked on the
 * chain, edited in a floating glass panel — 8 off the content's right edge
 * (left of the Symbol list's column, not over it), 52 from the top, 400 wide,
 * radius 14, the side glass (DS `InspectorPanel`). No scrim, no
 * Save / Cancel: fields write into the object as they change. The foot holds
 * the object's Delete · Duplicate and says how saving works. One inspector at
 * a time; Esc closes it.
 */
import { useEffect, type ReactNode } from 'react'
import { InspectorPanel } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { LANE_GAP_PX, useBottomLane } from '@/layout/bottomLane'
import { cn } from '@/lib/utils'

export const FIELD =
  'h-7 w-full rounded-lg border border-transparent bg-[var(--field-fill)] px-2.5 text-dense-body outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-glow)]'

export function RuleInspector({
  title,
  meta,
  metaClassName,
  onClose,
  onDelete,
  deleteBlocked,
  onDuplicate,
  duplicateLabel = 'Duplicate',
  note,
  loading,
  children,
}: {
  title: ReactNode
  /** The second line: the write it makes, or a version warning (the gate). */
  meta?: ReactNode
  metaClassName?: string
  onClose: () => void
  onDelete?: () => void
  /** Why Delete would be refused — said on the button, nothing is held. */
  deleteBlocked?: string | null
  onDuplicate?: () => void
  duplicateLabel?: string
  /** The closing note in the body (what saving does, who reads it). */
  note?: ReactNode
  loading?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // The content lane's right end, less the lane's own gap: 8 off the content.
  const lane = useBottomLane()
  const right = Math.max(8, lane.right - LANE_GAP_PX + 8)
  return (
    <div className="fixed top-[52px] bottom-2 z-40 flex items-start" style={{ right }}>
      <InspectorPanel
        selection="single"
        title={title}
        meta={meta ? <span className={metaClassName}>{meta}</span> : undefined}
        onClose={onClose}
        className="w-[400px] max-w-[calc(100vw-16px)]"
        foot={
          <div className="flex items-center gap-2">
            {onDelete ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  'h-7 text-dense-meta',
                  deleteBlocked ? 'text-muted-foreground' : 'text-[var(--color-loss)]'
                )}
                title={deleteBlocked ?? 'No confirm — Undo on the toast or ⌘Z'}
                aria-disabled={deleteBlocked ? true : undefined}
                onClick={onDelete}
              >
                Delete
              </Button>
            ) : null}
            {onDuplicate ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-dense-meta"
                onClick={onDuplicate}
              >
                {duplicateLabel}
              </Button>
            ) : null}
            <span className="ml-auto">Saves as you type · ⌘Z undoes</span>
          </div>
        }
      >
        {loading ? <p className="m-0 text-dense-meta text-muted-foreground">Loading…</p> : children}
        {note && !loading ? (
          <p className="m-0 border-t border-[var(--table-rule)] pt-2.5 text-dense-meta leading-relaxed text-[var(--sk-mute)]">
            {note}
          </p>
        ) : null}
      </InspectorPanel>
    </div>
  )
}
