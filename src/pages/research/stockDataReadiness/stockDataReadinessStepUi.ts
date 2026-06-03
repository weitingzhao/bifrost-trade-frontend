import { cn } from '@/lib/utils'
import type { CheckStatus } from '@/types/stockDataReadiness'

/** Stock Data Readiness runbook step panel — aligned with Legacy `sdp-*` (data-readiness.css). */
export const readinessStepUi = {
  stepLabel:
    'text-sm font-semibold tracking-tight text-foreground [&_code]:text-[11px] [&_code]:font-mono [&_code]:text-sky-300/90',
  stepDesc:
    'text-xs leading-relaxed text-muted-foreground [&_code]:text-[11px] [&_code]:font-mono [&_code]:text-sky-300/90',
  primaryBtn: cn(
    'h-8 rounded-[5px] border-0 px-4 text-xs font-bold shadow-none',
    'bg-sidebar-primary text-sidebar-primary-foreground',
    'hover:brightness-110 hover:bg-sidebar-primary',
    'disabled:opacity-55 disabled:hover:brightness-100',
  ),
  operationLogOk: 'mt-2 font-mono text-xs text-[var(--color-success)]',
  operationLogErr:
    'mt-2 rounded-md border border-destructive/40 bg-danger-soft/30 px-3 py-2 font-mono text-xs text-destructive',
  aside: 'mt-3 rounded-md border border-border bg-secondary/40 p-3',
  asideEmpty:
    'mt-3 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground',
  asideTitle:
    'mb-2 flex flex-wrap items-baseline gap-2 text-xs font-semibold tracking-wide text-foreground [&_code]:font-mono [&_code]:text-sky-300/90',
  asideMeta: 'font-mono text-[0.92em] font-normal text-muted-foreground',
  snapTableWrap: 'overflow-x-auto',
  snapTable: 'w-full border-collapse font-mono text-xs',
  snapTh:
    'border-b border-border px-2.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap',
  snapTd: 'border-b border-border px-2.5 py-1 align-top',
  snapTdLast: 'border-b-0',
  snapNum: 'text-right tabular-nums whitespace-nowrap',
  snapCode: 'whitespace-nowrap',
  snapCodePill:
    'inline-block rounded-[3px] bg-sky-500/10 px-1.5 py-px font-mono text-[11px] text-sky-400',
  snapDim: 'text-muted-foreground',
  snapLow: 'text-amber-400',
  maintenanceBox:
    'my-2 mb-3 flex flex-col gap-2 rounded-md border border-border border-l-[3px] border-l-sidebar-primary bg-black/10 px-4 py-3',
  maintenanceTitle:
    'mb-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-[var(--color-text-dim)]',
  maintenanceRow: 'flex items-start gap-2 text-xs leading-relaxed text-muted-foreground',
  maintenanceBadgeAuto: cn(
    'mt-0.5 shrink-0 rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider',
    'border-sidebar-primary/30 bg-[var(--color-accent-soft)] text-sidebar-primary',
  ),
  maintenanceBadgeManual: cn(
    'mt-0.5 shrink-0 rounded-[3px] border px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider',
    'border-sky-500/25 bg-sky-500/10 text-sky-400',
  ),
  secondaryBtn: cn(
    'h-8 rounded-[5px] border border-border-strong bg-transparent px-3 text-xs text-muted-foreground shadow-none',
    'hover:border-sidebar-primary hover:bg-[var(--color-accent-soft)] hover:text-sidebar-primary',
    'disabled:opacity-50',
  ),
  gapsBtn: cn(
    'h-8 rounded-[5px] border bg-transparent px-3 text-xs shadow-none',
    'hover:border-sidebar-primary hover:bg-[var(--color-accent-soft)] hover:text-sidebar-primary',
    'disabled:cursor-not-allowed disabled:opacity-40',
  ),
  gapsBtnWarn: 'border-lamp-yellow/40 text-lamp-yellow',
  gapsBtnOk: 'border-lamp-green/30 text-lamp-green cursor-default',
  ghostLink:
    'text-xs text-sky-400 underline-offset-4 hover:text-sky-300 hover:underline',
} as const

/** Step index circle in runbook tabs (Legacy `sdp-runbook-tab-index` + status modifiers). */
export function runbookTabIndexClass(
  status: CheckStatus,
  isActive: boolean,
  done: boolean,
): string {
  return cn(
    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-bold',
    isActive && 'border-sky-400/85 bg-sky-500/15 text-sky-400',
    !isActive && done && 'border-lamp-green/65 bg-success-soft/40 text-lamp-green',
    !isActive &&
      !done &&
      status === 'warn' &&
      'border-lamp-yellow/65 text-lamp-yellow bg-warning-soft/20',
    !isActive &&
      !done &&
      status === 'error' &&
      'border-lamp-red/70 text-lamp-red bg-danger-soft/20',
    !isActive &&
      !done &&
      (status === 'ok' || status === 'void') &&
      'border-lamp-green/50 text-lamp-green bg-success-soft/25',
    !isActive &&
      !done &&
      (status === 'loading' || status === 'unknown') &&
      'border-border bg-muted/40 text-muted-foreground',
  )
}
