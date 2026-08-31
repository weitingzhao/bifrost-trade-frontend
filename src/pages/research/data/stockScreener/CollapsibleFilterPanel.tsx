import { useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface FilterSummaryTag {
  label: string
  count: number
  colorClass: string
}

interface Props {
  variant: 'tech' | 'fund'
  label: string
  tags: FilterSummaryTag[]
  totalActive: number
  children: ReactNode
}

export function CollapsibleFilterPanel({
  variant,
  label,
  tags,
  totalActive,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const isTech = variant === 'tech'

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'group flex w-full items-center gap-2 rounded-md border border-border/50',
            'px-3 py-1.5 text-left transition-all duration-200',
            isTech ? 'bg-violet-500/[0.04] hover:bg-violet-500/[0.08]' : 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]',
            open && 'rounded-b-none border-b-border/20',
          )}
        >
          {/* accent dot */}
          <div className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            isTech ? 'bg-violet-400/60' : 'bg-emerald-400/60',
          )} />

          <SlidersHorizontal className="h-3 w-3 shrink-0 text-muted-foreground/50" />

          <span className={cn(
            'text-dense-caption font-medium uppercase tracking-wider',
            isTech ? 'text-violet-300/80' : 'text-emerald-300/80',
          )}>
            {label}
          </span>

          {/* active badge */}
          {totalActive > 0 && (
            <span className={cn(
              'rounded px-1.5 py-px text-dense-micro font-semibold tabular-nums',
              isTech ? 'bg-violet-400/12 text-violet-300' : 'bg-emerald-400/12 text-emerald-300',
            )}>
              {totalActive}
            </span>
          )}

          {/* summary chips when collapsed */}
          {!open && tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="text-dense-micro text-muted-foreground/40">—</span>
              {tags.map(({ label: tl, count, colorClass }) => (
                <span
                  key={tl}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-px',
                    'text-dense-micro tabular-nums',
                    colorClass,
                  )}
                >
                  {tl} {count}
                </span>
              ))}
            </div>
          )}

          {!open && totalActive === 0 && (
            <span className="text-dense-micro text-muted-foreground/40 italic">
              refine conditions
            </span>
          )}

          {/* chevron, right-aligned */}
          <ChevronDown className={cn(
            'ml-auto h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform duration-200',
            open && 'rotate-180',
          )} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className={cn(
          'rounded-b-md border border-t-0 border-border/50',
          'px-3 py-2.5',
          isTech ? 'bg-violet-500/[0.03]' : 'bg-emerald-500/[0.03]',
        )}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
