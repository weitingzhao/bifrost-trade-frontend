import {
  BarChart3,
  ClipboardList,
  Compass,
  LineChart,
  Radar,
  RefreshCw,
  ShieldQuestion,
  Sliders,
  Sparkles,
  Sunrise,
  Sunset,
  TrendingUp,
} from 'lucide-react'
import { useState, type ComponentType, type SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { CopilotPromptLangToggle } from '@/components/cockpit/CopilotPromptLangToggle'
import {
  useCopilotPromptLang,
  type CopilotPromptLang,
} from '@/lib/copilot/promptLang'
import { SEAT_META, useResearchSeat, type ResearchSeat } from '@/lib/research/seat'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export type QuickPromptLang = CopilotPromptLang

type LocalizedPrompt = {
  id: string
  Icon: Icon
  label: { zh: string; en: string }
  prompt: { zh: string; en: string }
  /**
   * The postures this starter belongs to. A question is not equally good in
   * every seat: "why was this proposed" only makes sense where something
   * proposes, and "read this page for me" only where the Owner opens pages.
   * Omitted = it fits anywhere and lives behind the fold.
   */
  seats?: ResearchSeat[]
}

/**
 * Common conversation starters — surfaced above the composer when the chat is
 * empty. Bilingual (default zh) so a Chinese-first trader can trigger a
 * pre-market brief in one click; specialist agents accept both languages.
 */
const PROMPTS: LocalizedPrompt[] = [
  {
    id: 'premarket',
    seats: ['copilot'],
    Icon: Sunrise,
    label: { zh: '盘前简报', en: 'Pre-market brief' },
    prompt: {
      zh: '给我一份盘前简报：昨夜市场变化、今日重要宏观事件，以及它们对我当前持仓和 watchlist 的影响。请注明使用的工具。',
      en: 'Give me a pre-market brief: overnight news, macro events today, and how they affect my current portfolio and watchlist. Cite the tools you used.',
    },
  },
  {
    id: 'postmarket',
    seats: ['copilot'],
    Icon: Sunset,
    label: { zh: '盘后复盘', en: 'Post-market recap' },
    prompt: {
      zh: '盘后复盘：今日市场关键动向、我组合的显著变化，以及值得为明日记录的假设。',
      en: 'Post-market recap: key market moves today, notable changes in my portfolio, and any hypotheses worth logging for tomorrow.',
    },
  },
  {
    id: 'portfolio-risk',
    seats: ['copilot', 'workbench'],
    Icon: BarChart3,
    label: { zh: '持仓风险', en: 'Portfolio risk' },
    prompt: {
      zh: '分析我当前持仓的风险暴露：集中度、净 delta/vega、各标的 IV，以及任何需要减仓或对冲的头寸。',
      en: 'Analyze my current portfolio risk exposure — concentration, delta/vega net, IV of my names, and any positions worth trimming or hedging.',
    },
  },
  {
    id: 'vol-overview',
    seats: ['workbench'],
    Icon: LineChart,
    label: { zh: '波动率关注', en: 'Volatility watch' },
    prompt: {
      zh: '给出我 watchlist 和持仓标的的波动率概览：IV rank、期限结构异常，以及值得探索的事件驱动波动率交易。',
      en: 'Volatility overview for my watchlist and portfolio names: IV rank, term-structure anomalies, and event-driven vol trades worth exploring.',
    },
  },
  {
    id: 'sepa',
    seats: ['workbench'],
    Icon: TrendingUp,
    label: { zh: 'SEPA 候选', en: 'SEPA candidates' },
    prompt: {
      zh: '给我今日 SEPA 筛选器中动量最强的候选，并交叉验证我目前活跃的假设。',
      en: "Show me today's top SEPA screener candidates with strong momentum, and cross-check with the latest hypotheses I have active.",
    },
  },
  {
    id: 'event-radar',
    seats: ['copilot'],
    Icon: Radar,
    label: { zh: '事件雷达', en: 'Event radar' },
    prompt: {
      zh: '未来 5 个交易日有哪些财报、宏观事件或异常资金流信号值得关注 —— 尤其是与我持仓相关的？',
      en: 'Any earnings, macro events, or unusual flow signals I should watch in the next 5 trading days — especially anything touching my portfolio.',
    },
  },
  {
    id: 'hypotheses',
    seats: ['copilot', 'autopilot'],
    Icon: ClipboardList,
    label: { zh: '活跃假设', en: 'Active hypotheses' },
    prompt: {
      zh: '总结我目前活跃的假设、当前市场背景，以及下一步的验证步骤。',
      en: 'Summarize my active hypotheses, their current market backdrop, and next validation steps.',
    },
  },
  {
    // Surfaces the trade.strategy.gate_safety tool added in program
    // research-copilot-reach P5 — entry gating was previously unaskable.
    id: 'gates',
    seats: ['workbench'],
    Icon: ShieldQuestion,
    label: { zh: '开仓门控', en: 'Entry gates' },
    prompt: {
      zh: '当前的 safety gate 配置是什么？结合我的持仓和策略实例说明：现在有什么在阻止开仓？（D10 冻结中，仅需观察说明）',
      en: 'What is the current safety gate configuration? Combined with my positions and strategy instances, explain what is currently blocking entries. (D10 frozen — observation only.)',
    },
  },
  {
    id: 'loop-scan-review',
    seats: ['autopilot'],
    Icon: RefreshCw,
    label: { zh: 'Loop scan 解读', en: 'Loop scan review' },
    prompt: {
      zh: '解读最新 harness scan / candidate_batch 结果：说明 composite score、hit_rate 门槛，以及哪些候选值得进一步研究。（D10 观察）',
      en: 'Review the latest harness scan / candidate_batch output: explain composite score and hit_rate gates, and which candidates merit deeper research. (D10 observe-only.)',
    },
  },
  {
    id: 'loop-curator-brief',
    seats: ['autopilot'],
    Icon: ClipboardList,
    label: { zh: 'Loop Curator 摘要', en: 'Loop curator brief' },
    prompt: {
      zh: '以 loop_curator 视角总结今日 awaiting approval 的 harness 候选与 policy 建议，并指出 hit_rate 警告。（D10 观察）',
      en: 'As loop_curator, summarize today\'s awaiting-approval harness candidates and policy suggestions, including any hit_rate warnings. (D10 observe-only.)',
    },
  },
  {
    id: 'rating-why',
    Icon: Sparkles,
    label: { zh: '这批候选为什么这样评', en: 'Why these ratings' },
    prompt: {
      zh: '解释最近一次 harness run 的评级：每个候选的 grade、conviction 星级、action 与买入区间是怎么得出的，哪些是被 judge 分歧或 validate 挡住的。（D10 观察）',
      en: 'Explain the ratings from the latest harness run: how each candidate got its grade, conviction stars, action and buy zone, and which ones the judges split on or validate blocked. (D10 observe-only.)',
    },
    seats: ['autopilot'],
  },
  {
    id: 'policy-tune',
    Icon: Sliders,
    label: { zh: 'Policy 该调什么', en: 'What to tune' },
    prompt: {
      zh: '看我的 objective 的结清命中率和最近几次 run，policy 里哪一个旋钮最值得调整？给出理由和建议值，我会走 propose → approve。（D10 观察）',
      en: 'Given my objectives’ settled hit rates and the last few runs, which policy knob is most worth changing? Give the reason and a value; I will take it through propose → approve. (D10 observe-only.)',
    },
    seats: ['autopilot'],
  },
  {
    id: 'symbol-tour',
    Icon: Compass,
    label: { zh: '标的全景', en: 'One symbol, every lens' },
    prompt: {
      zh: '把当前 context 里的标的过一遍所有 lens：SEPA 阶段、IV rank 与 VRP、skew、期限结构、dealer levels、近期事件。每条给出读数、band 和它意味着什么。',
      en: 'Take the symbol in my current context through every lens: SEPA stage, IV rank and VRP, skew, term structure, dealer levels, recent events. For each give the reading, its band, and what it means.',
    },
    seats: ['workbench'],
  },
]

interface Props {
  onPick: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function QuickPromptChips({ onPick, disabled, className }: Props) {
  const [lang] = useCopilotPromptLang()
  const seat = useResearchSeat()
  const [showAll, setShowAll] = useState(false)

  // Ten chips is a wall, and most of them are wrong for what the Owner is
  // doing right now. The seat says which handful to lead with; the rest stay
  // one click away rather than gone.
  const forSeat = PROMPTS.filter((p) => p.seats?.includes(seat))
  const rest = PROMPTS.filter((p) => !p.seats?.includes(seat))
  const shown = showAll ? [...forSeat, ...rest] : forSeat.length > 0 ? forSeat : PROMPTS

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <CopilotPromptLangToggle className="justify-center" />
      <div
        className="flex flex-wrap justify-center gap-1"
        aria-label={lang === 'zh' ? '推荐提示词' : 'Suggested prompts'}
      >
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(p.prompt[lang])}
            title={p.prompt[lang]}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
              'text-dense-caption text-primary',
              'border border-primary/25 bg-primary/[0.06]',
              'transition-colors hover:border-primary/40 hover:bg-primary/15',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            )}
          >
            <p.Icon className="size-3" aria-hidden />
            {p.label[lang]}
          </button>
        ))}
      </div>
      {forSeat.length > 0 && rest.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mx-auto text-dense-caption text-muted-foreground hover:text-foreground hover:underline"
          title={
            lang === 'zh'
              ? `按 ${SEAT_META[seat].label} 视角排序；其余提示词仍可展开`
              : `Ordered for the ${SEAT_META[seat].label} seat; the rest are still here`
          }
        >
          {showAll
            ? lang === 'zh'
              ? '只看当前视角'
              : 'Just this seat'
            : lang === 'zh'
              ? `其余 ${rest.length} 条`
              : `${rest.length} more`}
        </button>
      ) : null}
    </div>
  )
}
