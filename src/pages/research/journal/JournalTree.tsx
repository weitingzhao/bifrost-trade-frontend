/**
 * One root and everything under it.
 *
 * The prototype draws the rail as a border on a 14px box; this keeps that
 * shape, because the indent alone stops reading as lineage past two levels.
 * Every node is a button: selecting it is what the right panel reads, and the
 * selection goes into the URL so a `Journal →` from any page can land on its
 * own node.
 */
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import type { JournalNode } from './journalModel'
import { journalTypeLabel } from './journalModel'
import { OPERATOR_LABEL, OPERATOR_TAG, TYPE_TAG, journalClock, journalStateClass } from './journalUi'

export function JournalNodeRow({
  node,
  selected,
  context = false,
  onSelect,
}: {
  node: JournalNode
  selected: boolean
  /** An ancestor from an earlier day, here only so the lineage reads. */
  context?: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex items-stretch" style={{ paddingLeft: `${node.depth * 22}px` }}>
      {node.depth > 0 ? (
        <span
          aria-hidden
          className="-mt-px h-4 w-[14px] flex-none rounded-bl border-b border-l border-border"
        />
      ) : null}
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        aria-pressed={selected}
        className={cn(
          'my-px flex w-full min-w-0 flex-wrap items-center gap-2 rounded-md border px-2.5 py-1 text-left',
          selected
            ? 'border-primary bg-primary/[0.06]'
            : 'border-transparent hover:bg-secondary/60',
          !selected && context && 'opacity-60',
        )}
      >
        <DenseTag variant={TYPE_TAG[node.type]} size="cell">
          {journalTypeLabel(node.type)}
        </DenseTag>
        <span className="font-mono text-dense-meta font-bold tabular-nums">{node.id}</span>
        <DenseTag variant={OPERATOR_TAG[node.operator]} size="cell">
          {OPERATOR_LABEL[node.operator]}
        </DenseTag>
        {node.diff !== '—' ? (
          <span className="font-mono text-dense-micro text-entity-instance">{node.diff}</span>
        ) : null}
        <span className="min-w-0 flex-[1_1_8rem] truncate text-dense-meta text-muted-foreground">
          {node.summary}
        </span>
        <span className={cn('font-mono text-dense-micro', journalStateClass(node.state))}>
          {node.state}
        </span>
        <span className="font-mono text-dense-micro tabular-nums text-muted-foreground/70">
          {context ? node.day : journalClock(node.at)}
        </span>
      </button>
    </div>
  )
}
