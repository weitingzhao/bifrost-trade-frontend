import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { SkipToContent } from './SkipToContent'

afterEach(cleanup)

function withTarget(id = 'main-content') {
  const main = document.createElement('main')
  main.id = id
  main.tabIndex = -1
  document.body.appendChild(main)
  return main
}

describe('SkipToContent', () => {
  it('is reachable by keyboard but hidden until focused', () => {
    render(<SkipToContent />)
    const link = screen.getByRole('link', { name: /skip to content/i })
    // sr-only, not display:none — display:none would take it out of the tab
    // order entirely, which defeats the purpose.
    expect(link.className).toContain('sr-only')
    expect(link.className).toContain('focus-visible:not-sr-only')
  })

  it('points at the landmark the layout names', () => {
    render(<SkipToContent />)
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute(
      'href',
      '#main-content',
    )
  })

  it('moves focus, not just scroll — the next Tab must continue in the content', () => {
    const main = withTarget()
    render(<SkipToContent />)
    screen.getByRole('link', { name: /skip to content/i }).click()
    expect(document.activeElement).toBe(main)
    main.remove()
  })

  it('does nothing rather than throwing when the target is absent', () => {
    render(<SkipToContent targetId="not-here" />)
    expect(() => screen.getByRole('link', { name: /skip to content/i }).click()).not.toThrow()
  })

  it('honours a custom target', () => {
    const el = withTarget('somewhere-else')
    render(<SkipToContent targetId="somewhere-else" />)
    const link = screen.getByRole('link', { name: /skip to content/i })
    expect(link).toHaveAttribute('href', '#somewhere-else')
    link.click()
    expect(document.activeElement).toBe(el)
    el.remove()
  })
})
