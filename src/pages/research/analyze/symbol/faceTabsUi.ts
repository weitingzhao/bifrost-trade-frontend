import { cn } from '@/lib/utils'

/**
 * The Symbol face tabs as a capsule segmented control (Rev .142): a track at
 * ink 7%, the picked segment at ink 15% with the glass lens and a 1px drop —
 * the same values as the DS PageHead tabs.
 */
export const FACE_TAB_TRACK =
  'inline-flex h-[30px] max-w-full shrink-0 items-center gap-0.5 self-start overflow-x-auto rounded-full bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] p-[3px] [scrollbar-width:none]'

export function faceTabClass(on: boolean): string {
  return cn(
    'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold active:[filter:var(--press)]',
    on
      ? 'bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)] text-[var(--foreground)] shadow-[var(--glass-lens),0_1px_2px_rgba(0,0,0,0.22)]'
      : 'bg-transparent text-[var(--sk-mute2)] hover:text-[var(--foreground)]',
  )
}
