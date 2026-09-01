/**
 * Copilot prompt / prefill language — persisted per browser (default zh).
 * Shared by QuickPromptChips, Loop Discuss prefill, and LoopBanner labels.
 */
import { useSyncExternalStore } from 'react'

export type CopilotPromptLang = 'zh' | 'en'

export const COPILOT_PROMPT_LANG_STORAGE_KEY = 'bifrost.copilot.prompt_lang'

export const COPILOT_PROMPT_LANG_CHANGED_EVENT = 'copilot:prompt-lang-changed'

export function readCopilotPromptLang(): CopilotPromptLang {
  if (typeof window === 'undefined') return 'zh'
  try {
    const raw = window.localStorage.getItem(COPILOT_PROMPT_LANG_STORAGE_KEY)
    if (raw === 'en' || raw === 'zh') return raw
  } catch {
    // ignore
  }
  return 'zh'
}

export function writeCopilotPromptLang(lang: CopilotPromptLang) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COPILOT_PROMPT_LANG_STORAGE_KEY, lang)
    window.dispatchEvent(new CustomEvent(COPILOT_PROMPT_LANG_CHANGED_EVENT))
  } catch {
    // ignore
  }
}

function subscribeCopilotPromptLang(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => cb()
  window.addEventListener(COPILOT_PROMPT_LANG_CHANGED_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(COPILOT_PROMPT_LANG_CHANGED_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function useCopilotPromptLang(): [CopilotPromptLang, (lang: CopilotPromptLang) => void] {
  const lang = useSyncExternalStore(
    subscribeCopilotPromptLang,
    () => readCopilotPromptLang(),
    () => 'zh' as CopilotPromptLang,
  )
  return [lang, writeCopilotPromptLang]
}
