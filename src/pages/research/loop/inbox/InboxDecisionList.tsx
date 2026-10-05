/**
 * The Decisions stream, drawn (design Rev .143 / .144): sections by where
 * Approve writes, one card per question, the folded row's quick actions, the
 * fold of earlier runs, and the keyboard cursor.
 *
 * The page owns the state and the writes; this only draws what it is handed.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { DraftCard } from '@/components/cockpit/DraftCard'
import type { DraftWriteFailure } from '@/lib/harness/draftWriteFailures'
import type { DraftHeadline } from '@/lib/harness/draftHeadline'
import type { InboxCard, InboxSection } from '@/lib/harness/inboxCards'
import { RuleProposalCard, NO_RULES_STORE } from '@/pages/research/loop/proposals/RuleProposalCard'
import type { Proposal } from '@/pages/research/loop/proposals/proposalsModel'
import { InboxFold, InboxQuickActions, InboxSectionHead, InboxWriteFailures } from './InboxCardParts'
import { cardMeta, cardWrites, describeDraft, quickApproveHint } from './inboxCardText'

export type InboxItem = { type: 'draft'; key: string; card: InboxCard } | { type: 'rule'; key: string; proposal: Proposal }

export interface InboxListHandlers {
  toggle: (key: string) => void
  approve: (card: InboxCard) => void
  record: (card: InboxCard) => void
  dismiss: (card: InboxCard) => void
  discuss: (card: InboxCard) => void
  hideEarlier: (card: InboxCard) => void
  showEarlier: (card: InboxCard) => void
}

/** `J K move · Space open · A approve · D dismiss`, right-aligned above the list (Rev .144). */
export function InboxKeyHints() {
  const kbd = 'rounded-sm bg-foreground/5 px-1 py-px font-mono text-dense-micro leading-none text-muted-foreground'
  const hint = (keys: string[], what: string) => (
    <span className="inline-flex items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className={kbd}>
          {k}
        </kbd>
      ))}
      {what}
    </span>
  )
  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3 text-dense-micro text-muted-foreground"
      title="Keyboard triage. A only approves an open card; a folded call records its answer directly."
    >
      {hint(['J', 'K'], 'move')}
      {hint(['Space'], 'open')}
      {hint(['A'], 'approve')}
      {hint(['D'], 'dismiss')}
    </div>
  )
}

export function InboxDecisionList({
  sections,
  openKey,
  curKey,
  litKey,
  headlineOf,
  failures,
  handlers,
}: {
  sections: InboxSection<InboxItem>[]
  openKey: string
  curKey: string
  litKey: string | null
  headlineOf: (card: InboxCard) => DraftHeadline
  failures: Readonly<Record<string, DraftWriteFailure>>
  handlers: InboxListHandlers
}) {
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <section key={section.dest} className="space-y-2">
          <InboxSectionHead dest={section.dest} pending={section.items.length} />
          {section.items.map((item) => {
            const open = item.key === openKey
            const cursor = item.key === curKey && !open
            if (item.type === 'rule') {
              return (
                <RuleProposalCard
                  key={item.key}
                  cardKey={item.key}
                  proposal={item.proposal}
                  expanded={open}
                  cursor={cursor}
                  onToggle={() => handlers.toggle(item.key)}
                  // No rules store: Dismiss is drawn and says why rather than
                  // answering nothing (Rev .144 on a card the store cannot hold).
                  quick={<InboxQuickActions approveHint="Approve → edit Rules" onDismiss={() => {}} dismissOff={`Dismiss — ${NO_RULES_STORE}`} />}
                />
              )
            }
            const { card } = item
            const head = headlineOf(card)
            const isCall = card.shape === 'call'
            const draftsOnCard: AiDraft[] = [...card.answers, ...card.folded]
            return (
              <div key={item.key} className="space-y-1">
                <DraftCard
                  cardKey={item.key}
                  draft={card.head}
                  headline={head}
                  meta={cardMeta(card, head)}
                  vehicle={isCall ? (card.verdict ? card.vehicle : null) : undefined}
                  expanded={open}
                  cursor={cursor}
                  lit={item.key === litKey}
                  defaultVerb={item.key === litKey ? 'explain' : null}
                  onToggle={() => handlers.toggle(item.key)}
                  muted={!cardWrites(card)}
                  dismissing={false}
                  onApprove={() => (isCall ? handlers.record(card) : handlers.approve(card))}
                  onDismiss={() => handlers.dismiss(card)}
                  onDiscuss={() => handlers.discuss(card)}
                  quick={
                    <InboxQuickActions
                      approveHint={isCall ? null : quickApproveHint(card)}
                      onRecord={isCall ? () => handlers.record(card) : undefined}
                      onDismiss={() => handlers.dismiss(card)}
                    />
                  }
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
                <InboxWriteFailures drafts={draftsOnCard} failures={failures} describe={describeDraft} />
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
