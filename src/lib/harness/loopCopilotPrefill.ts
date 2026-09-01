import { askCopilotIntentStore } from '@/store/askCopilotIntentStore'
import { cockpitDrawerStore } from '@/hooks/useCockpitDrawer'
import { copilotBubbleStore } from '@/hooks/useCopilotBubble'
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
  const pipelinePath = `/research/loop/runs/${params.runId}`
  const overlay =
    params.runDetail?.outputs?.data_source != null
      ? String(params.runDetail.outputs.data_source)
      : ''

  if (lang === 'zh') {
    return (
      `请审阅 harness run ${params.runId}（objective「${params.title}」）。\n` +
      (funnel ? `${funnel}\n` : '') +
      '总结 candidate 候选、policy_suggestion 与 hit_rate 警告。' +
      'Option 字段缺失时不得当作淘汰理由（option_overlay.required=false 时）。' +
      `白盒 Pipeline：${pipelinePath} 。` +
      'D10 观察模式，请勿涉及实盘发单。'
    )
  }
  return (
    `Review harness run ${params.runId} for objective "${params.title}".\n` +
    (funnel ? `${funnel}\n` : '') +
    `Data source: ${overlay || 'n/a'}. ` +
    'Summarize candidates, policy_suggestion, and hit_rate warnings. ' +
    'Missing option fields must NOT be treated as rejection reasons when option_overlay.required is false. ' +
    `White-box pipeline: ${pipelinePath}. D10 observe-only.`
  )
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
      pipeline_path: `/research/loop/runs/${params.runId}`,
    },
  })
  copilotBubbleStore.getState().open_()
  cockpitDrawerStore.getState().setTab('copilot')
}

export function openResearchCopilot() {
  copilotBubbleStore.getState().open_()
  cockpitDrawerStore.getState().setTab('copilot')
}

export function openCopilotInbox() {
  copilotBubbleStore.getState().open_()
  cockpitDrawerStore.getState().revealInbox()
}

export function loopPipelinePath(runId: string): string {
  return `/research/loop/runs/${encodeURIComponent(runId)}`
}

/** LoopBanner / Harness action labels keyed by prompt language. */
export const loopCopilotUi = {
  discuss: (lang: CopilotPromptLang) =>
    lang === 'zh' ? '在 Copilot 讨论' : 'Discuss in Copilot',
  discussShort: (lang: CopilotPromptLang) => (lang === 'zh' ? '讨论' : 'Discuss'),
  viewPipeline: (lang: CopilotPromptLang) =>
    lang === 'zh' ? '查看 Pipeline' : 'View pipeline',
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
    lang === 'zh' ? `另有 ${n} 条见 Harness Console` : `+${n} more in Harness Console`,
} as const
