import { describe, expect, it } from 'vitest'
import { contractLayer, parseBlueprintContracts, splitDocSections } from './researchDocs'

const DOC = `# Invented doc

Lede line with **bold**.

---

## 1. First (with an aside)

Body one.

### A sub-heading

| id | text |
|---|---|
| C-F1 | one |

## Unnumbered

Body two.
`

describe('splitDocSections', () => {
  it('drops the H1 and the rules, keeps the lede, and numbers each section', () => {
    const d = splitDocSections(DOC, 'x')
    expect(d.lede).toBe('Lede line with **bold**.')
    expect(d.sections.map((s) => [s.n, s.title, s.anchor])).toEqual([
      ['1', 'First (with an aside)', 'x-1'],
      ['2', 'Unnumbered', 'x-2'],
    ])
    // A `###` stays inside its section's body.
    expect(d.sections[0].body).toContain('### A sub-heading')
    expect(d.sections[1].body).toBe('Body two.')
  })
})

describe('blueprint contracts', () => {
  it('reads each C-xx row once and knows its layer', () => {
    const c = parseBlueprintContracts(DOC)
    expect([...c]).toEqual([['C-F1', 'one']])
    expect(contractLayer('C-A7')).toBe('A')
  })
})
