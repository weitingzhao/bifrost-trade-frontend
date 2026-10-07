// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PineEditor from './PineEditor'

const SRC = '//@version=5\nindicator("t")\na = close +\nplotshape(a > 0, "buy")'

describe('PineEditor', () => {
  it('shows the source, read-only when asked', () => {
    const { container } = render(<PineEditor value={SRC} readOnly />)
    const content = container.querySelector('.cm-content') as HTMLElement
    expect(content.textContent).toContain('indicator("t")')
    expect(content.getAttribute('contenteditable')).toBe('false')
    expect(content.getAttribute('aria-label')).toBe('Pine source')
  })

  it('marks the lines Research named, and clears them', async () => {
    const issue = { line: 3, col: 11, message: 'line 3 ends with `+`' }
    const { container, rerender } = render(<PineEditor value={SRC} readOnly={false} issues={[issue]} />)
    await waitFor(() => expect(container.querySelector('.cm-lint-marker-error')).toBeTruthy())
    expect(container.querySelector('.cm-lintRange-error')?.textContent).toBe('+')
    rerender(<PineEditor value={SRC} readOnly={false} issues={[]} />)
    await waitFor(() => expect(container.querySelector('.cm-lint-marker-error')).toBeNull())
  })
})
