import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { openThread } from '@/hooks/useCopilotThread'
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
    originLabel: `Candidate ${sym}`,
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
  openThread()
  cockpitDrawerStore.getState().setTab('copilot')
}

function loopRunOriginLabel(runId: string): string {
  const short = runId.slice(0, 8)
  return `Run ${short}`
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
    originLabel: loopRunOriginLabel(params.runId),
    suggestedPrompt: buildLoopRunReviewPrompt(params, lang),
    snapshot: {
      run_id: params.runId,
      objective_title: params.title,
      prompt_lang: lang,
      pipeline_path: loopPipelinePath(params.runId, { live: true }),
    },
  })
  openThread()
  cockpitDrawerStore.getState().setTab('copilot')
}

/**
 * Prefill the Copilot with one pending draft and open the panel — does not
 * auto-send.
 *
 * The Copilot Desk's "Ask" on a waiting call. It asks about the draft rather
 * than acting on it: approving is the reader's call, and the prompt carries
 * what approving would actually change — which for several kinds is nothing.
 */
export function openDraftInCopilot(params: {
  id: string
  kind: string
  title: string
  askedBy: string
  landsIn: string | null
  lang?: CopilotPromptLang
}) {
  const lang = params.lang ?? readCopilotPromptLang()
  const effect = params.landsIn
    ? lang === 'zh'
      ? `批准后写入：${params.landsIn}`
      : `Approving writes to ${params.landsIn}`
    : lang === 'zh'
      ? '批准只改变它的状态，不写入任何东西'
      : 'Approving only changes its status; nothing is written'
  askCopilotIntentStore.open({
    originPage: 'research-copilot-desk',
    originLabel: `Waiting · ${params.kind}`,
    suggestedPrompt:
      lang === 'zh'
        ? `解释这条待决草稿（${params.kind}，由 ${params.askedBy} 提出）：「${params.title}」。它依据什么？我该不该批准？${effect}。D10 observe-only。`
        : `Explain this pending draft (${params.kind}, asked by ${params.askedBy}): "${params.title}". What is it based on, and should I approve it? ${effect}. D10 observe-only.`,
    snapshot: {
      draft_id: params.id,
      kind: params.kind,
      lands_in: params.landsIn,
      prompt_lang: lang,
    },
  })
  openThread()
  cockpitDrawerStore.getState().setTab('copilot')
}

/**
 * "Walk me through today's digest", tied back to the readings it was written from.
 *
 * The digest's prose is a model's rewrite of lens exhibits, so the prompt asks
 * for each claim to cite one. Two things it says outright because the answer
 * goes wrong without them: a missing reading is a coverage fact, not a verdict
 * to fill in; and a reading fetched now is today's, not the digest's.
 */
export function buildDigestAskPrompt(
  params: { draftId: string; day: string | null; symbols: readonly string[] },
  lang: CopilotPromptLang = readCopilotPromptLang(),
): string {
  const n = params.symbols.length
  const names = params.symbols.join(', ')
  if (lang === 'zh') {
    return (
      `解读 ${params.day ?? '今天'} 的每日 digest（草稿 ${params.draftId}）。它覆盖 ${n} 个标的${n ? `：${names}` : ''}。\n` +
      '逐个说明它的 lens 读数意味着什么，每一句都标出是哪个 lens、as_of 哪天。' +
      '没有读数（missing）是覆盖度事实，不是判定，不要替它补结论。' +
      '若用 research.exhibit.get 补读数，注明那是今天的，并指出与 digest 不同之处。D10 observe-only。'
    )
  }
  return (
    `Walk me through the daily digest for ${params.day ?? 'today'} (draft ${params.draftId}). It covers ${n} name${n === 1 ? '' : 's'}${n ? `: ${names}` : ''}.\n` +
    'For each name, say what its lens readings mean, and cite the lens and its as_of for every claim. ' +
    'A missing reading is a coverage fact, not a verdict — do not fill one in. ' +
    "If you fetch a reading with research.exhibit.get, label it as today's and say where it differs from the digest. D10 observe-only."
  )
}

/** Prefill the Copilot with one day's digest and open the panel — does not auto-send. */
export function openDigestInCopilot(params: {
  draftId: string
  day: string | null
  symbols: readonly string[]
  lang?: CopilotPromptLang
}) {
  const lang = params.lang ?? readCopilotPromptLang()
  askCopilotIntentStore.open({
    originPage: 'research-copilot-desk',
    originLabel: `Digest ${params.day ?? 'today'}`,
    suggestedPrompt: buildDigestAskPrompt(params, lang),
    snapshot: {
      draft_id: params.draftId,
      day: params.day,
      symbols: [...params.symbols],
      prompt_lang: lang,
    },
  })
  openThread()
  cockpitDrawerStore.getState().setTab('copilot')
}

export function openResearchCopilot() {
  openThread()
  cockpitDrawerStore.getState().setTab('copilot')
}

export function openCopilotInbox() {
  openThread()
  cockpitDrawerStore.getState().revealInbox()
}

export function loopPipelinePath(runId: string, opts?: { live?: boolean }): string {
  const q = new URLSearchParams()
  q.set('run', runId)
  if (opts?.live !== false) q.set('live', '1')
  return `/research/loop/harness?${q.toString()}`
}

/** LoopBanner / Harness action labels — English UI (Design 2026-09-15 Q1=A). */
export const loopCopilotUi = {
  discuss: 'Discuss in Copilot',
  discussShort: 'Discuss',
  viewPipeline: 'View run',
  curator: (curating?: boolean) => (curating ? 'Curating…' : 'Curator'),
  inbox: 'Inbox',
  awaitingBanner: (count: number, loading?: boolean) => {
    if (loading) return 'Loading loop runs…'
    return `${count} run${count === 1 ? '' : 's'} awaiting approval`
  },
  review: (open: boolean) => (open ? 'Hide' : 'Review'),
  moreInHarness: (n: number) => `+${n} more in Autopilot`,
} as const
