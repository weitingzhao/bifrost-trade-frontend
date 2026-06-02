import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { INSTANCE_DETAIL_SIDEBAR_WIDTH_PX } from '@/constants/instanceDetailSidebar'
import styles from './DetailSidebar.module.css'

export interface DetailSidebarProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  width?: number | string
  destroyOnClose?: boolean
  mode?: 'modal' | 'docked'
}

export function DetailSidebar({
  open,
  onClose,
  title,
  children,
  width = INSTANCE_DETAIL_SIDEBAR_WIDTH_PX,
  destroyOnClose = false,
  mode = 'modal',
}: DetailSidebarProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const panelStyle = useMemo((): CSSProperties => ({
    ['--detail-sidebar-width' as string]: typeof width === 'number' ? `${width}px` : width,
  }), [width])

  useEffect(() => {
    if (!open) return

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const prevOverflow = document.body.style.overflow
    if (mode === 'modal') document.body.style.overflow = 'hidden'

    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        evt.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => panelRef.current?.focus(), 0)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (mode === 'modal') document.body.style.overflow = prevOverflow
      restoreFocusRef.current?.focus()
    }
  }, [open, onClose, mode])

  if (!open && destroyOnClose) return null

  const panel = (
    <aside
      ref={panelRef}
      className={cn(
        'detail-sidebar-panel',
        `detail-sidebar-panel-${mode}`,
        open && 'is-open',
        styles.panel,
        mode === 'docked' ? styles.panelDocked : styles.panelModal,
        mode === 'modal' && open && styles.panelModalOpen,
      )}
      role={mode === 'modal' ? 'dialog' : 'complementary'}
      aria-modal={mode === 'modal' ? true : undefined}
      aria-label={typeof title === 'string' ? title : 'Detail'}
      tabIndex={-1}
      style={panelStyle}
      onClick={(evt) => evt.stopPropagation()}
    >
      <header className={cn('detail-sidebar-header', styles.header)}>
        <h2 className={cn('detail-sidebar-title', styles.title)}>{title ?? 'Detail'}</h2>
        <button
          type="button"
          className={cn('detail-sidebar-close-btn', styles.closeBtn)}
          onClick={onClose}
          aria-label="Close detail panel"
          title="Close (Esc)"
        >
          ×
        </button>
      </header>
      <div className={cn('detail-sidebar-content', styles.content)}>
        <div className={styles.contentInner}>{children}</div>
      </div>
    </aside>
  )

  if (mode === 'docked') {
    if (!open) return null
    return <div className={cn('detail-sidebar-docked-root', styles.dockedRoot)}>{panel}</div>
  }

  return (
    <div
      className={cn('detail-sidebar-backdrop', open && 'is-open', styles.backdrop, open && styles.backdropOpen)}
      onClick={() => {
        if (open) onClose()
      }}
      aria-hidden={!open}
    >
      {panel}
    </div>
  )
}
