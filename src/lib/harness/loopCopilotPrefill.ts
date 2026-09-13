import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { copilotDockStore } from '@/hooks/useCopilotDock'
import {
  readCopilotPromptLang,
  type CopilotPromptLang,
} from '@/lib/copilot/promptLang'
import type { ObjectiveRunDetail } from '@/api/research/harness'
import { parseHarnessTrace, traceFunnel, traceScanEvent } from '@/lib/harness/harnessTrace'

function funnelSummaryText(runDetail?: ObjectiveRunDetail, lang: CopilotPromptLang = 'zh'): string {
  if (!runDetail?.trace_json) return ''
  const trace = parseHarnessTrace(runDetail.trace_json)
  const funnel = traceFunnel(trace)
  if (funnel.length === 0) {
    const scan = traceScanEvent(trace)
    const n = Array.isArray(scan?.symbols) ? scan!.symbols!.length : 0
    return lang === 'zh'
      ? `宇宙模式 ${String(scan?.universe_mode ?? '—')}，${n} 个 symbol。`
      : `Universe mode ${String(scan?.universe_mode ?? '—')}, ${n} symbols.`
  }
  const parts = funnel.map(
    (s) =>
      `${s.name}: ${s.in_count}→${s.out_count}${s.skipped ? ' (skipped)' : ''}`,
  )
  return lang === 'zh' ? `漏斗：${parts.join('；')}` : `Funnel: ${parts.join('; ')}`
}

export function buildLoopRunReviewPrompt(
  params: { runId: string; title: string; runDetail?: ObjectiveRunDetail },
  lang: CopilotPromptLang = readCopilotPromptLang(),
): string {
  const funnel = funnelSummaryText(params.runDetail, lang)
  const pipelinePath = loopPipelinePath(params.runId, { live: true })
  const overlay =
    params.runDetail?.outputs?.data_source != null
      ? String(params.runDetail.outputs.data_source)
      : ''

  if (lang === 'zh') {
    return (
      `请审阅 harness run ${params.runId}（objective「${params.title}」）。\n` +
      (funnel ? `${funnel}\n` : '') +
      `先调用 research.loop.get_run("${params.runId}")，只引用这次 run 自己的记录并标注工具出处：` +
      'plan 的来源、漏斗每一刀、hit_rate 门、每个候选各模型 judge 的立场与是否一致、report 的 why / settled / wrong_if。' +
      'Option 字段缺失时不得当作淘汰理由（option_overlay.required=false 时）；not_measured 是覆盖度事实不是判定。' +
      `白盒 Pipeline：${pipelinePath} 。` +
      'D10 观察模式，请勿涉及实盘发单。'
    )
  }
  return (
    `Review harness run ${params.runId} for objective "${params.title}".\n` +
    (funnel ? `${funnel}\n` : '') +
    `Data source: ${overlay || 'n/a'}. ` +
    `Start with research.loop.get_run("${params.runId}") and answer from the run's own record, citing the tool for each claim: ` +
    'where the plan came from, each funnel cut, the hit-rate gate, every candidate with each judge\'s stance per model and whether they agreed, the report\'s why / settled / wrong_if. ' +
    'Missing option fields must NOT be treated as rejection reasons when option_overlay.required is false; not_measured is a coverage fact, not a verdict. ' +
    `White-box pipeline: ${pipelinePath}. D10 observe-only.`
  )
}

/** "Why was WT proposed and what would unmake it" — answered from the run's own record (D1). */
export function buildCandidateExplainPrompt(
  params: { runId: string; symbol: string; title?: string | null },
  lang: CopilotPromptLang = readCopilotPromptLang(),
): string {
  const sym = params.symbol.trim().toUpperCase()
  const title = params.title ? `「${params.title}」` : ''
  if (lang === 'zh') {
    return (
      `harness run ${params.runId}${title} 为什么提出 ${sym}？什么情况会推翻这个判断？\n` +
      `请调用 research.loop.explain_candidate("${params.runId}", "${sym}")，只引用这次 run 自己的记录并标注出处：` +
      '入选证据（SEPA 阶段 / 路径 / 分数）、价格位置、该来源的已结清记录、每个模型 judge 的立场与摘要（分歧要点名）、' +
      'report 的 wrong_if / falsify、validate 是否 block。not_measured 与缺期权数据是覆盖度事实，不是判定。' +
      '若要补今天的读数，用 research.exhibit.get 并注明是今天的。D10 观察模式。'
    )
  }
  return (
    `In harness run ${params.runId}${params.title ? ` ("${params.title}")` : ''}: why was ${sym} proposed, and what would unmake the call?\n` +
    `Call research.loop.explain_candidate("${params.runId}", "${sym}") and answer from the run's own record, citing the tool for each claim: ` +
    "the selection evidence (SEPA stage / path / score), price context, this source's settled record, each judge's stance and summary by model (name any dissent), " +
    'the report\'s wrong_if / falsify, and whether validate blocked it. not_measured and missing option data are coverage facts, not verdicts. ' +
    "Add today's reading only via research.exhibit.get, labelled as today's. D10 observe-only."
  )
}

/** Prefill Copilot with one candidate of a run and open the panel — does not auto-send. */
export function openCandidateInCopilot(params: {
  runId: string
  symbol: string
  title?: string | null
  lang?: CopilotPromptLang
}) {
  const lang = params.lang ?? readCopilotPromptLang()
  const sym = params.symbol.trim().toUpperCase()
  askCopilotIntentStore.open({
    originPage: 'harness',
    originLabel: lang === 'zh' ? `候选 ${sym}` : `Candidate ${sym}`,
    symbol: sym,
    suggestedPrompt: buildCandidateExplainPrompt(params, lang),
    snapshot: {
      run_id: params.runId,
      symbol: sym,
      objective_title: params.title ?? null,
      prompt_lang: lang,
      pipeline_path: loopPipelinePath(params.runId, { live: false }),
    },
  })
  copilotDockStore.getState().open_()
  cockpitDrawerStore.getState().setTab('copilot')
}

function loopRunOriginLabel(runId: string, lang: CopilotPromptLang): string {
  const short = runId.slice(0, 8)
  return lang === 'zh' ? `运行 ${short}` : `Run ${short}`
}

/** Prefill Copilot composer and open the floating panel — does not auto-send. */
export function openLoopRunInCopilot(params: {
  runId: string
  title: string
  lang?: CopilotPromptLang
  runDetail?: ObjectiveRunDetail
}) {
  const lang = params.lang ?? readCopilotPromptLang()
  askCopilotIntentStore.open({
    originPage: 'harness',
    originLabel: loopRunOriginLabel(params.runId, lang),
    suggestedPrompt: buildLoopRunReviewPrompt(params, lang),
    snapshot: {
      run_id: params.runId,
      objective_title: params.title,
      prompt_lang: lang,
      pipeline_path: loopPipelinePath(params.runId, { live: true }),
    },
  })
  copilotDockStore.getState().open_()
  cockpitDrawerStore.getState().setTab('copilot')
}

export function openResearchCopilot() {
  copilotDockStore.getState().open_()
  cockpitDrawerStore.getState().setTab('copilot')
}

export function openCopilotInbox() {
  copilotDockStore.getState().open_()
  cockpitDrawerStore.getState().revealInbox()
}

export function loopPipelinePath(runId: string, opts?: { live?: boolean }): string {
  const q = new URLSearchParams()
  q.set('run', runId)
  if (opts?.live !== false) q.set('live', '1')
  return `/research/loop/harness?${q.toString()}`
}

/** LoopBanner / Harness action labels keyed by prompt language. */
export const loopCopilotUi = {
  discuss: (lang: CopilotPromptLang) =>
    lang === 'zh' ? '在 Copilot 讨论' : 'Discuss in Copilot',
  discussShort: (lang: CopilotPromptLang) => (lang === 'zh' ? '讨论' : 'Discuss'),
  viewPipeline: (lang: CopilotPromptLang) =>
    lang === 'zh' ? '查看运行' : 'View run',
  curator: (lang: CopilotPromptLang, curating?: boolean) => {
    if (curating) return lang === 'zh' ? '整理中…' : 'Curating…'
    return 'Curator'
  },
  inbox: (lang: CopilotPromptLang) => (lang === 'zh' ? '收件箱' : 'Inbox'),
  awaitingBanner: (lang: CopilotPromptLang, count: number, loading?: boolean) => {
    if (loading) return lang === 'zh' ? '加载 Loop runs…' : 'Loading loop runs…'
    if (lang === 'zh') return `${count} 条 run 待审批`
    return `${count} run${count === 1 ? '' : 's'} awaiting approval`
  },
  review: (lang: CopilotPromptLang, open: boolean) =>
    open ? (lang === 'zh' ? '收起' : 'Hide') : lang === 'zh' ? '查看' : 'Review',
  moreInHarness: (lang: CopilotPromptLang, n: number) =>
    lang === 'zh' ? `另有 ${n} 条见 Autopilot` : `+${n} more in Autopilot`,
} as const
