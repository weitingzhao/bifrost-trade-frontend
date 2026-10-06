/**
 * The Decisions stream, drawn (design Rev .143 / .144): sections by where
 * Approve writes, one card per question, the folded row's quick actions, the
 * fold of earlier runs, and the keyboard cursor.
 *
 * The page owns the state and the writes; this only draws what it is handed.
 */
import type { AiDraft } from '@/api/researchDrafts'
import { DraftCard } from '@/components/cockpit/DraftCard'
import { DenseTag } from '@/components/data-display'
import { draftHeadline } from '@/lib/harness/draftHeadline'
import { kindTag } from '@/lib/harness/draftText'
import { expiredLine, type ExpiredInfo } from '@/lib/harness/expiredDrafts'
import type { WritesTo } from '@/lib/harness/writesTo'
import type { DraftWriteFailure } from '@/lib/harness/draftWriteFailures'
import type { DraftHeadline } from '@/lib/harness/draftHeadline'
import type { InboxCard, InboxSection } from '@/lib/harness/inboxCards'
import { RuleProposalCard, NO_RULES_STORE } from '@/pages/research/loop/proposals/RuleProposalCard'
import type { Proposal } from '@/pages/research/loop/proposals/proposalsModel'
import { InboxFold, InboxQuickActions, InboxSectionHead, InboxWriteFailures } from './InboxCardParts'
import { cardMeta, cardWrites, describeDraft, quickApproveHint } from './inboxCardText'

export type InboxItem = { type: 'draft'; key: string; card: InboxCard } | { type: 'rule'; key: string; proposal: Proposal }

/** An expired draft kept in place (design Rev .156): inert, not counted, not on the keys. */
export interface ExpiredItem {
  key: string
  draft: AiDraft
  info: ExpiredInfo
  /** The card holding the draft that replaced it, when that card is on the page. */
  newerKey: string | null
}

export interface InboxListHandlers {
  toggle: (key: string) => void
  approve: (card: InboxCard) => void
  record: (card: InboxCard) => void
  dismiss: (card: InboxCard) => void
  discuss: (card: InboxCard) => void
  hideEarlier: (card: InboxCard) => void
  showEarlier: (card: InboxCard) => void
  openNewer: (key: string) => void
  putAwayExpired: (item: ExpiredItem) => void
}

/**
 * The expired card (Rev .156): where it was, a neutral `expired` tag, no
 * Approve or Dismiss, one muted line, `Open newer →` when a newer draft
 * replaced it. It goes with Dismiss earlier — here, in this browser only.
 */
export function ExpiredDraftCard({
  item,
  onOpenNewer,
  onPutAway,
}: {
  item: ExpiredItem
  onOpenNewer: (key: string) => void
  onPutAway: () => void
}) {
  const head = draftHeadline(item.draft)
  return (
    <div
      data-card={item.key}
      data-expired=""
      className="space-y-1 rounded-md border border-l-4 border-border/35 border-l-border/60 bg-transparent px-2.5 py-2 text-dense-meta opacity-70"
    >
      <div className="flex min-w-0 flex-nowrap items-baseline gap-x-2">
        <DenseTag variant="category" size="cell">
          {kindTag(item.draft.kind, item.draft.scope)}
        </DenseTag>
        {head.sym ? (
          <span data-ctx-sym={head.sym} className="shrink-0 font-mono text-dense-label font-bold text-entity-symbol">
            {head.sym}
          </span>
        ) : null}
        <span className="min-w-0 truncate text-dense-label font-medium">{head.title}</span>
        <DenseTag variant="neutral" size="cell" className="shrink-0">
          expired
        </DenseTag>
        <span className="ml-auto shrink-0 text-dense-micro text-muted-foreground">
          {item.draft.generated_by} · {new Date(item.draft.created_at).toLocaleString()}
        </span>
      </div>
      <div className="flex items-baseline gap-3 text-dense-micro text-muted-foreground">
        <span>{expiredLine(item.info)}</span>
        <button
          type="button"
          onClick={onPutAway}
          className="hover:text-foreground hover:underline"
          title="Put away in this browser — nothing is sent; the draft is already expired on the server"
        >
          Dismiss earlier
        </button>
        {item.newerKey ? (
          <button type="button" onClick={() => onOpenNewer(item.newerKey as string)} className="ml-auto text-primary hover:underline">
            Open newer →
          </button>
        ) : null}
      </div>
    </div>
  )
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
  expired,
  openKey,
  curKey,
  litKey,
  headlineOf,
  failures,
  handlers,
}: {
  sections: InboxSection<InboxItem>[]
  /** Expired drafts by section, drawn after its pending cards (Rev .156). */
  expired?: ReadonlyMap<WritesTo, readonly ExpiredItem[]>
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
                  quick={<InboxQuickActions approveHint="Approve → Playbook" onDismiss={() => {}} dismissOff={`Dismiss — ${NO_RULES_STORE}`} />}
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
          {(expired?.get(section.dest) ?? []).map((x) => (
            <ExpiredDraftCard key={x.key} item={x} onOpenNewer={handlers.openNewer} onPutAway={() => handlers.putAwayExpired(x)} />
          ))}
        </section>
      ))}
    </div>
  )
}
