/** The freshness slot's chip: mono, 10px, and a tone that is quiet unless something is wrong (§16.13). */
// Rev .67: the ASOF chip's material — no frame, radius 8, the tone is the fill.
export const STAMP_CLASS =
  'inline-flex flex-none items-center whitespace-nowrap rounded-[8px] border border-transparent px-2 py-0.5 font-mono text-dense-micro leading-normal tracking-[0.05em]'

export const STAMP_TONE = {
  quiet: 'bg-[var(--mat-btn-fill)] text-muted-foreground',
  warn: 'bg-warning/20 text-warning',
  fault: 'bg-lamp-red/20 text-lamp-red',
} as const
