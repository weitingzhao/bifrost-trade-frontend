/**
 * The questions the Copilot can answer about the book, and the tools each one
 * is expected to reach.
 *
 * Level 2 on the Trade side has been real for a while — ten read-only
 * `trade.*` tools and a portfolio persona — and completely invisible: the only
 * way to use it was to already know what to type. These are that capability
 * written down as questions, in the Owner's language, each naming its sources
 * so an answer can be checked against where it came from.
 *
 * Every tool here is a read. D10 freezes execution: the Copilot may describe
 * the book and may not touch it, and no prompt in this file asks it to.
 */
import type { CopilotPromptLang } from '@/lib/copilot/promptLang'

export type TradeQuestionGroup = 'positions' | 'gates' | 'executions' | 'strategy'

export interface TradeQuestion {
  id: string
  group: TradeQuestionGroup
  label: Record<CopilotPromptLang, string>
  prompt: Record<CopilotPromptLang, string>
  /** Tool names this question should reach — checked against the live registry. */
  tools: string[]
}

export const TRADE_QUESTION_GROUPS: {
  id: TradeQuestionGroup
  label: Record<CopilotPromptLang, string>
  lead: Record<CopilotPromptLang, string>
}[] = [
  {
    id: 'positions',
    label: { zh: '持仓与风险', en: 'Positions & risk' },
    lead: {
      zh: '我现在持有什么，风险集中在哪里。',
      en: 'What I am holding, and where the risk sits.',
    },
  },
  {
    id: 'gates',
    label: { zh: '门控与开仓', en: 'Gates & entries' },
    lead: {
      zh: '什么在挡着开仓，为什么这么设。',
      en: 'What is blocking entries, and why it is set that way.',
    },
  },
  {
    id: 'executions',
    label: { zh: '成交与绩效', en: 'Executions & performance' },
    lead: {
      zh: '最近成交了什么，赚在哪里亏在哪里。',
      en: 'What traded lately, and where it made or lost money.',
    },
  },
  {
    id: 'strategy',
    label: { zh: '策略与机会', en: 'Strategy & opportunities' },
    lead: {
      zh: '实例在做什么，还有哪些机会等着。',
      en: 'What the instances are doing, and what is queued.',
    },
  },
]

export const TRADE_QUESTIONS: TradeQuestion[] = [
  {
    id: 'holding-now',
    group: 'positions',
    label: { zh: '我现在持有什么', en: 'What am I holding' },
    prompt: {
      zh: '把我当前的持仓讲清楚：每个账户的股票和期权仓位、名义敞口、未实现盈亏，以及最大的三个集中点。用中文，数字带单位。',
      en: 'Walk me through what I am holding right now: stock and option positions per account, notional exposure, unrealized P&L, and the three biggest concentrations.',
    },
    tools: ['trade.portfolio.snapshot', 'trade.portfolio.risk_summary'],
  },
  {
    id: 'risk-where',
    group: 'positions',
    label: { zh: '风险集中在哪', en: 'Where the risk is' },
    prompt: {
      zh: '我的组合风险集中在哪里？按标的和按策略各说一遍：集中度、净 delta/vega、哪几个仓位贡献了大部分风险，以及任何值得减仓或对冲的地方。（D10 冻结中，只要判断不要下单）',
      en: 'Where is my portfolio risk concentrated? By symbol and by strategy: concentration, net delta and vega, which positions carry most of it, and anything worth trimming or hedging. (D10 frozen — judgement only, no orders.)',
    },
    tools: ['trade.portfolio.risk_summary', 'trade.trading.position_attribution'],
  },
  {
    id: 'attribution',
    group: 'positions',
    label: { zh: '哪些仓位在赚钱', en: 'What is carrying the book' },
    prompt: {
      zh: '按持仓归因说明：哪些标的和结构在赚钱、哪些在亏，各占多少，以及是方向、时间价值还是波动率在起作用。',
      en: 'Break the book down by attribution: which names and structures are making money, which are losing, how much each, and whether it is direction, theta or vol doing the work.',
    },
    tools: ['trade.trading.position_attribution', 'trade.portfolio.snapshot'],
  },
  {
    id: 'gates-blocking',
    group: 'gates',
    label: { zh: '现在什么在挡着开仓', en: 'What is blocking entries' },
    prompt: {
      zh: '结合当前的 safety gate 配置和我的持仓、策略实例说明：现在有什么在阻止开仓？逐条列出被触发的 gate、它的阈值和当前读数。（D10 冻结中，仅需说明）',
      en: 'Given the current safety gate configuration, my positions and my strategy instances, what is blocking entries right now? List each triggered gate, its threshold, and the current reading. (D10 frozen — explanation only.)',
    },
    tools: ['trade.strategy.gate_safety', 'trade.strategy.instances', 'trade.portfolio.snapshot'],
  },
  {
    id: 'gates-why',
    group: 'gates',
    label: { zh: '这些门为什么这么设', en: 'Why the gates are set this way' },
    prompt: {
      zh: '逐个解释我的 safety gate：每一维（direction / structure / coverage / risk / volatility / time）现在的设置是什么，它防的是哪一类损失，以及和我实际成交记录相比是不是太松或太紧。',
      en: 'Explain my safety gates one dimension at a time — direction, structure, coverage, risk, volatility, time: what each is set to, which loss it is there to prevent, and whether my actual execution record says it is too loose or too tight.',
    },
    tools: ['trade.strategy.gate_safety', 'trade.trading.recent_executions'],
  },
  {
    id: 'recent-fills',
    group: 'executions',
    label: { zh: '最近成交了什么', en: 'Explain recent fills' },
    prompt: {
      zh: '把最近 7 天的成交讲一遍：每一笔是开仓还是平仓、属于哪个结构、价格相对当时的市场如何，以及连起来看我这周实际在做什么。',
      en: 'Walk me through the last seven days of executions: opening or closing, which structure each belongs to, how the price sat against the market at the time, and what they add up to as a week.',
    },
    tools: ['trade.trading.recent_executions', 'trade.portfolio.snapshot'],
  },
  {
    id: 'performance',
    group: 'executions',
    label: { zh: '这段时间表现如何', en: 'How performance reads' },
    prompt: {
      zh: '我的绩效怎么读？按周期给出已实现和未实现的分解，指出主要贡献者，并说明哪些是运气哪些是可重复的。',
      en: 'How does my performance read? Break realized and unrealized down by period, name the main contributors, and say which of it looks repeatable and which looks like luck.',
    },
    tools: ['trade.trading.performance', 'trade.trading.position_attribution'],
  },
  {
    id: 'instances',
    group: 'strategy',
    label: { zh: '实例都在做什么', en: 'What the instances are doing' },
    prompt: {
      zh: '我的策略实例现在都处于什么状态？各自持有什么、离目标或止损多远、有没有需要我处理的。',
      en: 'What state are my strategy instances in? What each holds, how far it sits from its target or stop, and whether any of them needs me.',
    },
    tools: ['trade.strategy.instances', 'trade.portfolio.snapshot'],
  },
  {
    id: 'opportunities',
    group: 'strategy',
    label: { zh: '还有哪些机会等着', en: 'What is queued' },
    prompt: {
      zh: '当前活跃的机会有哪些？各自的入场条件是什么、现在离触发有多远，以及和我已有持仓是不是重复暴露。',
      en: 'Which opportunities are active? Their entry conditions, how far each is from triggering, and whether any of them doubles an exposure I already hold.',
    },
    tools: ['trade.strategy.opportunities', 'trade.portfolio.snapshot'],
  },
]

export function questionsFor(group: TradeQuestionGroup): TradeQuestion[] {
  return TRADE_QUESTIONS.filter((q) => q.group === group)
}

/** Every tool the question set claims — what the page checks the registry against. */
export function referencedTools(): string[] {
  return [...new Set(TRADE_QUESTIONS.flatMap((q) => q.tools))].sort()
}
