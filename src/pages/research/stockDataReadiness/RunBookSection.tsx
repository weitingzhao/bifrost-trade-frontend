import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RunbookStageView, SepaRunStep } from '@/types/stockDataReadiness'
import { CheckStatusDot } from './CheckStatusDot'
import { stageHeadBorderClass } from './stageHeadBorder'

interface Props {
  stages: RunbookStageView[]
  activeRunStep: SepaRunStep
  onSelectStep: (step: SepaRunStep) => void
  summaryLoading: boolean
  onCheckCoverage: () => void
}

export function RunBookSection({
  stages,
  activeRunStep,
  onSelectStep,
  summaryLoading,
  onCheckCoverage,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Run book</h2>
        <Button
          variant="outline"
          size="sm"
          className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
          onClick={onCheckCoverage}
          disabled={summaryLoading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', summaryLoading && 'animate-spin')} />
          {summaryLoading ? 'Checking…' : 'Check Data Coverage'}
        </Button>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-2 rounded-xl border border-white/10 bg-black/10"
        role="region"
        aria-label="Stock Data Readiness run book"
      >
        {stages.map((stage, stageIdx) => (
          <div
            key={stage.id}
            className={cn(
              'flex flex-col min-w-0 rounded-lg border overflow-hidden transition-shadow',
              stage.containsActive
                ? 'border-sky-500/35 shadow-[0_0_0_1px_rgba(56,189,248,0.12)]'
                : 'border-white/10',
              stage.stageDone && !stage.containsActive && 'border-lamp-green/25',
            )}
          >
            <div
              className={cn(
                'px-3 py-2 border-b border-white/10 bg-black/20',
                stageHeadBorderClass(stage.stageStatus),
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Stage {stageIdx + 1}
                </span>
                <CheckStatusDot status={stage.stageStatus} />
              </div>
              <div className="text-sm font-semibold leading-tight">{stage.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{stage.blurb}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {stage.doneCount}/{stage.steps.length} complete
              </div>
            </div>
            <div className="flex flex-col gap-0.5 p-1.5" role="tablist" aria-label={`${stage.title} steps`}>
              {stage.steps.map(s => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={activeRunStep === s.id}
                  className={cn(
                    'flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    'hover:bg-accent/50',
                    activeRunStep === s.id && 'bg-primary/15 ring-1 ring-primary/40',
                    s.done && activeRunStep !== s.id && 'opacity-80',
                  )}
                  onClick={() => onSelectStep(s.id)}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                      activeRunStep === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {s.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium leading-tight">{s.title}</span>
                    <span className="block text-[10px] text-muted-foreground truncate">
                      {s.short} · {s.metric}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
