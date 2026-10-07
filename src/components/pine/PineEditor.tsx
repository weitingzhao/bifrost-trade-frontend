/**
 * The Pine library's source editor (ledger S12, Owner 2026-10-06): CodeMirror 6
 * with Pine highlighting, line numbers, undo, find, bracket matching — and the
 * problems Research returns (`issues`: line, col, message) marked on their lines
 * with the message on hover. `jumpTo` scrolls a line into view and puts the
 * cursor on it. Loaded only with the Pine library (lazy), so no other page
 * carries CodeMirror.
 */
import { useEffect, useRef } from 'react'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, StreamLanguage, bracketMatching, indentUnit, syntaxHighlighting } from '@codemirror/language'
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { pineStreamParser } from './pineLanguage'

export interface PineIssue {
  line: number
  col: number
  message: string
}

// Colours are the app's own tokens, so both themes follow without a second table.
const pineHighlight = HighlightStyle.define([
  { tag: t.comment, color: 'var(--sk-mute)', fontStyle: 'italic' },
  { tag: t.meta, color: 'var(--sk-mute)' },
  { tag: [t.keyword, t.definitionKeyword], color: 'var(--sk-accent)', fontWeight: '600' },
  { tag: t.typeName, color: 'var(--sk-accent2)' },
  { tag: t.namespace, color: 'var(--sk-state-blue)' },
  { tag: t.propertyName, color: 'var(--sk-state-blue)' },
  { tag: t.function(t.variableName), color: 'var(--sk-state-blue)' },
  { tag: t.special(t.variableName), color: 'var(--sk-series-violet)', fontWeight: '600' },
  { tag: t.string, color: 'var(--sk-state-green)' },
  { tag: [t.number, t.atom], color: 'var(--sk-accent2)' },
  { tag: t.operator, color: 'var(--sk-mute2)' },
])

const frame = EditorView.theme({
  '&': {
    fontSize: '12px',
    backgroundColor: 'color-mix(in srgb, var(--foreground) 4%, transparent)',
    borderRadius: '8px',
    minHeight: '18rem',
  },
  '.cm-scroller': { fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)', lineHeight: '20px' },
  '.cm-content': { caretColor: 'var(--sk-ink)', padding: '8px 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--sk-mute)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--sk-accent) 6%, transparent)' },
  '&.cm-focused': { outline: '1px solid color-mix(in srgb, var(--sk-accent) 45%, transparent)' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--destructive)' },
  '.cm-tooltip': { backgroundColor: 'var(--popover)', color: 'var(--popover-foreground)', border: '1px solid var(--border)' },
})

function diagnostics(state: EditorState, issues: readonly PineIssue[]): Diagnostic[] {
  const doc = state.doc
  return issues
    .filter((i) => i.line >= 1 && i.line <= doc.lines)
    .map((i) => {
      const line = doc.line(i.line)
      const from = Math.min(line.from + Math.max(0, i.col - 1), line.to)
      const to = from < line.to ? line.to : from
      return { from, to, severity: 'error' as const, message: `Line ${i.line}: ${i.message}` }
    })
}

export default function PineEditor({
  value,
  onChange,
  readOnly,
  issues = [],
  jumpTo,
  ariaLabel = 'Pine source',
}: {
  value: string
  onChange?: (next: string) => void
  readOnly: boolean
  issues?: readonly PineIssue[]
  /** A line to scroll to and select; a new object each time, so the same line can be asked twice. */
  jumpTo?: { line: number } | null
  ariaLabel?: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const ro = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          history(),
          bracketMatching(),
          highlightSelectionMatches(),
          indentUnit.of('    '),
          EditorState.tabSize.of(4),
          StreamLanguage.define(pineStreamParser),
          syntaxHighlighting(pineHighlight),
          lintGutter(),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
          frame,
          ro.current.of([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
          EditorView.contentAttributes.of({ 'aria-label': ariaLabel, spellcheck: 'false' }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current?.(u.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = v
    return () => {
      v.destroy()
      view.current = null
    }
    // the view is made once; the effects below follow the props
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const v = view.current
    if (!v || v.state.doc.toString() === value) return
    v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => {
    view.current?.dispatch({
      effects: ro.current.reconfigure([EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)]),
    })
  }, [readOnly])

  useEffect(() => {
    const v = view.current
    if (!v) return
    v.dispatch(setDiagnostics(v.state, diagnostics(v.state, issues)))
  }, [issues, value])

  useEffect(() => {
    const v = view.current
    if (!v || !jumpTo || jumpTo.line < 1 || jumpTo.line > v.state.doc.lines) return
    const line = v.state.doc.line(jumpTo.line)
    v.dispatch({ selection: { anchor: line.from, head: line.to }, effects: EditorView.scrollIntoView(line.from, { y: 'center' }) })
    v.focus()
  }, [jumpTo])

  return <div ref={host} className="min-w-0" data-testid="pine-editor" />
}
