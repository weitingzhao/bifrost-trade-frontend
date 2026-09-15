import {
  BarChart3,
  ClipboardList,
  Compass,
  LineChart,
  RefreshCw,
  ShieldQuestion,
  Sliders,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { CopilotPromptLangToggle } from '@/components/cockpit/CopilotPromptLangToggle'
import {
  useCopilotPromptLang,
  type CopilotPromptLang,
} from '@/lib/copilot/promptLang'
import {
  starterGroupOrder,
  starterToolCaption,
  type StarterGroupId,
} from '@/lib/copilot/starterGroupOrder'
import {
  TRADE_QUESTIONS,
  type TradeQuestionGroup,
} from '@/lib/copilot/tradePrompts'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export type QuickPromptLang = CopilotPromptLang

/**
 * The empty state's three groups (§11.2.7): what the panel can do with the
 * page you are on, with your book, and with the loop's output. The starters
 * used to be filtered by seat, but the Copilot is not a seat any more (Owner
 * 2026-09-14, §11.0) — the panel opens on any page, so the question is what
 * you are asking about, not which posture you sat in.
 */
type StarterGroup = StarterGroupId

type LocalizedPrompt = {
  id: string
  Icon: Icon
  label: { zh: string; en: string }
  prompt: { zh: string; en: string }
  group: StarterGroup
  /** Tool names this starter should reach. Omitted when we do not know. */
  tools?: string[]
}

const BOOK_GROUP_ICON: Record<TradeQuestionGroup, Icon> = {
  positions: BarChart3,
  gates: ShieldQuestion,
  executions: LineChart,
  strategy: TrendingUp,
}

/** Same catalogue as `/research/copilot/trading` — not a second set of questions. */
const BOOK_PROMPTS: LocalizedPrompt[] = TRADE_QUESTIONS.map((q) => ({
  id: q.id,
  group: 'book',
  Icon: BOOK_GROUP_ICON[q.group],
  label: q.label,
  prompt: q.prompt,
  tools: q.tools,
}))

/**
 * This page / The loop stay panel-local. The book is TRADE_QUESTIONS so the
 * empty state and the Trading Copilot page cannot drift.
 */
const PROMPTS: LocalizedPrompt[] = [
  ...BOOK_PROMPTS,
  {
    id: 'hypotheses',
    group: 'loop',
    Icon: ClipboardList,
    label: { zh: '活跃假设', en: 'Active hypotheses' },
    prompt: {
      zh: '总结我目前活跃的假设、当前市场背景，以及下一步的验证步骤。',
      en: 'Summarize my active hypotheses, their current market backdrop, and next validation steps.',
    },
  },
  {
    id: 'loop-scan-review',
    group: 'loop',
    Icon: RefreshCw,
    label: { zh: 'Loop scan 解读', en: 'Loop scan review' },
    prompt: {
      zh: '解读最新 harness scan / candidate_batch 结果：说明 composite score、hit_rate 门槛，以及哪些候选值得进一步研究。（D10 观察）',
      en: 'Review the latest harness scan / candidate_batch output: explain composite score and hit_rate gates, and which candidates merit deeper research. (D10 observe-only.)',
    },
  },
  {
    id: 'loop-curator-brief',
    group: 'loop',
    Icon: ClipboardList,
    label: { zh: 'Loop Curator 摘要', en: 'Loop curator brief' },
    prompt: {
      zh: '以 loop_curator 视角总结今日 awaiting approval 的 harness 候选与 policy 建议，并指出 hit_rate 警告。（D10 观察）',
      en: 'As loop_curator, summarize today\'s awaiting-approval harness candidates and policy suggestions, including any hit_rate warnings. (D10 observe-only.)',
    },
  },
  {
    id: 'rating-why',
    group: 'loop',
    Icon: Sparkles,
    label: { zh: '这批候选为什么这样评', en: 'Why these ratings' },
    prompt: {
      zh: '解释最近一次 harness run 的评级：每个候选的 grade、conviction 星级、action 与买入区间是怎么得出的，哪些是被 judge 分歧或 validate 挡住的。（D10 观察）',
      en: 'Explain the ratings from the latest harness run: how each candidate got its grade, conviction stars, action and buy zone, and which ones the judges split on or validate blocked. (D10 observe-only.)',
    },
  },
  {
    id: 'policy-tune',
    group: 'loop',
    Icon: Sliders,
    label: { zh: 'Policy 该调什么', en: 'What to tune' },
    prompt: {
      zh: '看我的 objective 的结清命中率和最近几次 run，policy 里哪一个旋钮最值得调整？给出理由和建议值，我会走 propose → approve。（D10 观察）',
      en: 'Given my objectives’ settled hit rates and the last few runs, which policy knob is most worth changing? Give the reason and a value; I will take it through propose → approve. (D10 observe-only.)',
    },
  },
  {
    id: 'symbol-tour',
    group: 'page',
    Icon: Compass,
    label: { zh: '标的全景', en: 'One symbol, every lens' },
    prompt: {
      zh: '把当前 context 里的标的过一遍所有 lens：SEPA 阶段、IV rank 与 VRP、skew、期限结构、dealer levels、近期事件。每条给出读数、band 和它意味着什么。',
      en: 'Take the symbol in my current context through every lens: SEPA stage, IV rank and VRP, skew, term structure, dealer levels, recent events. For each give the reading, its band, and what it means.',
    },
  },
]

/**
 * Group order and headers. "The book" heads to the Trading Copilot's full
 * prompt catalogue — that page left the menu (Design 2026-09-14 ①), and this
 * link is how it stays reachable.
 */
const STARTER_GROUP_LABEL: Record<StarterGroup, string> = {
  page: 'This page',
  book: 'The book',
  loop: 'The loop',
}

interface Props {
  onPick: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function QuickPromptChips({ onPick, disabled, className }: Props) {
  const [lang] = useCopilotPromptLang()
  const { pathname } = useLocation()
  const groups = starterGroupOrder(pathname)

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <CopilotPromptLangToggle />
      {groups.map((id) => {
        const label = STARTER_GROUP_LABEL[id]
        return (
          <div key={id} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2 text-dense-micro uppercase tracking-wide text-muted-foreground">
              <span>{label}</span>
              {id === 'book' ? (
                <Link
                  to="/research/copilot/trading"
                  className="normal-case tracking-normal text-primary hover:underline"
                  title="The full prompt catalogue for the book"
                >
                  all starters →
                </Link>
              ) : null}
            </div>
            <div
              className="flex flex-col gap-0.5"
              aria-label={label}
              data-starter-group={id}
            >
              {PROMPTS.filter((p) => p.group === id).map((p) => {
                const tools = starterToolCaption(p.tools)
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onPick(p.prompt[lang])}
                    title={p.prompt[lang]}
                    className={cn(
                      'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left',
                      'text-dense-caption text-foreground',
                      'transition-colors hover:bg-secondary/80',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    )}
                  >
                    <p.Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{p.label[lang]}</span>
                    {tools ? (
                      <span className="max-w-[9rem] shrink-0 truncate font-mono text-dense-caption leading-none text-muted-foreground">
                        {tools}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
