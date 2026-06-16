import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { readinessStepUi } from './stockDataReadinessStepUi'

export function ReadinessCode({ children }: { children: ReactNode }) {
  return <code className="text-dense-meta font-mono text-sky-300/90">{children}</code>
}

export function ReadinessOperationLog({
  ok,
  children,
}: {
  ok: boolean | null
  children: ReactNode
}) {
  if (children == null || children === '') return null
  if (ok === true) {
    return <p className={readinessStepUi.operationLogOk}>{children}</p>
  }
  if (ok === false) {
    return <p className={readinessStepUi.operationLogErr}>{children}</p>
  }
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>
}

export function ReadinessPrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button type="button" className={readinessStepUi.primaryBtn} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  )
}

export function ReadinessStepLabel({ children }: { children: ReactNode }) {
  return <div className={readinessStepUi.stepLabel}>{children}</div>
}

export function ReadinessStepDesc({ children }: { children: ReactNode }) {
  return <p className={readinessStepUi.stepDesc}>{children}</p>
}

export function ReadinessMaintenanceBox({
  title,
  rows,
}: {
  title: string
  rows: { badge: string; variant: 'auto' | 'manual'; text: ReactNode }[]
}) {
  return (
    <div className={readinessStepUi.maintenanceBox}>
      <div className={readinessStepUi.maintenanceTitle}>{title}</div>
      {rows.map((row, i) => (
        <div key={i} className={readinessStepUi.maintenanceRow}>
          <span
            className={
              row.variant === 'auto'
                ? readinessStepUi.maintenanceBadgeAuto
                : readinessStepUi.maintenanceBadgeManual
            }
          >
            {row.badge}
          </span>
          <span className="min-w-0 [&_code]:rounded-sm [&_code]:bg-white/5 [&_code]:px-1 [&_code]:font-mono [&_code]:text-dense-meta [&_code]:text-foreground/90">
            {row.text}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ReadinessSecondaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={readinessStepUi.secondaryBtn}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function ReadinessGapsButton({
  children,
  disabled,
  onClick,
  tone,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
  tone: 'default' | 'warn' | 'ok'
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        readinessStepUi.gapsBtn,
        tone === 'warn' && readinessStepUi.gapsBtnWarn,
        tone === 'ok' && readinessStepUi.gapsBtnOk,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function ReadinessGhostLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className={readinessStepUi.ghostLink}>
      {children}
    </Link>
  )
}
