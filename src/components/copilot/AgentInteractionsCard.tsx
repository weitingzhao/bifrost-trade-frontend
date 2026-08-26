import { ArrowLeftFromLine, ArrowRightFromLine, Lock, Shield, Wrench } from 'lucide-react'
import { DenseTag } from '@/components/data-display'
import {
  AGENT_CALLS,
  AGENT_GUARDRAILS,
  AGENT_INVOKED_BY,
  AGENT_MCP_SCOPES,
  AGENT_ROLE_KIND,
  agentLabel,
  ORCHESTRATION_RUNTIME,
  PAGE_COPY,
  ROLE_ACCENT,
  ROLE_LABELS,
  type PersonaUiLang,
} from '@/lib/copilot/agentPersonaCatalog'
import { cn } from '@/lib/utils'

function SectionRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-1">{children}</div>
      </div>
    </div>
  )
}

/**
 * Shows the runtime interaction shape of a single agent:
 *   - Who calls it (Triage handoff, Verdict as sub-tool)
 *   - Which MCP scopes it prefers
 *   - What it exposes to composers (only D/A/V → Verdict)
 *   - Guardrails and D10 lock
 */
export function AgentInteractionsCard({
  agentName,
  lang,
  apiLabel,
}: {
  agentName: string
  lang: PersonaUiLang
  apiLabel?: string
}) {
  const copy = PAGE_COPY[lang]
  const invokedBy = AGENT_INVOKED_BY[agentName] ?? []
  const calls = AGENT_CALLS[agentName] ?? []
  const scopes = AGENT_MCP_SCOPES[agentName] ?? []
  const guard = AGENT_GUARDRAILS[agentName]
  const role = AGENT_ROLE_KIND[agentName]

  return (
    <div className="rounded-md border border-border/60 bg-background/60 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <p className="text-dense-label font-semibold">{copy.interactions}</p>
          <DenseTag variant="neutral" size="cell" className={cn(ROLE_ACCENT[role])}>
            {ROLE_LABELS[lang][role]}
          </DenseTag>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <DenseTag variant="neutral" size="cell" className="font-mono">
            {ORCHESTRATION_RUNTIME.sdk}
          </DenseTag>
        </div>
      </div>

      {/* Called by */}
      <SectionRow icon={<ArrowLeftFromLine className="size-3" />} title={copy.calledBy}>
        {invokedBy.length === 0 ? (
          <span className="text-dense-caption text-muted-foreground">—</span>
        ) : (
          invokedBy.map(({ by, kind }) => (
            <DenseTag
              key={`${by}:${kind}`}
              variant={kind === 'handoff' ? 'success' : 'strategy'}
              size="cell"
              className={
                kind === 'as_tool'
                  ? 'border border-dashed border-indigo-400/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : ''
              }
              title={
                kind === 'handoff'
                  ? lang === 'zh'
                    ? 'Triage 完全转交控制权'
                    : 'Full handoff of control'
                  : lang === 'zh'
                    ? '作为子工具被调用 (agent-as-tool)'
                    : 'Invoked as a sub-tool (agent-as-tool)'
              }
            >
              {by === 'triage'
                ? copy.triageName
                : agentLabel(by, lang)}{' '}
              <span className="opacity-70">
                · {kind === 'handoff' ? copy.handoffLabel : copy.asToolLabel}
              </span>
            </DenseTag>
          ))
        )}
      </SectionRow>

      {/* Provides tools to (only Verdict for D/A/V) */}
      {(agentName === 'discovery' ||
        agentName === 'analyze' ||
        agentName === 'validate') ? (
        <SectionRow icon={<ArrowRightFromLine className="size-3" />} title={copy.provides}>
          <DenseTag variant="strategy" size="cell">
            {agentLabel('verdict', lang)} · {copy.asToolLabel}
          </DenseTag>
        </SectionRow>
      ) : null}

      {/* Verdict calls (as tool) */}
      {calls.length > 0 ? (
        <SectionRow icon={<ArrowRightFromLine className="size-3" />} title={copy.provides}>
          <span className="text-dense-caption text-muted-foreground">
            {lang === 'zh' ? '把这些 Agent 当作子工具调用：' : 'Uses these agents as sub-tools:'}
          </span>
          {calls.map(({ to, kind }) => (
            <DenseTag
              key={`${to}:${kind}`}
              variant="strategy"
              size="cell"
              className="border border-dashed border-indigo-400/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
            >
              {agentLabel(to, lang)} · {copy.asToolLabel}
            </DenseTag>
          ))}
        </SectionRow>
      ) : null}

      {/* MCP tool scopes */}
      <SectionRow icon={<Wrench className="size-3" />} title={copy.mcpTools}>
        {scopes.length === 0 ? (
          <DenseTag variant="neutral" size="cell">
            {copy.noMcp}
          </DenseTag>
        ) : (
          scopes.map((s) => (
            <DenseTag
              key={s}
              variant="neutral"
              size="cell"
              className="font-mono"
              title={s}
            >
              {s}
            </DenseTag>
          ))
        )}
      </SectionRow>

      {/* Guardrails */}
      {guard ? (
        <SectionRow icon={<Shield className="size-3" />} title={copy.guardrails}>
          {guard.input ? (
            <DenseTag variant="success" size="cell">
              ✓ {copy.guardrailInput}
            </DenseTag>
          ) : null}
          {guard.output ? (
            <DenseTag variant="success" size="cell">
              ✓ {copy.guardrailOutput}
            </DenseTag>
          ) : null}
          {guard.neutralAppendix ? (
            <DenseTag variant="warning" size="cell">
              ✓ {copy.guardrailNeutral}
            </DenseTag>
          ) : null}
        </SectionRow>
      ) : null}

      {/* D10 lock */}
      <SectionRow icon={<Lock className="size-3" />} title={copy.d10Lock}>
        <DenseTag variant="warning" size="cell" title={copy.d10LockHint}>
          {copy.d10LockHint}
        </DenseTag>
      </SectionRow>

      <p className="pt-1 text-dense-micro text-muted-foreground">
        {lang === 'zh' ? (
          <>
            {agentLabel(agentName, lang, apiLabel)} 使用{' '}
            <span className="font-mono">openai-agents</span> Python SDK 定义，通过{' '}
            <span className="font-mono">handoff()</span> 或{' '}
            <span className="font-mono">.as_tool()</span> 与其他 Agent 编排。以上关系源自{' '}
            <span className="font-mono">agents/graph.py</span>，不是硬编码给 UI，而是运行时实际发生的调用形态。
          </>
        ) : (
          <>
            {agentLabel(agentName, lang, apiLabel)} is defined with the{' '}
            <span className="font-mono">openai-agents</span> Python SDK and wired via{' '}
            <span className="font-mono">handoff()</span> / <span className="font-mono">.as_tool()</span>. The above
            relationships come from <span className="font-mono">agents/graph.py</span> — they reflect
            actual runtime call shapes, not UI stubs.
          </>
        )}
      </p>
    </div>
  )
}

export default AgentInteractionsCard
