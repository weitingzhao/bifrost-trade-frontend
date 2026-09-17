import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { createExecution } from '@/api/trading'
import { Input } from '@/components/ui/input'
import { LedgerWriteCommitButton } from './LedgerWriteCommitButton'
import {
  JOURNAL_ASSIGNMENT_DISABLED_TITLE,
  JOURNAL_DATE_NOTE,
  JOURNAL_NOTE_DISABLED_TITLE,
  LEDGER_CONFIRM_JOURNAL_EXPIRED,
  LEDGER_CONFIRM_JOURNAL_GAP,
  LEDGER_WRITE_FOOTER_JOURNAL,
} from './ledgerWriteConfirm'
import {
  journalCreateBody,
  journalDraftFromSeed,
  type LedgerJournalDraft,
  type LedgerJournalMode,
  type LedgerJournalSeed,
} from './ledgerJournalWrite'

const MODES: { id: LedgerJournalMode; label: string }[] = [
  { id: 'gap', label: 'Close a gap' },
  { id: 'expired', label: 'Expired worthless' },
  { id: 'assigned', label: 'Assignment' },
]

const LEAD: Record<LedgerJournalMode, string> = {
  gap: 'Write the fill neither source reported. Use this when a trade is real but absent from both Flex and TWS.',
  expired:
    'Close an option that expired with no value: this writes an offsetting row so the contract leaves the open book.',
  assigned:
    'Record an assignment or exercise: a BookTrade, not an exchange trade. The shares it produced can then be linked to the option.',
}

const WARN: Record<LedgerJournalMode, { title: string; body: string }> = {
  gap: {
    title: 'This becomes a journal row, not a fill',
    body: 'It will carry the JOURNAL badge in every view, and Performance will read it as book data.',
  },
  expired: {
    title: 'Accounting entry, not an order',
    body: 'Nothing is sent to the broker. The position is already gone at the exchange; this makes the ledger agree with that fact.',
  },
  assigned: {
    title: 'Tagged BOOK · assigned',
    body: 'Assignments are marked apart from active trades everywhere in this page, because reading one as a decision you made would be wrong.',
  },
}

const COMMIT: Record<LedgerJournalMode, string> = {
  gap: 'Write journal row',
  expired: 'Write expiry close',
  assigned: 'Write assignment',
}

function Field({
  label,
  note,
  children,
}: {
  label: string
  note?: string
  children: ReactNode
}) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-0.5">
      <span className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {note ? <span className="text-dense-caption text-muted-foreground">{note}</span> : null}
    </label>
  )
}

export function LedgerJournalFace({
  seed,
  accounts,
  onWrote,
}: {
  seed?: LedgerJournalSeed
  accounts: string[]
  onWrote: () => void | Promise<void>
}) {
  const [draft, setDraft] = useState<LedgerJournalDraft>(() => journalDraftFromSeed(seed))

  const mode = draft.mode
  const assignedLocked = mode === 'assigned'
  const priceLocked = mode === 'expired'

  function setMode(next: LedgerJournalMode) {
    if (next === 'assigned') return
    setDraft(journalDraftFromSeed({ ...seed, mode: next }))
  }

  function patch(p: Partial<LedgerJournalDraft>) {
    setDraft(prev => ({ ...prev, ...p }))
  }

  async function commit() {
    const built = journalCreateBody(draft, Math.floor(Date.now() / 1000))
    if (!built.ok) throw new Error(built.error)
    const res = await createExecution(built.body)
    if (!res.ok) throw new Error(res.error ?? 'Write failed')
    await onWrote()
  }

  const confirm = mode === 'expired' ? LEDGER_CONFIRM_JOURNAL_EXPIRED : LEDGER_CONFIRM_JOURNAL_GAP

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-dense-body font-bold">Journal entry</span>
        <span className="rounded-sm border border-[var(--color-warning)] px-1 py-px font-mono text-dense-caption text-[var(--color-warning)]">
          JOURNAL
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {MODES.map(m => {
          const on = mode === m.id
          const disabled = m.id === 'assigned' || (m.id === 'expired' && seed?.secType === 'STK')
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              title={
                disabled
                  ? m.id === 'assigned'
                    ? JOURNAL_ASSIGNMENT_DISABLED_TITLE
                    : 'Expired worthless is for option contracts'
                  : LEAD[m.id]
              }
              onClick={() => setMode(m.id)}
              className={cn(
                'rounded-md border px-2 py-0.5 text-dense-meta',
                on
                  ? 'border-[var(--color-success)] text-[var(--color-success)]'
                  : 'border-border text-muted-foreground',
                disabled && 'cursor-not-allowed opacity-45',
              )}
            >
              {m.label}
            </button>
          )
        })}
      </div>
      <p className="text-dense-meta text-muted-foreground leading-relaxed">{LEAD[mode]}</p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
        <Field label="Account">
          <select
            className="h-7 rounded-md border border-border bg-background px-1.5 font-mono text-dense-meta"
            value={draft.accountId}
            disabled={seed?.lockAccount || assignedLocked}
            onChange={e => patch({ accountId: e.target.value })}
          >
            <option value="">Select…</option>
            {accounts.map(a => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Contract" note="symbol or full OCC">
          <Input
            className="h-7 font-mono text-dense-meta text-sky-400"
            value={draft.symbol}
            disabled={seed?.lockSymbol || assignedLocked}
            onChange={e => patch({ symbol: e.target.value })}
          />
        </Field>
        <Field label="Side · qty">
          <span className="flex gap-1">
            <select
              className="h-7 rounded-md border border-border bg-background px-1.5 text-dense-meta"
              value={draft.side}
              disabled={priceLocked || assignedLocked}
              onChange={e => patch({ side: e.target.value as 'BUY' | 'SELL' })}
            >
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
            <Input
              className="h-7 w-16 font-mono text-dense-meta"
              value={String(draft.quantity)}
              disabled={priceLocked || assignedLocked}
              onChange={e => patch({ quantity: Number(e.target.value) || 0 })}
            />
          </span>
        </Field>
        <Field label="Price" note={priceLocked ? 'expiry is always zero' : undefined}>
          <Input
            className="h-7 font-mono text-dense-meta"
            value={priceLocked ? '0.00' : String(draft.price)}
            disabled={priceLocked || assignedLocked}
            onChange={e => patch({ price: Number(e.target.value) })}
          />
        </Field>
        <Field label="Source" note="not editable">
          <Input className="h-7 font-mono text-dense-meta text-[var(--color-warning)]" value="journal_closed" readOnly />
        </Field>
        <Field label="Instance" note="optional, links on save">
          <Input
            className="h-7 font-mono text-dense-meta text-[var(--color-instance-multi)]"
            value={draft.instanceId != null ? String(draft.instanceId) : ''}
            disabled={assignedLocked}
            onChange={e => {
              const n = Number(e.target.value)
              patch({ instanceId: Number.isFinite(n) && n > 0 ? n : undefined })
            }}
          />
        </Field>
        <Field label="Note" note="why this row exists">
          <Input
            className="h-7 text-dense-meta"
            value=""
            disabled
            title={JOURNAL_NOTE_DISABLED_TITLE}
            placeholder="unavailable"
          />
        </Field>
      </div>

      <p className="text-dense-meta text-muted-foreground leading-relaxed">{JOURNAL_DATE_NOTE}</p>

      <div className="flex flex-col gap-1 rounded-md border border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 px-2.5 py-2">
        <span className="text-dense-body font-semibold text-[var(--color-warning)]">{WARN[mode].title}</span>
        <span className="text-dense-meta text-foreground leading-relaxed">{WARN[mode].body}</span>
      </div>

      {assignedLocked ? (
        <p className="text-dense-meta text-muted-foreground" title={JOURNAL_ASSIGNMENT_DISABLED_TITLE}>
          Assignment is visible but disabled until the write API accepts transaction_type.
        </p>
      ) : (
        <LedgerWriteCommitButton
          idleLabel={COMMIT[mode]}
          confirmTitle={confirm.title}
          confirmBody={confirm.body}
          onCommit={commit}
        />
      )}

      <p className="border-t border-border/60 pt-2 text-dense-caption text-muted-foreground leading-relaxed">
        {LEDGER_WRITE_FOOTER_JOURNAL}
      </p>
    </div>
  )
}
