/**
 * The right column: one artifact, whole.
 *
 * Provenance is the point of this panel — the six fields the design asks for
 * are the six the store can answer, and `thread` is on the list precisely
 * because it cannot: no artifact in any of the five stores carries a
 * conversation id, so the row stays and says `not recorded` rather than
 * quietly leaving.
 *
 * Provenance is also where the chain is walked. The design's own Explain verb
 * says it in one line — *each input is a node in this Journal; click one to
 * walk the chain* — so a value that names another artifact selects it, and a
 * symbol opens the name. A value nothing in view answers stays plain rather
 * than becoming a link to nowhere.
 *
 * The verb row the prototype hangs under Provenance is not here. The Owner
 * ruled on 2026-09-21 that the six verbs — Explain · Challenge · Fork ·
 * Extend · Settle · Distill — are a piece of work of their own: what each one
 * writes and where it lands is a product decision, and building a guess here
 * would bake it into a third page. The panel says so where the row would be.
 */
import { Link } from 'react-router-dom'
import { DenseTag } from '@/components/data-display'
import { SECTION_CAP_CLASS } from '@/components/layout'
import { withSymbolParam } from '@/lib/symbolLink'
import { SYMBOL_PATH } from '@/lib/analyzeHubs'
import { cn } from '@/lib/utils'
import type { JournalNode } from './journalModel'
import { journalTypeLabel } from './journalModel'
import { OPERATOR_LABEL, OPERATOR_TAG, TYPE_TAG, journalStateClass } from './journalUi'

/**
 * One provenance value: a way into the chain where the value is one, plain
 * text where it is not.
 */
function ProvenanceValue({
  field,
  value,
  known,
  onSelect,
}: {
  field: string
  value: string
  known: ReadonlySet<string>
  onSelect: (id: string) => void
}) {
  if (field === 'symbol' && /^[A-Z.]{1,8}$/.test(value)) {
    return (
      <Link
        to={withSymbolParam(SYMBOL_PATH, value)}
        className="font-mono text-dense-micro text-entity-symbol hover:underline"
        title={`Open ${value} on Symbol`}
      >
        {value}
      </Link>
    )
  }
  if (known.has(value)) {
    return (
      <button
        type="button"
        onClick={() => onSelect(value)}
        className="break-all text-left font-mono text-dense-micro text-primary hover:underline"
        title="Walk to this artifact"
      >
        {value}
      </button>
    )
  }
  return <span className="break-words font-mono text-dense-micro">{value}</span>
}

export function SelectedArtifact({
  node,
  known,
  onSelect,
}: {
  node: JournalNode | null
  /** Every artifact id the day's view can answer for. */
  known: ReadonlySet<string>
  onSelect: (id: string) => void
}) {
  if (node == null) {
    return (
      <div className="px-3 py-4 text-dense-meta text-muted-foreground">
        Nothing selected. Pick a node on the left — the whole artifact, with where it came
        from, reads here.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <DenseTag variant={TYPE_TAG[node.type]} size="cell">
          {journalTypeLabel(node.type)}
        </DenseTag>
        <DenseTag variant={OPERATOR_TAG[node.operator]} size="cell">
          {OPERATOR_LABEL[node.operator]}
        </DenseTag>
        <span className="font-mono text-dense-micro text-muted-foreground">
          {node.operatorRaw}
        </span>
      </div>
      <div className="text-dense-body font-semibold leading-snug">{node.title}</div>
      {node.summary !== '—' ? (
        <p className="text-dense-meta leading-relaxed text-muted-foreground">{node.summary}</p>
      ) : null}

      <div>
        <div className={cn(SECTION_CAP_CLASS, 'mb-1.5')}>Provenance</div>
        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1">
          {node.provenance.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-mono text-dense-micro text-muted-foreground">{k}</dt>
              <dd className="min-w-0">
                <ProvenanceValue field={k} value={v} known={known} onSelect={onSelect} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <div className={cn(SECTION_CAP_CLASS, 'mb-1.5')}>Verbs</div>
        <p className="text-dense-micro leading-relaxed text-muted-foreground">
          Explain · Challenge · Fork · Extend · Settle · Distill — the design hangs the same six
          here, on the Candidate Pool and on the Hypothesis Board. What each one writes and where
          it lands is still open, so the row is a piece of work of its own rather than a guess
          baked into three pages.
        </p>
      </div>

      <div className="flex items-baseline gap-3 border-t border-border pt-2">
        <span className={cn('font-mono text-dense-micro', journalStateClass(node.state))}>
          {node.state}
        </span>
        {node.to != null ? (
          <Link to={node.to} className="ml-auto text-dense-meta text-primary hover:underline">
            {node.toLabel}
          </Link>
        ) : (
          <span className="ml-auto text-dense-micro text-muted-foreground/70">
            no page shows this one
          </span>
        )}
      </div>
    </div>
  )
}
