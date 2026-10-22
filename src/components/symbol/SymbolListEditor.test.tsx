import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SymbolListEditor } from './SymbolListEditor'

vi.mock('@/hooks/useSymbolPickerUniverse', () => ({
  useSymbolPickerUniverse: () => ({ allSuggestedSymbols: ['AAA', 'QQQ'], watchlistSet: new Set(), holdingsSet: new Set() }),
}))
vi.mock('@/hooks/useSymbolSearch', () => ({
  useSymbolSearch: (query: string) => ({ data: query === 'EXAMPLE' ? [{ symbol: 'BBB', name: 'Example Company' }] : [], isFetching: false, error: null }),
}))
function Fixture({ maxSymbols, disabled = false, addOnly = false }: { maxSymbols?: number; disabled?: boolean; addOnly?: boolean }) {
  const [symbols, setSymbols] = useState(['AAA'])
  return <SymbolListEditor symbols={symbols} onChange={setSymbols} maxSymbols={maxSymbols} disabled={disabled} addOnly={addOnly} />
}
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
})
describe('SymbolListEditor', () => {
  it('keeps selected names while typing, appends a company match and prevents case-insensitive duplicates', () => {
    render(<Fixture />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Example' } })
    expect(screen.getByLabelText('Scope symbols').textContent).toBe('AAA')
    fireEvent.click(screen.getByRole('option', { name: /BBB/ }))
    expect(screen.getByLabelText('Scope symbols').textContent).toBe('AAABBB')
    fireEvent.change(input, { target: { value: 'aaa' } })
    expect(screen.getByRole('option', { name: /AAA/ }).getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Remove BBB from scope' }))
    expect(screen.getByLabelText('Scope symbols').textContent).toBe('AAA')
  })
  it('does not commit unmatched text on blur or Enter', () => {
    render(<Fixture />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'NO_MATCH' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    expect(screen.getByLabelText('Scope symbols').textContent).toBe('AAA')
  })
  it('enforces limits without truncating the existing list', () => {
    render(<Fixture maxSymbols={1} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'qqq' } })
    expect(screen.getByRole('option', { name: /QQQ/ }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByLabelText('Scope symbols').textContent).toBe('AAA')
  })
  it('locks both addition and removal while saving', () => {
    render(<Fixture disabled />)
    expect((screen.getByRole('combobox') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Remove AAA from scope' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('offers duplicate protection without deletion in the watchlist add-only picker', () => {
    render(<Fixture addOnly />)
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'aaa' } })
    expect(screen.getByRole('option', { name: /AAA/ }).getAttribute('aria-disabled')).toBe('true')
  })
})
