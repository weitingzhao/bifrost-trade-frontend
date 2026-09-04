import { ArrowDown, Layers, Lock, MessageCircleQuestion, Radar, Shield, Zap } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'
import { DenseTag } from '@/components/data-display'
import {
  AGENT_DESCRIPTIONS,
  AGENT_MCP_SCOPES,
  AGENT_ROLE_KIND,
  AGENT_TRIAGE_HINT,
  agentLabel,
  ORCHESTRATION_RUNTIME,
  PAGE_COPY,
  ROLE_ACCENT,
  ROLE_LABELS,
  type PersonaUiLang,
} from '@/lib/copilot/agentPersonaCatalog'
import { cn } from '@/lib/utils'

const AGENT_ORDER = [
  'discovery',
  'analyze',
  'portfolio',
  'validate',
  'verdict',
  'write',
  'curator',
  'loop_curator',
  'explain',
] as const

/** Small connector arrow with a labeled edge kind (handoff / as_tool). */
function EdgeArrow({
  label,
  variant = 'handoff',
}: {
  label: string
  variant?: 'handoff' | 'as_tool'
}) {
  return (
    <div className="flex flex-col items-center gap-0.5" aria-hidden="true">
      <span
        className={cn(
          'inline-flex items-center rounded px-1.5 py-0 text-dense-micro font-medium',
          variant === 'handoff'
            ? 'bg-primary/10 text-primary'
            : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-dashed border-indigo-400/40',
        )}
      >
        {label}
      </span>
      <ArrowDown className="size-3 text-muted-foreground" />
    </div>
  )
}

function StageTile({
  icon,
  title,
  subtitle,
  tone = 'default',
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  tone?: 'default' | 'router'
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-1.5 shadow-sm',
        tone === 'router'
          ? 'border-primary/40 bg-primary/5 text-foreground'
          : 'border-border/60 bg-background/70 text-foreground',
      )}
    >
      <span className="grid size-6 place-items-center rounded bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-dense-label font-semibold">{title}</span>
        {subtitle ? <span className="text-dense-micro text-muted-foreground">{subtitle}</span> : null}
      </div>
    </div>
  )
}

function LegendDot({
  variant,
  label,
}: {
  variant: 'handoff' | 'as_tool' | 'mcp'
  label: string
}) {
  const cls =
    variant === 'handoff'
      ? 'bg-primary'
      : variant === 'as_tool'
        ? 'bg-indigo-500'
        : 'bg-sky-500'
  const border = variant === 'as_tool' ? 'border border-dashed border-indigo-400/60' : ''
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('inline-block size-2 rounded-full', cls, border)} />
      <span className="text-dense-caption text-muted-foreground">{label}</span>
    </span>
  )
}

function AgentTile({
  agentName,
  selected,
  onSelect,
  lang,
  apiLabel,
}: {
  agentName: string
  selected: boolean
  onSelect: (name: string) => void
  lang: PersonaUiLang
  apiLabel?: string
}) {
  const role = AGENT_ROLE_KIND[agentName]
  const label = agentLabel(agentName, lang, apiLabel)
  const scopes = AGENT_MCP_SCOPES[agentName] ?? []
  const triageHint = AGENT_TRIAGE_HINT[lang][agentName]
  const description = AGENT_DESCRIPTIONS[lang][agentName]
  const isComposer = role === 'composer'
  const isValidate = agentName === 'validate'
  const isExplain = agentName === 'explain'
  const feedsVerdict =
    agentName === 'discovery' ||
    agentName === 'analyze' ||
    agentName === 'validate' ||
    agentName === 'portfolio'

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(agentName)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(agentName)}
      onKeyDown={handleKey}
      className={cn(
        'group flex cursor-pointer flex-col gap-1.5 rounded-md border bg-background/70 p-2 text-left transition-all',
        'hover:border-primary/40 hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        selected
          ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/40 shadow-sm'
          : 'border-border/60',
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="text-dense-label font-semibold">{label}</span>
          <span className="truncate text-dense-micro font-mono text-muted-foreground">
            {agentName}
          </span>
        </div>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0 text-dense-micro font-medium',
            role ? ROLE_ACCENT[role] : ROLE_ACCENT.specialist,
          )}
        >
          {role ? ROLE_LABELS[lang][role] : agentName}
        </span>
      </div>
      <p className="line-clamp-2 text-dense-caption text-muted-foreground">{description}</p>
      <p className="line-clamp-1 text-dense-micro text-muted-foreground/80">
        <span className="font-medium text-muted-foreground">Triage →</span> {triageHint}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {isExplain ? (
          <DenseTag variant="neutral" size="cell" title={PAGE_COPY[lang].noMcp}>
            {PAGE_COPY[lang].noMcp}
          </DenseTag>
        ) : scopes.length > 0 ? (
          scopes.slice(0, 2).map((s) => (
            <DenseTag
              key={s}
              variant="neutral"
              size="cell"
              title={s}
              className="font-mono"
            >
              {s}
            </DenseTag>
          ))
        ) : null}
        {scopes.length > 2 ? (
          <span className="text-dense-micro text-muted-foreground">
            +{scopes.length - 2}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1 pt-1 border-t border-border/40">
        {isComposer ? (
          <DenseTag
            variant="strategy"
            size="cell"
            title={lang === 'zh' ? '把 D+A+V 当子工具调用' : 'Calls D+A+V as sub-tools'}
          >
            ← D+A+V {PAGE_COPY[lang].asToolLabel}
          </DenseTag>
        ) : null}
        {feedsVerdict ? (
          <DenseTag
            variant="neutral"
            size="cell"
            title={lang === 'zh' ? 'Verdict 会把这个 Agent 当子工具' : 'Verdict uses this as sub-tool'}
          >
            → Verdict
          </DenseTag>
        ) : null}
        {isValidate ? (
          <DenseTag
            variant="warning"
            size="cell"
            title={
              lang === 'zh'
                ? '追加中立验证守则，主动寻找反证'
                : 'Neutral mandate: actively seek falsification'
            }
          >
            <Shield className="mr-0.5 inline size-2.5" />
            {lang === 'zh' ? '中立' : 'Neutral'}
          </DenseTag>
        ) : null}
      </div>
    </div>
  )
}

export function AgentOrchestrationDiagram({
  activeAgent,
  onSelect,
  lang,
  agentApiLabels,
}: {
  activeAgent: string | null
  onSelect: (agentName: string) => void
  lang: PersonaUiLang
  agentApiLabels?: Record<string, string | undefined>
}) {
  const copy = PAGE_COPY[lang]

  return (
    <section
      aria-label={copy.orchestrationTitle}
      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-secondary/40 p-3"
    >
      {/* Header — orchestration title + runtime facts */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h3 className="flex items-center gap-1.5 text-dense-body font-semibold">
            <Layers className="size-3.5 text-primary" />
            {copy.orchestrationTitle}
          </h3>
          <p className="text-dense-caption text-muted-foreground">{copy.orchestrationSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <DenseTag variant="neutral" size="cell" className="font-mono">
            {ORCHESTRATION_RUNTIME.sdk}
          </DenseTag>
          <DenseTag variant="neutral" size="cell" className="font-mono">
            {ORCHESTRATION_RUNTIME.transport}
          </DenseTag>
          <DenseTag variant="warning" size="cell" title={copy.d10LockHint}>
            <Lock className="mr-0.5 inline size-2.5" />
            {copy.d10Lock}
          </DenseTag>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-background/60 px-2 py-1">
        <span className="text-dense-caption text-muted-foreground">Legend</span>
        <LegendDot variant="handoff" label={copy.handoffLabel} />
        <LegendDot variant="as_tool" label={copy.asToolLabel} />
        <LegendDot variant="mcp" label={copy.mcpTools} />
      </div>

      {/* Stage 1: User → Copilot Panel */}
      <div className="flex flex-col items-center gap-0.5">
        <StageTile
          icon={<MessageCircleQuestion className="size-3.5" />}
          title={copy.userInput}
          subtitle={copy.userInputHint}
        />
        <EdgeArrow label={copy.handoffLabel} />
      </div>

      {/* Stage 2: Triage router */}
      <div className="flex flex-col items-center gap-0.5">
        <StageTile
          icon={<Radar className="size-3.5" />}
          title={copy.triageName}
          subtitle={copy.triageRoleHint}
          tone="router"
        />
        <div className="flex items-center gap-2">
          <EdgeArrow label={copy.handoffLabel} />
        </div>
        <span className="text-dense-caption text-muted-foreground">
          {lang === 'zh' ? '按意图分流到下方任一 Agent' : 'Routes to any specialist below'}
        </span>
      </div>

      {/* Stage 3: 8-agent grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {AGENT_ORDER.map((name) => (
          <AgentTile
            key={name}
            agentName={name}
            selected={activeAgent === name}
            onSelect={onSelect}
            lang={lang}
            apiLabel={agentApiLabels?.[name]}
          />
        ))}
      </div>

      {/* Verdict composer note — reinforces the agent-as-tool pattern */}
      <div className="flex items-start gap-2 rounded-md border border-dashed border-indigo-400/40 bg-indigo-500/5 p-2">
        <Zap className="mt-0.5 size-3.5 shrink-0 text-indigo-500" />
        <p className="text-dense-caption text-muted-foreground">
          <span className="font-semibold text-foreground">
            {agentLabel('verdict', lang)} ({copy.composerLegend}):
          </span>{' '}
          {lang === 'zh'
            ? '不是直接调 MCP，而是把 Discovery / Analyze / Validate / Portfolio 当作子工具 (agent-as-tool) 分别调用，再合成一份裁决。这就是盘前盘后综合简报的实现方式。'
            : 'Instead of calling MCP directly, Verdict invokes Discovery / Analyze / Validate / Portfolio as sub-tools (agent-as-tool) and synthesizes a single verdict. This is how morning / EOD briefs are composed.'}
        </p>
      </div>

      {/* Harness batch strip — separate from Chat Triage */}
      <div className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/5 p-2">
        <Layers className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 space-y-0.5">
          <p className="text-dense-label font-semibold text-foreground">
            {copy.harnessStripTitle}
          </p>
          <p className="text-dense-caption text-muted-foreground">{copy.harnessStripHint}</p>
          <p className="text-dense-micro text-muted-foreground">{copy.policyVsPersona}</p>
          <div className="flex flex-wrap gap-1 pt-0.5">
            {(['analyze', 'portfolio', 'validate', 'verdict', 'loop_curator'] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onSelect(n)}
                className="rounded border border-border/50 bg-background/70 px-1.5 py-0.5 text-dense-micro hover:border-primary/40"
              >
                {agentLabel(n, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-center text-dense-micro text-muted-foreground">{copy.diagramHint}</p>
    </section>
  )
}

export default AgentOrchestrationDiagram
