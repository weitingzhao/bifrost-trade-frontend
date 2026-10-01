/**
 * The Liquid Glass kit as this app receives it (@bifrost/ui 0.9.0, design
 * Rev .132 §17.5). No page uses it yet — the design merges pages back in
 * batches — so this pins the behaviour the pages will rely on.
 */
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { InspectorField, InspectorPanel, TokenSearchField, UndoToast, type SearchToken } from '@bifrost/ui'

const SUGGEST = (q: string) =>
  [
    { kind: 'sym', kindLabel: 'Symbol', value: 'AMD' },
    { kind: 'sym', kindLabel: 'Symbol', value: 'AAPL' },
    { kind: 'contains', kindLabel: 'Contains', value: q },
  ].filter((s) => s.value.toLowerCase().includes(q.toLowerCase()))

function Field({ start = [] as SearchToken[] }) {
  const [tokens, setTokens] = useState<SearchToken[]>(start)
  return (
    <>
      <TokenSearchField tokens={tokens} onChange={setTokens} suggest={SUGGEST} placeholder="Search plans" />
      <output data-testid="tokens">{tokens.map((t) => `${t.kind}:${t.value}`).join(',')}</output>
    </>
  )
}

describe('TokenSearchField', () => {
  it('turns the highlighted suggestion into a token with ↓ and ↩', () => {
    render(<Field />)
    const box = screen.getByRole('combobox')
    fireEvent.change(box, { target: { value: 'a' } })
    expect(screen.getAllByRole('option').length).toBe(3)
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.getByTestId('tokens').textContent).toBe('sym:AAPL')
    expect((box as HTMLInputElement).value).toBe('')
  })

  it('drops the last token on ⌫ with an empty query, and esc clears the text first', () => {
    render(<Field start={[{ kind: 'sym', value: 'AMD' }, { kind: 'sym', value: 'NVDA' }]} />)
    const box = screen.getByRole('combobox')
    fireEvent.keyDown(box, { key: 'Backspace' })
    expect(screen.getByTestId('tokens').textContent).toBe('sym:AMD')
    fireEvent.change(box, { target: { value: 'zz' } })
    fireEvent.keyDown(box, { key: 'Escape' })
    expect((box as HTMLInputElement).value).toBe('')
    expect(screen.getByTestId('tokens').textContent).toBe('sym:AMD')
  })
})

describe('InspectorPanel', () => {
  it('says how to begin when nothing is selected', () => {
    render(<InspectorPanel selection="none" empty="Select a plan to edit it." />)
    expect(screen.getByText('Select a plan to edit it.')).toBeTruthy()
  })

  it('gives a read-only object its reason and its exits, and no save', () => {
    render(
      <InspectorPanel
        selection="single"
        title="TP-0231"
        readOnly={{ reason: 'Intended plans are read-only.', exits: <button type="button">Return to draft</button> }}
      >
        <InspectorField label="Qty">
          <input defaultValue="6" />
        </InspectorField>
      </InspectorPanel>,
    )
    expect(screen.getByRole('note').textContent).toContain('Intended plans are read-only.')
    expect(screen.getByRole('button', { name: 'Return to draft' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull()
  })
})

describe('UndoToast', () => {
  it('undoes on ⌘Z while it is up, and closes itself after five seconds', () => {
    vi.useFakeTimers()
    const undo = vi.fn()
    const close = vi.fn()
    render(<UndoToast open message="Deleted TP-0231" onAction={undo} onClose={close} />)
    expect(screen.getByRole('status').textContent).toContain('Deleted TP-0231')
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
    expect(undo).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(close).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
