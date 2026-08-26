import {
  BarChart3,
  ClipboardList,
  LineChart,
  Radar,
  Sunrise,
  Sunset,
  TrendingUp,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export type QuickPromptLang = 'zh' | 'en'

type LocalizedPrompt = {
  id: string
  Icon: Icon
  label: { zh: string; en: string }
  prompt: { zh: string; en: string }
}

/**
 * Common conversation starters — surfaced above the composer when the chat is
 * empty. Bilingual (default zh) so a Chinese-first trader can trigger a
 * pre-market brief in one click; specialist agents accept both languages.
 */
const PROMPTS: LocalizedPrompt[] = [
  {
    id: 'premarket',
    Icon: Sunrise,
    label: { zh: '盘前简报', en: 'Pre-market brief' },
    prompt: {
      zh: '给我一份盘前简报：昨夜市场变化、今日重要宏观事件，以及它们对我当前持仓和 watchlist 的影响。请注明使用的工具。',
      en: 'Give me a pre-market brief: overnight news, macro events today, and how they affect my current portfolio and watchlist. Cite the tools you used.',
    },
  },
  {
    id: 'postmarket',
    Icon: Sunset,
    label: { zh: '盘后复盘', en: 'Post-market recap' },
    prompt: {
      zh: '盘后复盘：今日市场关键动向、我组合的显著变化，以及值得为明日记录的假设。',
      en: 'Post-market recap: key market moves today, notable changes in my portfolio, and any hypotheses worth logging for tomorrow.',
    },
  },
  {
    id: 'portfolio-risk',
    Icon: BarChart3,
    label: { zh: '持仓风险', en: 'Portfolio risk' },
    prompt: {
      zh: '分析我当前持仓的风险暴露：集中度、净 delta/vega、各标的 IV，以及任何需要减仓或对冲的头寸。',
      en: 'Analyze my current portfolio risk exposure — concentration, delta/vega net, IV of my names, and any positions worth trimming or hedging.',
    },
  },
  {
    id: 'vol-overview',
    Icon: LineChart,
    label: { zh: '波动率关注', en: 'Volatility watch' },
    prompt: {
      zh: '给出我 watchlist 和持仓标的的波动率概览：IV rank、期限结构异常，以及值得探索的事件驱动波动率交易。',
      en: 'Volatility overview for my watchlist and portfolio names: IV rank, term-structure anomalies, and event-driven vol trades worth exploring.',
    },
  },
  {
    id: 'sepa',
    Icon: TrendingUp,
    label: { zh: 'SEPA 候选', en: 'SEPA candidates' },
    prompt: {
      zh: '给我今日 SEPA 筛选器中动量最强的候选，并交叉验证我目前活跃的假设。',
      en: "Show me today's top SEPA screener candidates with strong momentum, and cross-check with the latest hypotheses I have active.",
    },
  },
  {
    id: 'event-radar',
    Icon: Radar,
    label: { zh: '事件雷达', en: 'Event radar' },
    prompt: {
      zh: '未来 5 个交易日有哪些财报、宏观事件或异常资金流信号值得关注 —— 尤其是与我持仓相关的？',
      en: 'Any earnings, macro events, or unusual flow signals I should watch in the next 5 trading days — especially anything touching my portfolio.',
    },
  },
  {
    id: 'hypotheses',
    Icon: ClipboardList,
    label: { zh: '活跃假设', en: 'Active hypotheses' },
    prompt: {
      zh: '总结我目前活跃的假设、当前市场背景，以及下一步的验证步骤。',
      en: 'Summarize my active hypotheses, their current market backdrop, and next validation steps.',
    },
  },
]

// Language preference — persisted per-browser.
const LANG_STORAGE_KEY = 'bifrost.copilot.prompt_lang'

function readStoredLang(): QuickPromptLang {
  if (typeof window === 'undefined') return 'zh'
  try {
    const raw = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (raw === 'en' || raw === 'zh') return raw
  } catch {
    // ignore
  }
  return 'zh'
}

function writeStoredLang(lang: QuickPromptLang) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang)
    window.dispatchEvent(new CustomEvent('copilot:prompt-lang-changed'))
  } catch {
    // ignore
  }
}

function subscribeLang(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener('copilot:prompt-lang-changed', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('copilot:prompt-lang-changed', handler)
    window.removeEventListener('storage', handler)
  }
}

function useQuickPromptLang(): [QuickPromptLang, (l: QuickPromptLang) => void] {
  const lang = useSyncExternalStore(
    subscribeLang,
    () => readStoredLang(),
    () => 'zh' as QuickPromptLang,
  )
  return [lang, writeStoredLang]
}

interface Props {
  onPick: (prompt: string) => void
  disabled?: boolean
  className?: string
}

export function QuickPromptChips({ onPick, disabled, className }: Props) {
  const [lang, setLang] = useQuickPromptLang()

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-center gap-2 text-dense-caption text-muted-foreground">
        <span>{lang === 'zh' ? '语言' : 'Language'}</span>
        <div className="inline-flex rounded-full border border-border/60 bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => setLang('zh')}
            className={cn(
              'rounded-full px-2 py-0.5 text-dense-caption transition-colors',
              lang === 'zh'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={lang === 'zh'}
          >
            中文
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={cn(
              'rounded-full px-2 py-0.5 text-dense-caption transition-colors',
              lang === 'en'
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={lang === 'en'}
          >
            EN
          </button>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-1 justify-center"
        aria-label={lang === 'zh' ? '推荐提示词' : 'Suggested prompts'}
      >
        {PROMPTS.map((p) => (
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
              'transition-colors hover:bg-primary/15 hover:border-primary/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            )}
          >
            <p.Icon className="size-3" aria-hidden />
            {p.label[lang]}
          </button>
        ))}
      </div>
    </div>
  )
}
