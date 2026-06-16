import { cn } from '@/lib/utils'

export const ledgerPagination = {
  bar: 'flex items-center gap-1.5 px-1 pt-2 pb-0.5 text-dense-body',
  btn: cn(
    'inline-flex h-[1.85rem] w-[1.85rem] items-center justify-center rounded',
    'border border-border bg-transparent text-muted-foreground',
    'text-dense-body font-semibold leading-none',
    'hover:bg-muted/40 hover:text-foreground',
    'disabled:cursor-not-allowed disabled:opacity-30',
  ),
  info: 'min-w-14 px-1 text-center text-muted-foreground text-dense-body',
  total: 'text-dense-label opacity-70',
} as const
