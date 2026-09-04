import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

/**
 * `text-dense-*` is a font size. Plain twMerge cannot know that and treats it as
 * a text colour, so it drops whatever colour came before — which is how
 * "Approve all" ended up near-white on the lime accent at 1.24:1.
 */
describe('cn — dense type scale vs colour', () => {
  it('keeps the foreground colour when a dense size follows it', () => {
    const out = cn('bg-primary text-primary-foreground', 'text-dense-micro')
    expect(out).toContain('text-primary-foreground')
    expect(out).toContain('text-dense-micro')
  })

  it('holds for every size in the scale', () => {
    for (const size of ['micro', 'caption', 'meta', 'label', 'body']) {
      const out = cn('text-destructive', `text-dense-${size}`)
      expect(out, size).toContain('text-destructive')
      expect(out, size).toContain(`text-dense-${size}`)
    }
  })

  it('still lets one dense size replace another — they are the same group', () => {
    const out = cn('text-dense-body', 'text-dense-micro')
    expect(out).toBe('text-dense-micro')
  })

  it('still lets a colour replace a colour', () => {
    expect(cn('text-muted-foreground', 'text-warning')).toBe('text-warning')
  })

  it('does not disturb the built-in font sizes', () => {
    expect(cn('text-xs', 'text-lg')).toBe('text-lg')
    expect(cn('text-lg text-primary-foreground', 'text-dense-meta')).toContain(
      'text-primary-foreground',
    )
  })
})
