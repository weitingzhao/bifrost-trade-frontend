/** Agent persona UI catalog — labels, groups, preference slots (ZH default). */

export type PersonaUiLang = 'zh' | 'en'

export const AGENT_LABELS_ZH: Record<string, string> = {
  discovery: '机会发现',
  analyze: '结构分析',
  validate: '验证',
  write: '写入',
  explain: '解释',
  portfolio: '持仓',
  verdict: '综合裁决',
  curator: '沉淀',
  loop_curator: 'Loop 沉淀',
}

export const AGENT_LABELS_EN: Record<string, string> = {
  discovery: 'Discovery',
  analyze: 'Analyze',
  validate: 'Validate',
  write: 'Write',
  explain: 'Explain',
  portfolio: 'Portfolio',
  verdict: 'Verdict',
  curator: 'Curator',
  loop_curator: 'Loop Curator',
}

export const AGENT_DESCRIPTIONS: Record<PersonaUiLang, Record<string, string>> = {
  zh: {
    discovery: 'SEPA、动量、事件雷达',
    analyze: '波动率、GEX、VRP',
    validate: '回测与中立验证',
    write: '假设与回测写入',
    explain: '概念与 Runbook',
    portfolio: '持仓、集中度、对冲',
    verdict: '盘前盘后综合简报',
    curator: '规则与案例沉淀',
    loop_curator: 'Harness 批跑后沉淀规则 / 假设',
  },
  en: {
    discovery: 'SEPA, momentum, events',
    analyze: 'Vol, GEX, VRP',
    validate: 'Backtest & falsification',
    write: 'Hypothesis & backtest writes',
    explain: 'Concepts & runbook',
    portfolio: 'Holdings & concentration',
    verdict: 'Morning / EOD synthesis',
    curator: 'Rules & case drafts',
    loop_curator: 'Post-harness playbook / hypothesis curation',
  },
}

export const AGENT_GROUPS: {
  id: string
  label: Record<PersonaUiLang, string>
  agents: string[]
}[] = [
  {
    id: 'market',
    label: { zh: '市场与发现', en: 'Market & discovery' },
    agents: ['discovery', 'analyze'],
  },
  {
    id: 'portfolio',
    label: { zh: '持仓与验证', en: 'Portfolio & validation' },
    agents: ['portfolio', 'validate'],
  },
  {
    id: 'workflow',
    label: { zh: '工作流与沉淀', en: 'Workflow & curation' },
    agents: ['verdict', 'write', 'curator', 'loop_curator', 'explain'],
  },
]

// ---------------------------------------------------------------------------
// Orchestration metadata — powers the orchestration diagram + interactions card.
// These are the runtime relationships defined in
// bifrost-research/src/bifrost_research/copilot/agents/graph.py:
//   - Triage `handoffs=[discovery, analyze, validate, write, explain, verdict,
//                       portfolio, curator]`
//   - Verdict `tools=[discovery.as_tool, analyze.as_tool, validate.as_tool]`
// MCP scopes mirror each agent's instruction .md file.
// ---------------------------------------------------------------------------

export type AgentRoleKind =
  | 'router'
  | 'specialist'
  | 'composer'
  | 'writer'
  | 'curator'
  | 'explainer'
  | 'loop'

export const AGENT_ROLE_KIND: Record<string, AgentRoleKind> = {
  discovery: 'specialist',
  analyze: 'specialist',
  validate: 'specialist',
  portfolio: 'specialist',
  verdict: 'composer',
  write: 'writer',
  curator: 'curator',
  loop_curator: 'loop',
  explain: 'explainer',
}

export const ROLE_LABELS: Record<PersonaUiLang, Record<AgentRoleKind, string>> = {
  zh: {
    router: '路由',
    specialist: '专家',
    composer: '综合',
    writer: '写入',
    curator: '沉淀',
    explainer: '解释',
    loop: 'Loop',
  },
  en: {
    router: 'Router',
    specialist: 'Specialist',
    composer: 'Composer',
    writer: 'Writer',
    curator: 'Curator',
    explainer: 'Explainer',
    loop: 'Loop',
  },
}

export const ROLE_ACCENT: Record<AgentRoleKind, string> = {
  router: 'text-foreground bg-muted',
  specialist: 'text-sky-700 dark:text-sky-300 bg-sky-500/15',
  composer: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/15',
  writer: 'text-orange-800 dark:text-orange-200 bg-orange-500/15',
  curator: 'text-emerald-800 dark:text-emerald-200 bg-emerald-500/15',
  explainer: 'text-teal-800 dark:text-teal-200 bg-teal-500/15',
  loop: 'text-amber-800 dark:text-amber-200 bg-amber-500/15',
}

/** MCP tool scopes each agent is instructed to prefer. Mirrors the .md files
 * in bifrost-research/.../agents/instructions/. Empty array = no MCP tools. */
export const AGENT_MCP_SCOPES: Record<string, string[]> = {
  discovery: ['research.discovery.*', 'research.event_radar.*'],
  analyze: [
    'research.vrp.*',
    'research.vol_surface.*',
    'research.opex_cycle.*',
    'research.gex.*',
    'research.flow.*',
  ],
  validate: ['research.backtest.*'],
  portfolio: [
    'trade.portfolio.snapshot',
    'trade.market.quotes',
    'trade.trading.recent_executions',
    'research.discovery.*',
    'research.vrp.*',
  ],
  write: ['research.hypothesis.*', 'research.backtest.*'],
  curator: ['research.playbook.propose_*', 'research.note.propose_*'],
  loop_curator: [
    'research.playbook.propose_*',
    'research.hypothesis.*',
    'research.draft.*',
  ],
  explain: [],
  verdict: [],
}

export type InvokedBy = { by: string; kind: 'handoff' | 'as_tool' }

/** Who calls this agent, and how. All 8 agents receive a Triage handoff.
 * Discovery / Analyze / Validate are also invoked by Verdict as sub-tools. */
export const AGENT_INVOKED_BY: Record<string, InvokedBy[]> = {
  discovery: [
    { by: 'triage', kind: 'handoff' },
    { by: 'verdict', kind: 'as_tool' },
  ],
  analyze: [
    { by: 'triage', kind: 'handoff' },
    { by: 'verdict', kind: 'as_tool' },
  ],
  validate: [
    { by: 'triage', kind: 'handoff' },
    { by: 'verdict', kind: 'as_tool' },
  ],
  portfolio: [
    { by: 'triage', kind: 'handoff' },
    { by: 'verdict', kind: 'as_tool' },
  ],
  write: [{ by: 'triage', kind: 'handoff' }],
  explain: [{ by: 'triage', kind: 'handoff' }],
  verdict: [{ by: 'triage', kind: 'handoff' }],
  curator: [{ by: 'triage', kind: 'handoff' }],
  loop_curator: [{ by: 'triage', kind: 'handoff' }],
}

/** Agents this one calls (only the composer chain: verdict → D/A/V). */
export const AGENT_CALLS: Record<string, { to: string; kind: 'as_tool' }[]> = {
  verdict: [
    { to: 'discovery', kind: 'as_tool' },
    { to: 'analyze', kind: 'as_tool' },
    { to: 'validate', kind: 'as_tool' },
    { to: 'portfolio', kind: 'as_tool' },
  ],
}

/** Guardrail metadata per agent. Every agent has input+output; Validate
 * additionally receives the "neutral validation mandate" appendix. */
export const AGENT_GUARDRAILS: Record<
  string,
  { input: boolean; output: boolean; neutralAppendix: boolean }
> = {
  discovery: { input: true, output: true, neutralAppendix: false },
  analyze: { input: true, output: true, neutralAppendix: false },
  validate: { input: true, output: true, neutralAppendix: true },
  portfolio: { input: true, output: true, neutralAppendix: false },
  write: { input: true, output: true, neutralAppendix: false },
  explain: { input: true, output: true, neutralAppendix: false },
  verdict: { input: true, output: true, neutralAppendix: false },
  curator: { input: true, output: true, neutralAppendix: false },
  loop_curator: { input: true, output: true, neutralAppendix: false },
}

/** One-liner explaining WHEN Triage routes here. Rendered as a subtle badge
 * under each specialist tile so the user grasps orchestration intent. */
export const AGENT_TRIAGE_HINT: Record<PersonaUiLang, Record<string, string>> = {
  zh: {
    discovery: 'SEPA / 动量 / 事件',
    analyze: 'VRP / GEX / 期限结构',
    validate: '回测 / 反证 (中立)',
    portfolio: '当前持仓相关问题',
    write: '假设 / 回测写入 (dry_run)',
    explain: '概念 / Runbook',
    verdict: '盘前盘后综合',
    curator: '沉淀为 Playbook 规则',
    loop_curator: 'Harness 批跑 / Decision Inbox',
  },
  en: {
    discovery: 'SEPA / momentum / events',
    analyze: 'VRP / GEX / term structure',
    validate: 'Backtest / falsification',
    portfolio: 'Holdings-aware questions',
    write: 'Hypothesis / backtest writes',
    explain: 'Concepts / runbook',
    verdict: 'Morning / EOD synthesis',
    curator: 'Consolidate into playbook',
    loop_curator: 'Harness batch / Decision Inbox',
  },
}

/** Runtime facts shared across the orchestration diagram. */
export const ORCHESTRATION_RUNTIME = {
  sdk: 'openai-agents (Python)',
  transport: 'MCP over SSE',
  mcpServer: 'research-mcp',
  d10Locked: true,
} as const

export function agentLabel(agentName: string, lang: PersonaUiLang, apiLabel?: string): string {
  if (lang === 'zh') return AGENT_LABELS_ZH[agentName] ?? apiLabel ?? agentName
  return apiLabel ?? AGENT_LABELS_EN[agentName] ?? agentName
}

export const SLOT_LABELS: Record<PersonaUiLang, Record<string, string>> = {
  zh: {
    symbol_class: '标的类别',
    avoid_classes: '回避类别',
    time_horizon: '持有周期',
    structure_bias: '结构偏好',
    max_single_position_pct: '单票上限 %',
    max_sector_concentration_pct: '行业集中度 %',
    hard_stop_dd_pct: '硬止损回撤 %',
    favor_signals: '偏好信号',
    disfavor_signals: '回避信号',
  },
  en: {
    symbol_class: 'Symbol class',
    avoid_classes: 'Avoid classes',
    time_horizon: 'Time horizon',
    structure_bias: 'Structure bias',
    max_single_position_pct: 'Max single position %',
    max_sector_concentration_pct: 'Max sector %',
    hard_stop_dd_pct: 'Hard stop DD %',
    favor_signals: 'Favor signals',
    disfavor_signals: 'Disfavor signals',
  },
}

export const TIME_HORIZON_OPTIONS: Record<
  PersonaUiLang,
  { value: string; label: string }[]
> = {
  zh: [
    { value: 'day', label: '日内' },
    { value: 'swing_2w_8w', label: '波段 2–8 周' },
    { value: 'position_gt_2m', label: '持仓 >2 月' },
  ],
  en: [
    { value: 'day', label: 'Day' },
    { value: 'swing_2w_8w', label: 'Swing 2–8w' },
    { value: 'position_gt_2m', label: 'Position >2m' },
  ],
}

export const PAGE_COPY: Record<
  PersonaUiLang,
  {
    title: string
    description: string
    personaLabel: string
    personaHint: string
    personaPlaceholder: string
    preferences: string
    baseInstruction: string
    assembledPreview: string
    save: string
    saving: string
    reset: string
    guardrailLocked: string
    updated: string
    unsaved: string
    selectAgent: string
    uiLang: string
    resetHint: string
    orchestrationTitle: string
    orchestrationSubtitle: string
    userInput: string
    userInputHint: string
    triageName: string
    triageRoleHint: string
    handoffLabel: string
    asToolLabel: string
    mcpTools: string
    noMcp: string
    interactions: string
    calledBy: string
    provides: string
    guardrails: string
    guardrailInput: string
    guardrailOutput: string
    guardrailNeutral: string
    d10Lock: string
    d10LockHint: string
    runtime: string
    routerLegend: string
    specialistLegend: string
    composerLegend: string
    writerCuratorLegend: string
    diagramHint: string
    harnessStripTitle: string
    harnessStripHint: string
    policyVsPersona: string
  }
> = {
  zh: {
    title: 'Agent Personas',
    description:
      '为每位 Copilot 专家定义交易人格（Owner 作用域）。支持中英文 Markdown；默认模板为中文。每次对话都会叠加到系统指令。两条脊柱：Policy 决定「选什么」，Personas 决定「怎么评」。',
    personaLabel: 'Persona（Markdown）',
    personaHint: '可写交易风格、边界、常用框架。中英文均可，模型会按你的 Copilot 语言偏好回复。',
    personaPlaceholder:
      '# 标题\n\n- 偏好成长 / 事件驱动\n- 先列候选再深入\n- 观察用途，不触发下单（D10）',
    preferences: '结构化偏好',
    baseInstruction: '系统基础指令（只读）',
    assembledPreview: '合成预览（基础 + Persona + 偏好）',
    save: '保存',
    saving: '保存中…',
    reset: '恢复中文默认',
    guardrailLocked: '守则锁定',
    updated: '更新于',
    unsaved: '有未保存更改',
    selectAgent: '从左侧选择 Agent',
    uiLang: '界面',
    resetHint: '恢复为仓库内置中文模板，并清空结构化偏好。',
    orchestrationTitle: '编排关系',
    orchestrationSubtitle: '基于 OpenAI Agents Python SDK · handoff + Agent-as-Tool',
    userInput: '你的提问',
    userInputHint: 'Copilot Panel 送入',
    triageName: 'Triage 路由',
    triageRoleHint: '判断意图 → handoff 到某位专家',
    handoffLabel: 'handoff',
    asToolLabel: 'as tool',
    mcpTools: 'MCP 工具',
    noMcp: '无 MCP 工具（纯知识）',
    interactions: '联动关系',
    calledBy: '被调用方',
    provides: '作为子工具提供给',
    guardrails: 'Guardrails',
    guardrailInput: '输入守则',
    guardrailOutput: '输出守则',
    guardrailNeutral: '中立验证附加约束',
    d10Lock: 'D10 只读',
    d10LockHint: '不下真单，不触发 daemon 控制',
    runtime: '运行时',
    routerLegend: '路由',
    specialistLegend: '专家',
    composerLegend: '综合',
    writerCuratorLegend: '写入 / 沉淀',
    diagramHint: '点击任一 Agent 卡片可跳转到下方编辑该 Persona',
    harnessStripTitle: 'Harness 批跑（无人值守）',
    harnessStripHint:
      'Policy 漏斗选股 → Personas 评议（analyze→portfolio→validate→verdict）→ Decision Inbox。默认 persona = loop_curator。与上方 Chat Triage 分流无关。',
    policyVsPersona: 'Policy = 选什么 · Personas = 怎么评',
  },
  en: {
    title: 'Agent Personas',
    description:
      'Owner-scoped trading personas for each Copilot specialist. Markdown in Chinese or English; defaults are Chinese templates. Two spines: Policy picks what; Personas judge how.',
    personaLabel: 'Persona (markdown)',
    personaHint: 'Trading style, boundaries, frameworks. Chinese or English.',
    personaPlaceholder:
      '# Title\n\n- Growth / event-driven bias\n- Candidates first, then depth\n- Observe-only (D10)',
    preferences: 'Structured preferences',
    baseInstruction: 'Base instruction (read-only)',
    assembledPreview: 'Assembled preview',
    save: 'Save',
    saving: 'Saving…',
    reset: 'Reset to Chinese default',
    guardrailLocked: 'Guardrail locked',
    updated: 'Updated',
    unsaved: 'Unsaved changes',
    selectAgent: 'Select an agent on the left',
    uiLang: 'UI',
    resetHint: 'Restore bundled Chinese template and clear structured preferences.',
    orchestrationTitle: 'Orchestration',
    orchestrationSubtitle: 'Built on OpenAI Agents Python SDK · handoff + Agent-as-Tool',
    userInput: 'Your question',
    userInputHint: 'via Copilot Panel',
    triageName: 'Triage router',
    triageRoleHint: 'Reads intent → handoff to a specialist',
    handoffLabel: 'handoff',
    asToolLabel: 'as tool',
    mcpTools: 'MCP tools',
    noMcp: 'No MCP tools (pure knowledge)',
    interactions: 'Interactions',
    calledBy: 'Called by',
    provides: 'Exposed as sub-tool to',
    guardrails: 'Guardrails',
    guardrailInput: 'Input guardrail',
    guardrailOutput: 'Output guardrail',
    guardrailNeutral: 'Neutral validation mandate',
    d10Lock: 'D10 observe-only',
    d10LockHint: 'No live orders, no daemon control',
    runtime: 'Runtime',
    routerLegend: 'Router',
    specialistLegend: 'Specialist',
    composerLegend: 'Composer',
    writerCuratorLegend: 'Writer / Curator',
    diagramHint: 'Click any agent card to edit its persona below',
    harnessStripTitle: 'Harness batch (unattended)',
    harnessStripHint:
      'Policy funnel → Persona eval (analyze→portfolio→validate→verdict) → Decision Inbox. Default persona = loop_curator. Separate from Chat Triage above.',
    policyVsPersona: 'Policy = what to pick · Personas = how to judge',
  },
}
