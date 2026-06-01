import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import styles from './ledgerStyles'

export interface LedgerSymbolComboboxProps {
  value: string
  onChange: (symbol: string) => void
  suggestions: string[]
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

function filterSuggestions(suggestions: string[], q: string): string[] {
  const t = q.trim().toUpperCase()
  if (!t) return suggestions.slice(0, 60)
  const out: string[] = []
  for (const s of suggestions) {
    const u = s.toUpperCase()
    if (u.startsWith(t) || u.includes(t)) out.push(s)
    if (out.length >= 80) break
  }
  return out
}

export function LedgerSymbolCombobox({
  value,
  onChange,
  suggestions,
  disabled = false,
  'aria-label': ariaLabel = 'Symbol filter',
  className,
}: LedgerSymbolComboboxProps) {
  const reactId = useId()
  const listboxId = `${reactId}-sym-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => filterSuggestions(suggestions, value), [suggestions, value])
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const showList = open && !disabled && filtered.length > 0

  return (
    <div ref={rootRef} className={cn(styles.symbolCombobox, className)}>
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listboxId : undefined}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder="Search symbol…"
        title="Type a prefix (e.g. NV) or pick a symbol from the list"
        className={styles.symbolInput}
        value={value}
        onChange={e => {
          if (disabled) return
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (!disabled) setOpen(true)
        }}
      />
      {showList ? (
        <ul id={listboxId} role="listbox" className={styles.symbolList}>
          {filtered.map(sym => (
            <li
              key={sym}
              role="option"
              aria-selected={value.trim().toUpperCase() === sym.toUpperCase()}
              className={cn(
                styles.symbolOption,
                value.trim().toUpperCase() === sym.toUpperCase() && styles.symbolOptionActive,
              )}
              onMouseDown={e => {
                e.preventDefault()
                onChange(sym)
                close()
              }}
            >
              {sym}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
