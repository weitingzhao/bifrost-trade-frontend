/** Semantic accent for inspector section nav — shared across Stock / Instance / Option. */
export type InspectorNavTone =
  | 'sky'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'cyan'
  | 'orange'
  | 'rose'
  | 'indigo'

const ICON: Record<InspectorNavTone, string> = {
  sky: 'text-sky-400 dark:text-sky-300',
  emerald: 'text-emerald-500 dark:text-emerald-400',
  violet: 'text-violet-400 dark:text-violet-300',
  amber: 'text-amber-500 dark:text-amber-400',
  cyan: 'text-cyan-500 dark:text-cyan-400',
  orange: 'text-orange-500 dark:text-orange-400',
  rose: 'text-rose-400 dark:text-rose-300',
  indigo: 'text-indigo-400 dark:text-indigo-300',
}

/** Radix TabsTrigger uses data-state; shadcn line variant also sets data-active. */
const ACTIVE_BORDER: Record<InspectorNavTone, string> = {
  sky: 'data-[state=active]:!border-b-sky-400 dark:data-[state=active]:!border-b-sky-300',
  emerald:
    'data-[state=active]:!border-b-emerald-500 dark:data-[state=active]:!border-b-emerald-400',
  violet:
    'data-[state=active]:!border-b-violet-400 dark:data-[state=active]:!border-b-violet-300',
  amber:
    'data-[state=active]:!border-b-amber-500 dark:data-[state=active]:!border-b-amber-400',
  cyan: 'data-[state=active]:!border-b-cyan-500 dark:data-[state=active]:!border-b-cyan-400',
  orange:
    'data-[state=active]:!border-b-orange-500 dark:data-[state=active]:!border-b-orange-400',
  rose: 'data-[state=active]:!border-b-rose-400 dark:data-[state=active]:!border-b-rose-300',
  indigo:
    'data-[state=active]:!border-b-indigo-400 dark:data-[state=active]:!border-b-indigo-300',
}

const ACTIVE_ICON: Record<InspectorNavTone, string> = {
  sky: 'group-data-[state=active]/nav-tab:text-sky-300',
  emerald: 'group-data-[state=active]/nav-tab:text-emerald-300',
  violet: 'group-data-[state=active]/nav-tab:text-violet-300',
  amber: 'group-data-[state=active]/nav-tab:text-amber-300',
  cyan: 'group-data-[state=active]/nav-tab:text-cyan-300',
  orange: 'group-data-[state=active]/nav-tab:text-orange-300',
  rose: 'group-data-[state=active]/nav-tab:text-rose-300',
  indigo: 'group-data-[state=active]/nav-tab:text-indigo-300',
}

/** Colored icon for collapsible section headers (matches tab accent, no active state). */
export function inspectorSectionIconClass(tone: InspectorNavTone): string {
  return `${ICON[tone]} opacity-90`
}

export function inspectorNavIconClass(tone: InspectorNavTone): string {
  return `${ICON[tone]} opacity-85 group-hover/nav-tab:opacity-100 ${ACTIVE_ICON[tone]} group-data-[state=active]/nav-tab:opacity-100`
}

export function inspectorNavTriggerClass(tone: InspectorNavTone): string {
  return ACTIVE_BORDER[tone]
}
