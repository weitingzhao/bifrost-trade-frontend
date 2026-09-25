/** The freshness slot's chip: mono, 10px, and a tone that is quiet unless something is wrong (§16.13). */
export const STAMP_CLASS =
  'inline-flex flex-none items-center whitespace-nowrap rounded-[5px] border px-2 py-0.5 font-mono text-dense-micro leading-normal tracking-[0.05em]'

export const STAMP_TONE = {
  quiet: 'border-border text-muted-foreground',
  warn: 'border-warning/45 bg-warning/10 text-warning',
  fault: 'border-lamp-red/45 text-lamp-red',
} as const
