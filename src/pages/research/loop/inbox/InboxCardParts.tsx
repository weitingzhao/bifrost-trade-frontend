/**
 * The small pieces an Inbox card gains on this page (design Rev .143 / .144):
 * the folded row's quick actions, the fold of earlier runs under the head, the
 * writes that did not land, and the section head.
 */
import type { MouseEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { AiDraft } from '@/api/researchDrafts'
import type { DraftWriteFailure } from '@/lib/harness/draftWriteFailures'
import { WRITES_TO_LABEL, WRITES_TO_NOTE, type WritesTo } from '@/lib/harness/writesTo'

/** A click inside the header row must not also fold or open the card. */
function own(fn: () => void) {
  return (e: MouseEvent) => {
    e.stopPropagation()
    fn()
  }
}

/**
 * The folded row's right side (Rev .144), pending cards only. Dismiss on every
 * kind; a call adds Record answer, which writes nothing (D10) and is held
 * behind the toast like Dismiss (Owner 2026-10-04 #9). Every other kind gets no
 * Approve here — accepting anything means having looked at it — only where it
 * would write, in grey mono, so the consequence reads without opening.
 */
export function InboxQuickActions({
  approveHint,
  onRecord,
  onDismiss,
  dismissOff,
}: {
  approveHint?: string | null
  onRecord?: () => void
  onDismiss: () => void
  /** Why Dismiss cannot be taken here — drawn disabled with this as its title. */
  dismissOff?: string | null
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {approveHint ? (
        <span
          className="whitespace-nowrap font-mono text-dense-micro text-muted-foreground"
          title="Open the card to approve — accepting anything means having looked at it."
        >
          {approveHint}
        </span>
      ) : null}
      {onRecord ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="h-5.5 text-dense-micro"
          onClick={own(onRecord)}
          title="Record answer — nothing is written, never an order (D10). Undo on the toast or ⌘Z for 5 seconds."
        >
          Record answer
        </Button>
      ) : null}
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="h-5.5 text-dense-micro"
        onClick={own(onDismiss)}
        disabled={Boolean(dismissOff)}
        title={dismissOff ?? 'Dismiss — undo on the toast or ⌘Z'}
      >
        Dismiss
      </Button>
    </span>
  )
}

function shortWhen(iso: string): string {
  const t = new Date(iso)
  return Number.isNaN(t.getTime())
    ? iso
    : t.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Earlier drafts under the head (Rev .143 #5). For a batch or a patch the
 * reader can hide them here — in this browser only, nothing is sent (Owner
 * 2026-10-04 #11) — and bring them back. A call's earlier drafts are answered
 * with it, so they carry no button of their own.
 */
export function InboxFold({
  folded,
  hiddenEarlier,
  describe,
  onHide,
  onShow,
}: {
  folded: readonly AiDraft[]
  hiddenEarlier: readonly AiDraft[]
  describe: (d: AiDraft) => string
  onHide?: () => void
  onShow?: () => void
}) {
  if (folded.length === 0 && hiddenEarlier.length === 0) return null
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-dashed border-border/70 pt-1.5 text-dense-micro text-muted-foreground">
      {folded.length > 0 ? (
        <>
          <span className="shrink-0">Folded under this {onHide ? 'run' : 'call'}</span>
          <span className="min-w-0 flex-1 truncate font-mono" title={folded.map((d) => `${shortWhen(d.created_at)} · ${describe(d)}`).join('\n')}>
            {folded
              .slice(0, 3)
              .map((d) => `${shortWhen(d.created_at)} · ${describe(d)}`)
              .join(' · ')}
            {folded.length > 3 ? ` · +${folded.length - 3} more` : ''}
          </span>
          {onHide ? (
            <button
              type="button"
              className="shrink-0 text-primary hover:underline"
              onClick={onHide}
              title="Folds the earlier runs away in this browser only. Nothing is sent: they stay pending on the server, and their names stay open in the candidate pool."
            >
              Dismiss earlier
            </button>
          ) : null}
        </>
      ) : null}
      {hiddenEarlier.length > 0 && onShow ? (
        <span className={folded.length > 0 ? 'basis-full' : ''}>
          {hiddenEarlier.length} earlier run{hiddenEarlier.length === 1 ? '' : 's'} hidden in this browser, still
          pending on the server ·{' '}
          <button type="button" className="text-primary hover:underline" onClick={onShow}>
            Show again
          </button>
        </span>
      ) : null}
    </div>
  )
}

/** The drafts on a card whose last write did not land, and why. */
export function InboxWriteFailures({
  drafts,
  failures,
  describe,
}: {
  drafts: readonly AiDraft[]
  failures: Readonly<Record<string, DraftWriteFailure>>
  describe: (d: AiDraft) => string
}) {
  const failed = drafts.filter((d) => failures[d.id])
  if (failed.length === 0) return null
  return (
    <div className="space-y-0.5 px-1 text-dense-micro text-warning">
      {failed.map((d) => (
        <p key={d.id} className="m-0">
          {failures[d.id].verb} did not save on the {describe(d)} ({d.id}): {failures[d.id].message} — still pending, so
          it stays on this card.
        </p>
      ))}
    </div>
  )
}

/** `Writes to · Rules · 3 pending · what Approve does there` (Rev .143 #6). */
export function InboxSectionHead({ dest, pending, children }: { dest: WritesTo; pending: number; children?: ReactNode }) {
  return (
    <div
      className="flex min-w-0 items-baseline gap-2 px-0.5 pt-1.5"
      title="Grouped by where Approve writes — the same axis as the Writes to filter and the tag colour."
    >
      <span className="text-dense-micro font-semibold text-muted-foreground">Writes to</span>
      <span className="text-dense-label font-semibold">{WRITES_TO_LABEL[dest]}</span>
      <span className="font-mono text-dense-micro text-muted-foreground">{pending} pending</span>
      <span className="min-w-0 truncate text-dense-micro text-muted-foreground">{WRITES_TO_NOTE[dest]}</span>
      {children}
    </div>
  )
}
