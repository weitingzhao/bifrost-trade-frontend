import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  useCopilotPromptLang,
  type CopilotPromptLang,
} from '@/lib/copilot/promptLang'

/** Compact zh/en toggle — same storage key as QuickPromptChips. */
export function CopilotPromptLangToggle({
  className,
  showLabel = true,
}: {
  className?: string
  showLabel?: boolean
}) {
  const [lang, setLang] = useCopilotPromptLang()

  function pill(active: boolean) {
    return cn(
      'rounded-full px-2 py-0.5 text-dense-caption transition-colors',
      active
        ? 'bg-primary/20 text-primary'
        : 'text-muted-foreground hover:text-foreground',
    )
  }

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 text-dense-caption text-muted-foreground', className)}
      role="group"
      aria-label={lang === 'zh' ? 'Copilot 语言' : 'Copilot language'}
    >
      {showLabel ? <span>{lang === 'zh' ? '语言' : 'Language'}</span> : null}
      <div className="inline-flex rounded-full border border-border/60 bg-secondary p-0.5">
        <LangButton lang="zh" active={lang === 'zh'} onSelect={setLang} className={pill(lang === 'zh')}>
          中文
        </LangButton>
        <LangButton lang="en" active={lang === 'en'} onSelect={setLang} className={pill(lang === 'en')}>
          EN
        </LangButton>
      </div>
    </div>
  )
}

function LangButton({
  lang,
  active,
  onSelect,
  className,
  children,
}: {
  lang: CopilotPromptLang
  active: boolean
  onSelect: (lang: CopilotPromptLang) => void
  className: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lang)}
      className={className}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}
