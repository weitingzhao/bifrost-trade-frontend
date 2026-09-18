/**
 * The one slot beside the grid, with three faces: the contract you last
 * touched, this instance's risk at expiry, and the ledger.
 *
 * One thing at a time opens here — a click in the grid, on the short-leg map
 * or on a row's action lands on the face that answers it, and Esc closes the
 * slot. Nothing on this page reaches the broker: every write is a ledger write
 * (D10 is untouched), which the Ledger face says in its own words.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DenseTag } from '@/components/data-display'
import { OptionContractDetailFromOpenPosition } from '@/components/optionDiscovery/OptionContractDetailFromOpenPosition'
import { RiskProfileDetail } from './RiskProfileDetail'
import { Link } from 'react-router-dom'
import { positionsUi } from './positionsUi'
import type { Execution, OpenOptionPosition } from '@/types/positions'
import type { QuoteItem } from '@/types/market'
import type { RiskProfile } from '@/utils/riskProfile'

export type PositionsFace = 'contract' | 'risk' | 'ledger'

/** The five ledger writes, in the order the prototype lists them. */
export type LedgerMode = 'edit' | 'link' | 'pair' | 'close' | 'delete'

const LEDGER_MODES: { id: LedgerMode; label: string; title: string; lead: string }[] = [
  {
    id: 'edit',
    label: 'Edit fill',
    title: 'Correct a field on an existing fill',
    lead: 'Correcting a field on this fill. Flex and TWS normally backfill a missing fill on their own — edit by hand only when it has not arrived.',
  },
  {
    id: 'link',
    label: 'Link to strategy',
    title: 'Attach this fill to a strategy instance',
    lead: 'Attach this fill to a strategy instance. Attribution (Single / Mixed / Unassigned) is recomputed from the link, not typed.',
  },
  {
    id: 'pair',
    label: 'Link option ↔ stock',
    title: 'Pair an option fill with its stock fill',
    lead: 'Pair this option fill with the stock fill that hedges it. Slippage and role are derived from the pair.',
  },
  {
    id: 'close',
    label: 'Close-out entry',
    title: 'Write a reversing fill into the ledger — not an order',
    lead: 'Writes one reversing fill into the ledger so the position reads as closed. It is not sent to the broker and it does not create an order.',
  },
  {
    id: 'delete',
    label: 'Delete fill',
    title: 'Remove a fill from the ledger',
    lead: 'Removes this fill from the ledger. Every number on this page is derived from fills, so this changes the ratings above.',
  },
]

const FACES: { id: PositionsFace; label: string; title: string }[] = [
  { id: 'contract', label: 'Contract', title: 'The contract you last touched' },
  { id: 'risk', label: 'Risk profile', title: 'This instance, at expiry' },
  { id: 'ledger', label: 'Ledger', title: 'Fix the books — never an order' },
]

function Hint({ children }: { children: ReactNode }) {
  return <p className="m-0 px-3 py-3 text-dense-meta leading-normal text-muted-foreground text-pretty">{children}</p>
}

export interface FaceContract {
  position: OpenOptionPosition
  quote?: QuoteItem
  underlyingHint?: number | null
  onOpenDiscovery?: () => void
  /** The Ledger face, on this contract's own fill. */
  onEditFill?: () => void
}

export interface FaceRisk {
  title: string
  profile: RiskProfile | null
  /** The instance's own sheet, which carries far more than the payoff. */
  onOpenInstance?: () => void
}

export interface FaceLedger {
  /** "exec #5828 · DAVE 280C · strategy #118" — what the writes are about. */
  subject: string | null
  exec: Execution | null
  onMode: (mode: LedgerMode) => void
}

export function PositionsFaceSlot({
  face,
  onFace,
  onClose,
  contract,
  risk,
  ledger,
}: {
  face: PositionsFace
  onFace: (f: PositionsFace) => void
  onClose: () => void
  contract?: FaceContract | null
  risk?: FaceRisk | null
  ledger?: FaceLedger | null
}) {
  return (
    <section
      className={cn(positionsUi.panel, 'sticky top-0 border-[var(--sk-line2)]')}
      aria-label="Position detail"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <header className={positionsUi.panelHead}>
        {FACES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFace(f.id)}
            aria-pressed={face === f.id}
            title={f.title}
            className={cn(
              'h-6 cursor-pointer whitespace-nowrap rounded-[5px] border bg-transparent px-2.25',
              'text-dense-meta leading-normal font-semibold',
              face === f.id ? 'border-primary text-primary' : 'border-border text-secondary-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className={cn(positionsUi.btn, 'ml-auto')} onClick={onClose} title="Close · esc" aria-label="Close">
          ✕
        </button>
      </header>

      {face === 'contract' ? (
        contract ? (
          <div className="flex min-w-0 flex-col">
            <OptionContractDetailFromOpenPosition
              position={contract.position}
              optionQuote={contract.quote}
              underlyingHint={contract.underlyingHint}
              onClose={onClose}
              onOpenOptionDiscovery={contract.onOpenDiscovery}
            />
            {contract.onEditFill ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
                <button type="button" className={positionsUi.btn} onClick={contract.onEditFill}>
                  Ledger · edit this fill
                </button>
                <span className="text-dense-meta leading-normal text-muted-foreground text-pretty">
                  Vendor Greeks are authoritative — this page never derives a second set.
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <Hint>Pick a contract — a row in the Contracts view, a leg under a strategy, or a dot on the short-leg map.</Hint>
        )
      ) : null}

      {face === 'risk' ? (
        risk && risk.profile ? (
          <div className="flex min-w-0 flex-col gap-2 px-3 pt-2 pb-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-dense-body font-bold leading-normal text-foreground">{risk.title}</span>
              <DenseTag variant="info" size="cell">
                this instance · at expiry
              </DenseTag>
              <span className="ml-auto flex flex-wrap items-baseline gap-x-3">
                {risk.onOpenInstance ? (
                  <button type="button" className={positionsUi.link} onClick={risk.onOpenInstance}>
                    instance detail →
                  </button>
                ) : null}
                <Link to="/risk/stress" className={positionsUi.link}>
                  whole-book stress · Risk Stress →
                </Link>
              </span>
            </div>
            <RiskProfileDetail profile={risk.profile} hideHeading variant="instanceDetail" />
          </div>
        ) : (
          <Hint>Pick a strategy row — its payoff at expiry, the scenarios behind it and its breakeven open here.</Hint>
        )
      ) : null}

      {face === 'ledger' ? (
        <div className="flex min-w-0 flex-col gap-2 px-3 pt-2 pb-3 leading-normal">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-dense-body font-bold text-foreground">Ledger</span>
            <span className={cn(positionsUi.mono, 'text-dense-meta text-muted-foreground')}>
              {ledger?.subject ?? 'no fill picked'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEDGER_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={!ledger?.exec}
                title={ledger?.exec ? m.title : 'Pick a fill in the grid first'}
                onClick={() => ledger?.onMode(m.id)}
                className={cn(
                  'h-6 whitespace-nowrap rounded-[5px] border border-border bg-transparent px-2.25 text-dense-meta font-semibold',
                  ledger?.exec
                    ? 'cursor-pointer text-secondary-foreground hover:border-primary hover:text-primary'
                    : 'cursor-default text-muted-foreground/60',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="m-0 text-dense-meta text-muted-foreground text-pretty">
            {ledger?.exec
              ? 'Every one of these writes the ledger and nothing else. Pick the write and its form opens with this fill in it.'
              : 'A fill’s own actions in the grid — edit, link, pair, close-out, delete — open here, on that fill.'}
          </p>
          {LEDGER_MODES.map((m) => (
            <p key={m.id} className="m-0 flex gap-2 text-dense-meta text-muted-foreground text-pretty">
              <span className="w-24 flex-none font-semibold text-secondary-foreground">{m.label}</span>
              <span className="min-w-0">{m.lead}</span>
            </p>
          ))}
          <p className="m-0 border-t border-border pt-1.75 text-dense-caption text-muted-foreground text-pretty">
            Ledger write · not an order. Nothing here is sent to the broker — the D10 execution freeze is untouched by this
            page.
          </p>
        </div>
      ) : null}
    </section>
  )
}
