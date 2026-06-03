import { useRef, type ReactNode } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { CapabilityStatusDot } from '@/pages/settings/feed/massive/components/CapabilityStatusDot'
import {
  checklistEffectiveStatusLabel,
  shortServiceLabel,
} from '@/pages/settings/feed/massive/checklist/displayHelpers'
import type { ChecklistRow, EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import { feedMassiveStockSvcAnchorId } from '@/pages/settings/feed/massive/nav/anchors'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

function massiveHelpSections(row: ChecklistRow) {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <div>
        <p className="font-medium text-foreground">Purpose</p>
        <p>{row.purpose}</p>
      </div>
      <div>
        <p className="font-medium text-foreground">What we verify</p>
        <p>{row.helpVerification}</p>
      </div>
      <div>
        <p className="font-medium text-foreground">Notes</p>
        <p>{row.description}</p>
      </div>
      {row.testHint ? (
        <div>
          <p className="font-medium text-foreground">Test hint</p>
          <p>{row.testHint}</p>
        </div>
      ) : null}
      <div>
        <p className="font-medium text-foreground">Quick verification</p>
        <p>{row.verification}</p>
      </div>
    </div>
  )
}

export function MassiveServicePanel({
  row,
  effectiveStatus,
  expanded,
  onToggle,
  highlighted,
  evidence,
  children,
  anchorId,
}: {
  row: ChecklistRow
  effectiveStatus: EffectiveServiceStatus
  expanded: boolean
  onToggle: () => void
  highlighted?: boolean
  evidence?: ReactNode
  children?: ReactNode
  /** Scroll/hash anchor; defaults to stock svc id for backward compatibility. */
  anchorId?: string
}) {
  const resolvedAnchorId = anchorId ?? feedMassiveStockSvcAnchorId(row.id)
  const verificationRef = useRef<HTMLDetailsElement>(null)
  const statusLabel = checklistEffectiveStatusLabel(effectiveStatus)
  const implemented = effectiveStatus === 'implemented' || effectiveStatus === 'partial'

  const openVerification = () => {
    const el = verificationRef.current
    if (el) {
      el.open = true
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

  return (
    <Card
      id={resolvedAnchorId}
      variant="elevated"
      className={cn(
        'scroll-mt-24 transition-shadow',
        highlighted && 'ring-2 ring-primary/40',
      )}
    >
      <Collapsible open={expanded} onOpenChange={() => onToggle()}>
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-2 text-left"
              aria-expanded={expanded}
            >
              <CapabilityStatusDot status={effectiveStatus} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{shortServiceLabel(row)}</span>
                  <span className="text-xs text-muted-foreground">{statusLabel}</span>
                </div>
                {evidence ? (
                  <div className="mt-1 text-xs text-muted-foreground">{evidence}</div>
                ) : null}
              </div>
              <ChevronDown
                className={cn(
                  'size-4 shrink-0 text-muted-foreground transition-transform',
                  expanded && 'rotate-180',
                )}
                aria-hidden
              />
            </button>
          </CollapsibleTrigger>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={openVerification}>
            Help
          </Button>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {implemented ? children : null}
            <details ref={verificationRef} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">Verification docs</summary>
              <div className="mt-3">{massiveHelpSections(row)}</div>
            </details>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
