/**
 * An Inbox card on a phone (design Rev .163, DESIGN_CONTRACTS §18.6 · §18.10
 * ④): the queue is one row per question, and a row opens its card here — the
 * evidence in the body, the verdicts in the footer, so Approve and Dismiss sit
 * under the thumb however long the card runs. Enter runs the rightmost, the
 * verdict (`BottomSheet`). The desk and the iPad keep the accordion.
 *
 * The footer's Approve names the section it writes to — the same word as the
 * tag colour, the section head and the Writes to filter — and the body keeps
 * the card's own sentence of what Approve does, ending «never an order» (D10).
 * Approving, dismissing and recording an answer are held behind the toast
 * exactly as on the desk: the handlers are the page's.
 */
import { BottomSheet, type BottomSheetAction } from '@/components/ui/BottomSheet'
import { DraftCard } from '@/components/cockpit/DraftCard'
import type { AiDraft } from '@/api/researchDrafts'
import { isDailyDigest } from '@/lib/harness/dailyDigest'
import { draftHeadline, type DraftHeadline } from '@/lib/harness/draftHeadline'
import type { DraftWriteFailure } from '@/lib/harness/draftWriteFailures'
import type { InboxCard } from '@/lib/harness/inboxCards'
import { WRITES_TO_LABEL } from '@/lib/harness/writesTo'
import { RULE_APPROVE_LABEL, RuleProposalCard } from '@/pages/research/loop/proposals/RuleProposalCard'
import { InboxFold, InboxWriteFailures } from './InboxCardParts'
import { cardMeta, cardWrites, describeDraft } from './inboxCardText'
import type { InboxItem, InboxListHandlers } from './InboxDecisionList'

/** The sheet's head: the symbol in its ink, then the card's title (the card itself drops both). */
function inboxSheetTitle(head: Pick<DraftHeadline, 'sym' | 'title'>) {
  return (
    <>
      {head.sym ? <span className="mr-1.5 font-mono text-entity-symbol">{head.sym}</span> : null}
      {head.title}
    </>
  )
}

function inboxSheetLabel(head: Pick<DraftHeadline, 'sym' | 'title'>): string {
  return head.sym ? `${head.sym} ${head.title}` : head.title
}

/** The verdict a decision card offers, worded for the footer: short, and where it writes. */
function decisionVerdict(card: InboxCard): { label: string; primary: boolean } {
  if (card.shape === 'call') return { label: 'Record answer', primary: false }
  const writes = cardWrites(card)
  return writes ? { label: `Approve → ${WRITES_TO_LABEL[card.dest]}`, primary: true } : { label: 'Approve', primary: false }
}

export function InboxDecisionSheet({
  open,
  onOpenChange,
  item,
  lit,
  headlineOf,
  failures,
  handlers,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Kept by the list after its card leaves the queue, so the sheet reads on while it slides away. */
  item: InboxItem | null
  /** The deep-linked card (`?card=`): it opens with Explain out, as on the desk. */
  lit: boolean
  headlineOf: (card: InboxCard) => DraftHeadline
  failures: Readonly<Record<string, DraftWriteFailure>>
  handlers: InboxListHandlers
}) {
  if (item?.type === 'rule') {
    const p = item.proposal
    // Neither verdict can be recorded (no rules store): drawn, disabled, and the
    // body's last line says why — as the card does on the desk.
    const actions: BottomSheetAction[] = [
      { label: 'Dismiss', disabled: true },
      { label: RULE_APPROVE_LABEL, primary: true, disabled: true },
    ]
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title={p.title} label={p.title} actions={actions}>
        <RuleProposalCard face="sheet" cardKey={item.key} proposal={p} expanded onToggle={() => {}} />
      </BottomSheet>
    )
  }
  const card = item?.card ?? null
  const head = card ? headlineOf(card) : null
  const isCall = card?.shape === 'call'
  const verdict = card ? decisionVerdict(card) : null
  const actions: BottomSheetAction[] =
    card && verdict
      ? [
          { label: 'Dismiss', onRun: () => handlers.dismiss(card) },
          { label: verdict.label, primary: verdict.primary, onRun: () => (isCall ? handlers.record(card) : handlers.approve(card)) },
        ]
      : []
  return (
    <BottomSheet
      open={open && card != null}
      onOpenChange={onOpenChange}
      title={head ? inboxSheetTitle(head) : null}
      label={head ? inboxSheetLabel(head) : 'Decision'}
      actions={actions}
    >
      {card && head ? (
        <div className="space-y-1">
          <DraftCard
            face="sheet"
            draft={card.head}
            headline={head}
            meta={cardMeta(card, head)}
            vehicle={isCall ? (card.verdict ? card.vehicle : null) : undefined}
            muted={!cardWrites(card)}
            defaultVerb={lit ? 'explain' : null}
            onApprove={() => (isCall ? handlers.record(card) : handlers.approve(card))}
            onDismiss={() => handlers.dismiss(card)}
            // The Copilot is a sheet of its own on a phone: this one steps aside.
            onDiscuss={() => {
              onOpenChange(false)
              handlers.discuss(card)
            }}
            footer={
              <InboxFold
                folded={card.folded}
                hiddenEarlier={card.hiddenEarlier}
                describe={describeDraft}
                onHide={card.shape === 'objective' ? () => handlers.hideEarlier(card) : undefined}
                onShow={card.shape === 'objective' ? () => handlers.showEarlier(card) : undefined}
              />
            }
          />
          <InboxWriteFailures drafts={[...card.answers, ...card.folded]} failures={failures} describe={describeDraft} />
        </div>
      ) : null}
    </BottomSheet>
  )
}

/**
 * A briefing on a phone: read in the sheet, Mark read on its sub-head as on
 * the card, Dismiss and — for the kinds whose Approve can write — Approve in
 * the footer. A digest is read, never approved (Design 2026-09-13 ③).
 */
export function InboxBriefingSheet({
  open,
  onOpenChange,
  draft,
  lit,
  read,
  onToggleRead,
  onApprove,
  onDismiss,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: AiDraft | null
  lit: boolean
  read: boolean
  onToggleRead: () => void
  onApprove: () => void
  onDismiss: () => void
}) {
  const head = draft ? draftHeadline(draft) : null
  const actions: BottomSheetAction[] = draft
    ? [
        { label: 'Dismiss', onRun: onDismiss },
        ...(isDailyDigest(draft) ? [] : [{ label: 'Approve', primary: true, onRun: onApprove }]),
      ]
    : []
  return (
    <BottomSheet
      open={open && draft != null}
      onOpenChange={onOpenChange}
      title={head ? inboxSheetTitle(head) : null}
      label={head ? inboxSheetLabel(head) : 'Briefing'}
      actions={actions}
    >
      {draft && head ? (
        <DraftCard
          face="sheet"
          draft={draft}
          headline={head}
          defaultVerb={lit ? 'explain' : null}
          read={read}
          onToggleRead={onToggleRead}
          onApprove={onApprove}
          onDismiss={onDismiss}
        />
      ) : null}
    </BottomSheet>
  )
}
