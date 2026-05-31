import { cn } from '@/lib/utils'
import styles from '@/pages/strategy/InstancesPage.module.css'

export type DetailViewMode = 'accordion' | 'multi'

interface Props {
  detailViewMode: DetailViewMode
  onDetailViewModeChange: (mode: DetailViewMode) => void
  onExpandAll: () => void
  onCollapseAll: () => void
  visible?: boolean
}

function BubbleButton({
  active,
  onClick,
  children,
  ariaChecked,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  ariaChecked?: boolean
}) {
  return (
    <button
      type="button"
      role={ariaChecked != null ? 'radio' : undefined}
      aria-checked={ariaChecked}
      onClick={onClick}
      className={cn(styles.bubbleBtn, active && styles.bubbleBtnActive)}
    >
      {children}
    </button>
  )
}

export function InstanceListToolbar({
  detailViewMode,
  onDetailViewModeChange,
  onExpandAll,
  onCollapseAll,
  visible = true,
}: Props) {
  if (!visible) return null

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarRow}>
        <span className={styles.toolbarLabel} id="instance-list-detail-view-label">
          Detail view
        </span>
        <div className={styles.bubbleRow} role="radiogroup" aria-labelledby="instance-list-detail-view-label">
          <BubbleButton
            active={detailViewMode === 'accordion'}
            ariaChecked={detailViewMode === 'accordion'}
            onClick={() => onDetailViewModeChange('accordion')}
          >
            Accordion
          </BubbleButton>
          <BubbleButton
            active={detailViewMode === 'multi'}
            ariaChecked={detailViewMode === 'multi'}
            onClick={() => onDetailViewModeChange('multi')}
          >
            Multi
          </BubbleButton>
        </div>
      </div>

      <div className={styles.toolbarRow}>
        <span className={styles.toolbarLabel} id="instance-list-symbol-groups-label">
          Symbol groups
        </span>
        <div className={styles.bubbleRow} role="group" aria-labelledby="instance-list-symbol-groups-label">
          <BubbleButton active={false} onClick={onExpandAll}>
            Expand all
          </BubbleButton>
          <BubbleButton active={false} onClick={onCollapseAll}>
            Collapse all
          </BubbleButton>
        </div>
      </div>

      <p className={styles.toolbarHint}>
        {detailViewMode === 'accordion'
          ? 'Accordion: only one symbol group expanded at a time. Expand all keeps the first group open.'
          : 'Multi: several symbol groups may stay expanded.'}
      </p>
    </div>
  )
}
