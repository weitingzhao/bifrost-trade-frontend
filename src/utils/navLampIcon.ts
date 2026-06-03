import { cn } from '@/lib/utils'

/** Lucide nav icon tint for aggregate service lamps (sidebar System menu). */
export const NAV_LAMP_ICON_CLASS: Record<string, string> = {
  green:
    'text-lamp-green [filter:drop-shadow(0_0_3px_var(--color-lamp-green))]',
  yellow:
    'text-lamp-yellow [filter:drop-shadow(0_0_3px_var(--color-lamp-yellow))]',
  red: 'text-lamp-red [filter:drop-shadow(0_0_3px_var(--color-lamp-red))]',
  gray: 'text-lamp-gray',
  none: 'text-sidebar-foreground/45',
}

export function navLampIconClass(lamp: string, className?: string): string {
  const key = lamp === 'none' ? 'none' : lamp in NAV_LAMP_ICON_CLASS ? lamp : 'gray'
  return cn('h-3.5 w-3.5 shrink-0', NAV_LAMP_ICON_CLASS[key], className)
}
