import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  AGENT_RELEVANT_SLOTS,
  resetAgentPersona,
  updateAgentPersona,
  type AgentPersona,
  type PersonaPreferences,
} from '@/api/agentPersona'
import { useAgentPersonas } from '@/hooks/useAgentPersonas'
import { CopilotTabs } from '@/components/research/CopilotTabs'
import { useSearchParams } from 'react-router-dom'
import { ResearchUserSwitcher } from '@/components/auth/ResearchUserSwitcher'
import { ResearchAuthGap } from '@/components/auth/ResearchAuthGap'
import { AgentInteractionsCard } from '@/components/copilot/AgentInteractionsCard'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  DenseTag,
  DenseTagButton,
  denseEntityFilterChipClass,
  SegmentControl,
} from '@/components/data-display'
import { PageHead } from '@/components/layout/PageHead'
import { JudgeTrackRecord } from '@/pages/copilot/personas/JudgeTrackRecord'
import { TheBench } from '@/pages/copilot/personas/TheBench'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AGENT_DESCRIPTIONS,
  AGENT_GROUPS,
  AGENT_MCP_SCOPES,
  AGENT_ROLE_KIND,
  agentLabel,
  PAGE_COPY,
  PERSONA_CANNOT_LINES,
  ROLE_ACCENT,
  ROLE_LABELS,
  SLOT_LABELS,
  TIME_HORIZON_OPTIONS,
  type PersonaUiLang,
} from '@/lib/copilot/agentPersonaCatalog'
import { cn } from '@/lib/utils'

/** Personas whose preference slots feed Harness Persona eval / Loop Inbox. */
const LOOP_EVAL_PERSONAS = new Set([
  'analyze',
  'portfolio',
  'validate',
  'verdict',
  'discovery',
  'loop_curator',
])

const SYMBOL_CLASSES = ['growth', 'value', 'event_driven', 'income', 'fixed_income'] as const
const STRUCTURE_BIAS = [
  'outright',
  'debit_spread',
  'credit_spread',
  'iron_condor',
  'collar',
  'iv_crush',
  'opex_pin',
] as const
const FAVOR_SIGNALS = [
  'breakout',
  'iv_crush',
  'opex_pin',
  'event_gap',
  'gex_flip',
  'flow_bull',
  'flow_bear',
] as const

function personaSnippet(md: string, max = 48): string {
  const line = md
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'))
  const text = (line ?? md.split('\n')[0] ?? '').replace(/^#+\s*/, '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function PersonaPreferencesForm({
  agentName,
  prefs,
  onChange,
  lang,
}: {
  agentName: string
  prefs: PersonaPreferences
  onChange: (p: PersonaPreferences) => void
  lang: PersonaUiLang
}) {
  const slots = AGENT_RELEVANT_SLOTS[agentName] ?? []
  const slotLabels = SLOT_LABELS[lang]
  if (slots.length === 0) return null

  const toggleList = (
    key: 'symbol_class' | 'structure_bias' | 'favor_signals',
    options: readonly string[],
  ) => (
    <div className="space-y-1.5">
      <Label className="text-dense-meta text-muted-foreground">{slotLabels[key]}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const selected = (prefs[key] as string[] | undefined)?.includes(opt)
          return (
            <DenseTagButton
              key={opt}
              type="button"
              className={denseEntityFilterChipClass('category', Boolean(selected))}
              onClick={() => {
                const cur = new Set(prefs[key] as string[] | undefined ?? [])
                if (cur.has(opt)) cur.delete(opt)
                else cur.add(opt)
                onChange({ ...prefs, [key]: [...cur] })
              }}
            >
              {opt}
            </DenseTagButton>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-3 border-t border-border/50 pt-3">
      <p className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {PAGE_COPY[lang].preferences}
      </p>
      {LOOP_EVAL_PERSONAS.has(agentName) ? (
        <p className="text-dense-caption text-muted-foreground">
          {lang === 'zh'
            ? '这些偏好会影响 Loop 评议链（Harness Persona eval / Decision Inbox）。'
            : 'These slots affect Loop evaluation (Harness Persona eval / Decision Inbox).'}
        </p>
      ) : null}
      {slots.includes('symbol_class') && toggleList('symbol_class', SYMBOL_CLASSES)}
      {slots.includes('structure_bias') && toggleList('structure_bias', STRUCTURE_BIAS)}
      {slots.includes('favor_signals') && toggleList('favor_signals', FAVOR_SIGNALS)}
      {slots.includes('time_horizon') && (
        <div className="space-y-1.5">
          <Label className="text-dense-meta text-muted-foreground">
            {slotLabels.time_horizon}
          </Label>
          <SegmentControl
            ariaLabel={slotLabels.time_horizon}
            value={prefs.time_horizon ?? ''}
            onChange={(v) =>
              onChange({
                ...prefs,
                time_horizon: (v as PersonaPreferences['time_horizon']) || null,
              })
            }
            options={TIME_HORIZON_OPTIONS[lang]}
          />
        </div>
      )}
      {slots.includes('max_single_position_pct') && (
        <div className="space-y-1">
          <Label className="text-dense-meta text-muted-foreground">
            {slotLabels.max_single_position_pct}
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-8 text-dense-meta max-w-[8rem]"
            value={prefs.max_single_position_pct ?? ''}
            onChange={(e) =>
              onChange({
                ...prefs,
                max_single_position_pct: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      )}
      {slots.includes('max_sector_concentration_pct') && (
        <div className="space-y-1">
          <Label className="text-dense-meta text-muted-foreground">
            {slotLabels.max_sector_concentration_pct}
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-8 text-dense-meta max-w-[8rem]"
            value={prefs.max_sector_concentration_pct ?? ''}
            onChange={(e) =>
              onChange({
                ...prefs,
                max_sector_concentration_pct: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      )}
      {slots.includes('hard_stop_dd_pct') && (
        <div className="space-y-1">
          <Label className="text-dense-meta text-muted-foreground">
            {slotLabels.hard_stop_dd_pct}
          </Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-8 text-dense-meta max-w-[8rem]"
            value={prefs.hard_stop_dd_pct ?? ''}
            onChange={(e) =>
              onChange({
                ...prefs,
                hard_stop_dd_pct: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      )}
      {slots.includes('avoid_classes') && (
        <div className="space-y-1">
          <Label className="text-dense-meta text-muted-foreground">
            {slotLabels.avoid_classes}
          </Label>
          <Input
            className="h-8 text-dense-meta"
            placeholder={lang === 'zh' ? '逗号分隔' : 'comma-separated'}
            value={(prefs.avoid_classes ?? []).join(', ')}
            onChange={(e) =>
              onChange({
                ...prefs,
                avoid_classes: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}
      {slots.includes('disfavor_signals') && (
        <div className="space-y-1">
          <Label className="text-dense-meta text-muted-foreground">
            {slotLabels.disfavor_signals}
          </Label>
          <Input
            className="h-8 text-dense-meta"
            placeholder={lang === 'zh' ? '逗号分隔' : 'comma-separated'}
            value={(prefs.disfavor_signals ?? []).join(', ')}
            onChange={(e) =>
              onChange({
                ...prefs,
                disfavor_signals: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}
    </div>
  )
}

function PreviewPanel({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <CollapsibleGroup>
      <CollapsibleGroupHeader expanded={open} onToggle={() => setOpen((v) => !v)}>
        <CollapsibleChevron expanded={open} />
        <CollapsibleGroupTitle>{title}</CollapsibleGroupTitle>
      </CollapsibleGroupHeader>
      {open ? <CollapsibleGroupBody>{children}</CollapsibleGroupBody> : null}
    </CollapsibleGroup>
  )
}

function AgentPersonaEditor({
  persona,
  lang,
  onSaved,
}: {
  persona: AgentPersona
  lang: PersonaUiLang
  onSaved: () => void
}) {
  const copy = PAGE_COPY[lang]
  const [md, setMd] = useState(persona.persona_md)
  const [prefs, setPrefs] = useState<PersonaPreferences>(persona.preferences_json ?? {})
  const [dirty, setDirty] = useState(false)

  const save = useMutation({
    mutationFn: () =>
      updateAgentPersona(persona.agent_name, { persona_md: md, preferences_json: prefs }),
    onSuccess: () => {
      setDirty(false)
      onSaved()
    },
  })

  const reset = useMutation({
    mutationFn: () => resetAgentPersona(persona.agent_name),
    onSuccess: (row) => {
      setMd(row.persona_md)
      setPrefs(row.preferences_json ?? {})
      setDirty(false)
      onSaved()
    },
  })

  const displayLabel = agentLabel(persona.agent_name, 'en')
  const role = AGENT_ROLE_KIND[persona.agent_name]

  return (
    <Card variant="elevated" className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-dense-body font-semibold">{displayLabel}</h2>
            <span className="text-dense-micro font-mono text-muted-foreground">
              {persona.agent_name}
            </span>
            {role ? (
              <DenseTag variant="neutral" size="cell" className={cn(ROLE_ACCENT[role])}>
                {ROLE_LABELS[lang][role]}
              </DenseTag>
            ) : null}
            {persona.guardrail_locked ? (
              <DenseTag variant="warning" size="cell">
                {copy.guardrailLocked}
              </DenseTag>
            ) : null}
            {dirty ? (
              <DenseTag variant="warning" size="cell">
                {copy.unsaved}
              </DenseTag>
            ) : null}
          </div>
          <p className="text-dense-meta text-muted-foreground">
            {AGENT_DESCRIPTIONS[lang][persona.agent_name]}
          </p>
          {persona.updated_at ? (
            <p className="text-dense-caption text-muted-foreground">
              {copy.updated} {new Date(persona.updated_at).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            className="h-8"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? copy.saving : copy.save}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={reset.isPending}
            onClick={() => reset.mutate()}
            title={copy.resetHint}
          >
            {copy.reset}
          </Button>
        </div>
      </div>

      <AgentInteractionsCard
        agentName={persona.agent_name}
        lang={lang}
        apiLabel={persona.label}
      />

      <PersonaToolsCannot agentName={persona.agent_name} copy={copy} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2 min-w-0">
          <div className="space-y-1">
            <Label className="text-dense-meta">{copy.personaLabel}</Label>
            <p className="text-dense-caption text-muted-foreground">{copy.personaHint}</p>
          </div>
          <textarea
            className="min-h-[14rem] w-full rounded-md border border-input bg-background px-3 py-2 text-dense-meta leading-relaxed"
            value={md}
            placeholder={copy.personaPlaceholder}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              setMd(e.target.value)
              setDirty(true)
            }}
          />
          <PersonaPreferencesForm
            agentName={persona.agent_name}
            prefs={prefs}
            lang={lang}
            onChange={(p) => {
              setPrefs(p)
              setDirty(true)
            }}
          />
        </div>

        <div className="space-y-3 min-w-0">
          <PreviewPanel title={copy.baseInstruction} defaultOpen={false}>
            <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap text-dense-caption text-muted-foreground">
              {persona.base_instruction_preview ?? '—'}
            </pre>
          </PreviewPanel>
          <PreviewPanel title={copy.assembledPreview} defaultOpen={true}>
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap text-dense-caption">
              {persona.assembled_preview ?? '—'}
            </pre>
          </PreviewPanel>
        </div>
      </div>
    </Card>
  )
}

function PersonaToolsCannot({
  agentName,
  copy,
}: {
  agentName: string
  copy: (typeof PAGE_COPY)[PersonaUiLang]
}) {
  const tools = AGENT_MCP_SCOPES[agentName] ?? []
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <p className="text-dense-micro uppercase tracking-wide text-muted-foreground">
          {copy.toolsItMayCall}
        </p>
        {tools.length === 0 ? (
          <p className="text-dense-caption text-muted-foreground">{copy.noMcp}</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {tools.map((t) => (
              <span
                key={t}
                className="border px-1.5 py-0.5 font-mono text-dense-caption mat-tag"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-dense-micro uppercase tracking-wide text-muted-foreground">
          {copy.cannot}
        </p>
        <ul className="space-y-0.5 text-dense-caption text-muted-foreground">
          {PERSONA_CANNOT_LINES.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function AgentPersonaNav({
  agents,
  selected,
  onSelect,
  lang,
}: {
  agents: AgentPersona[]
  selected: string
  onSelect: (name: string) => void
  lang: PersonaUiLang
}) {
  const byName = useMemo(() => new Map(agents.map((a) => [a.agent_name, a])), [agents])

  return (
    <Card variant="elevated" className="flex flex-col gap-3 p-2 lg:w-[15.5rem] shrink-0">
      {AGENT_GROUPS.map((group) => (
        <div key={group.id} className="space-y-1">
          <p className="px-2 text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label[lang]}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.agents.map((name) => {
              const persona = byName.get(name)
              if (!persona) return null
              const active = selected === name
              const label = agentLabel(name, 'en')
              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onSelect(name)}
                    className={cn(
                      'w-full rounded-md px-2 py-2 text-left transition-colors',
                      active
                        ? 'bg-primary/15 text-foreground ring-1 ring-primary/30'
                        : 'hover:bg-secondary text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <span className="block text-dense-label font-medium leading-tight">{label}</span>
                    <span className="mt-0.5 block text-dense-caption text-muted-foreground line-clamp-2">
                      {personaSnippet(persona.persona_md)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </Card>
  )
}

export function AgentPersonaPage() {
  const qc = useQueryClient()
  // `?agent=` is how Orchestration hands a name over: picking an agent on the
  // wiring diagram is a question about that agent's persona, and the persona
  // lives here. A link that attached a parameter this page ignored would be
  // the same dead end as one pointing nowhere.
  const [params] = useSearchParams()
  const [selected, setSelected] = useState<string | null>(params.get('agent'))
  const editorRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError, error } = useAgentPersonas()

  const agents = useMemo(() => data ?? [], [data])
  const activeAgentName =
    selected && agents.some((a) => a.agent_name === selected)
      ? selected
      : (agents[0]?.agent_name ?? null)
  const selectedPersona = agents.find((a) => a.agent_name === activeAgentName)

  const handleSelect = (name: string) => {
    setSelected(name)
    if (editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const copy = PAGE_COPY.en

  return (
    <PageShell padding="compact">
      <PageHead title={copy.title} info={copy.description} actions={<ResearchUserSwitcher />} />

      {/* The same strip the desk carries: Personas is the Copilot's third
          face, and its own route — §5a.5 then reads this page's h1 off that
          route's label rather than the file's first title. */}
      <CopilotTabs active="personas" />

      <p className="text-dense-caption text-muted-foreground">{copy.originPick}</p>


      {isLoading ? (
        <p className="text-dense-meta text-muted-foreground">Loading personas…</p>
      ) : null}
      {isError ? (
        <ResearchAuthGap error={error} />
      ) : null}

      {!isLoading && !isError && agents.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/* Rev 2026-09-21.6 merged the roster and the Track record into one
              table, and moved the wiring diagram to its own page: who to
              trust is the trader's question, who hands off to whom is the
              engineer's (Shell Spec §11.4). */}
          <TheBench
            agents={agents}
            selected={activeAgentName}
            onSelect={handleSelect}
          />

          <div
            ref={editorRef}
            className="flex flex-col gap-3 lg:flex-row lg:items-start scroll-mt-4"
          >
            <AgentPersonaNav
              agents={agents}
              selected={activeAgentName ?? ''}
              onSelect={handleSelect}
              lang="en"
            />
            <div className="min-w-0 flex-1">
              {selectedPersona ? (
                <AgentPersonaEditor
                  key={`${selectedPersona.agent_name}:${selectedPersona.updated_at}`}
                  persona={selectedPersona}
                  lang="en"
                  onSaved={() => qc.invalidateQueries({ queryKey: ['agent-personas'] })}
                />
              ) : (
                <p className="text-dense-meta text-muted-foreground">{copy.selectAgent}</p>
              )}
            </div>
          </div>

          {/* Kept below the bench, not merged into it: this reads where a
              candidate came from, which is a different question from who
              graded it — and the only one of the two this side can answer. */}
          <JudgeTrackRecord />
        </div>
      ) : null}
    </PageShell>
  )
}

export default AgentPersonaPage
