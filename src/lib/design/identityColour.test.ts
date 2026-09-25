/**
 * The identity-colour ratchet (DESIGN_CONTRACTS §14.8), held on this side.
 *
 * Once themes come in pairs, a bare hex is a colour that does not flip: the
 * same ticker renders lime on one page and a different lime on paper, and a
 * 12% green wash written with dark-theme channels vanishes on grey paper. The
 * design audits its prototypes with one rule; this is the same rule over the
 * app's source, so the scan that took light out of preview on 2026-09-23 keeps
 * holding without anyone re-running it.
 *
 * Written as the design writes it: the five entity/accent hexes may appear
 * only as a `var(--…, #hex)` fallback, and tint fills and hairlines go through
 * `rgb(var(--…-rgb) / α)` or `color-mix(… var(--sk-ink) …)`. Black shadows
 * and scrims, lamps, module hues and category chart palettes are exempt, as
 * they are in the design.
 *
 * Since Rev .31 the values themselves belong to `@bifrost/ui`, and the
 * registry's `DIRECTION` is a mirror that must match it. The second half
 * holds that mirror (frozen by `scripts/design-nav-snapshot.mjs`) to the
 * package, keeps the app from declaring a copy of its own (it imports
 * `@bifrost/ui/styles/semantic`, 0.4.14), and holds the -rgb tint triplets
 * the app does keep to the channels of the package's hexes.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DESIGN_INKS, DESIGN_RAMP } from './designInks.generated'

const SRC = join(__dirname, '..', '..')

/** Files that define the tokens, or quote colours as documentation. */
const EXEMPT = [
  'index.css', // the token source — the one place hexes belong
  'layout/designNotes/', // walk notes quote the colours they describe
  'lib/design/designInks.generated.ts', // the registry's mirror, frozen — held to the package below
  'pages/docs/optionsKit/kitInventory.ts', // the kit's own swatch catalogue
  'lib/cockpit/exportSerializer.ts', // a standalone export with its own stylesheet
]

const RULES: { name: string; re: RegExp }[] = [
  // An entity or accent hex that is not a var() fallback.
  { name: 'bare entity/accent hex', re: /(?<!var\(--[a-z0-9-]+,\s*)#(?:a3e635|7dd3fc|38bdf8|c084fc|a78bfa)\b/gi },
  // Direction and entity tints written with dark-theme channels.
  { name: 'dark tint triplet', re: /rgba?\(\s*(?:74,\s*222,\s*128|248,\s*113,\s*113|163,\s*230,\s*53|56,\s*189,\s*248|192,\s*132,\s*252)\b/g },
  // White hairlines and highlights: invisible on paper.
  { name: 'white hairline', re: /rgba?\(\s*255,\s*255,\s*255\b/g },
]

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...sourceFiles(p))
    else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p)
  }
  return out
}

describe('§14.8 identity-colour ratchet', () => {
  const files = sourceFiles(SRC).filter((f) => !EXEMPT.some((x) => relative(SRC, f).startsWith(x)))

  it('reads enough of the tree to mean something', () => {
    expect(files.length).toBeGreaterThan(300)
  })

  for (const rule of RULES) {
    it(`finds no ${rule.name} outside the token file`, () => {
      const hits: string[] = []
      for (const f of files) {
        const text = readFileSync(f, 'utf8')
        const lines = text.split('\n')
        lines.forEach((line, i) => {
          rule.re.lastIndex = 0
          if (rule.re.test(line)) hits.push(`${relative(SRC, f)}:${i + 1}`)
        })
      }
      expect(hits).toEqual([])
    })
  }

  it('still catches what it is for', () => {
    const [hex, tint, white] = RULES.map((r) => r.re)
    const hit = (re: RegExp, s: string) => {
      re.lastIndex = 0
      return re.test(s)
    }
    expect(hit(hex, "dotClass='bg-[#38bdf8]'")).toBe(true)
    expect(hit(hex, 'stroke="var(--color-link, #7dd3fc)"')).toBe(false)
    expect(hit(tint, "'rgba(74,222,128,0.14)'")).toBe(true)
    expect(hit(white, 'border: 1px solid rgba(255, 255, 255, 0.08);')).toBe(true)
  })
})

type Theme = keyof typeof DESIGN_INKS
type Ink = keyof (typeof DESIGN_INKS)['dark']

/** The mirror's keys, by the token each one is in the package. */
const TOKEN: Record<Ink, string> = {
  accent: '--sk-accent',
  profit: '--color-profit',
  loss: '--color-loss',
  unrealized: '--color-unrealized',
  ticker: '--sk-ticker',
  contract: '--sk-contract',
  instance: '--sk-instance',
}
const INKS = Object.keys(TOKEN) as Ink[]
const THEMES = Object.keys(DESIGN_INKS) as Theme[]

/** Custom properties declared in the first top-level rule whose selector list is exactly `selectors`. */
function declared(css: string, selectors: string[]): Map<string, string> {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const want = [...selectors].sort().join('|')
  for (const m of flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1]
      .split(',')
      .map((s) => s.trim().replace(/"/g, "'"))
      .sort()
      .join('|')
    if (sel !== want) continue
    const out = new Map<string, string>()
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(d[1], d[2].trim().toLowerCase())
    return out
  }
  return new Map()
}

const PKG_CSS = readFileSync(join(SRC, '..', 'node_modules/@bifrost/ui/src/styles/semantic.css'), 'utf8')
const APP_CSS = readFileSync(join(SRC, 'index.css'), 'utf8')

/** The package: dark on `:root, .dark`, light under `[data-theme='light']`. */
const PKG: Record<Theme, Map<string, string>> = {
  dark: declared(PKG_CSS, [':root', '.dark']),
  light: declared(PKG_CSS, ["[data-theme='light']", "[data-theme='light'] .dark"]),
}
/** The app: light on `:root` (grey paper), dark on `.dark`. */
const APP: Record<Theme, Map<string, string>> = {
  dark: declared(APP_CSS, ['.dark']),
  light: declared(APP_CSS, [':root']),
}

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

describe('§14.8 inks: one set of values, held to @bifrost/ui', () => {
  it('reads all seven from the package in both themes', () => {
    for (const th of THEMES) for (const k of INKS) expect(PKG[th].get(TOKEN[k]), `${th} ${TOKEN[k]}`).toMatch(/^#[0-9a-f]{6}$/)
  })

  it("keeps the registry's DIRECTION mirror equal to the package", () => {
    for (const th of THEMES) {
      for (const k of INKS) expect(DESIGN_INKS[th][k].toLowerCase(), `${th} ${TOKEN[k]}`).toBe(PKG[th].get(TOKEN[k]))
    }
  })

  it('takes them from the package and declares no copy of its own', () => {
    expect(APP_CSS).toMatch(/^@import "@bifrost\/ui\/styles\/semantic";$/m)
    for (const th of THEMES) {
      for (const k of INKS) expect(APP[th].get(TOKEN[k]), `${th} ${TOKEN[k]}`).toBeUndefined()
    }
  })

  it('gives every tint triplet the channels of its own hex', () => {
    for (const th of THEMES) {
      for (const k of INKS) {
        const hex = PKG[th].get(TOKEN[k]) ?? ''
        expect(APP[th].get(`${TOKEN[k]}-rgb`), `${th} ${TOKEN[k]}-rgb`).toBe(channels(hex))
      }
    }
  })
})

describe('the neutral ramp: Trade\u2019s own copy, held to the registry', () => {
  // Rev .43 Q5: the light core palette stays out of the package, so the app and
  // the registry each keep one. This is the rope between them (the DIRECTION move).
  it('declares every step of the registry\u2019s ramp at the registry\u2019s value, in both themes', () => {
    for (const th of THEMES) {
      const steps = Object.entries(DESIGN_RAMP[th])
      expect(steps.length, th).toBeGreaterThanOrEqual(12)
      for (const [name, hex] of steps) expect(APP[th].get(name), `${th} ${name}`).toBe(hex.toLowerCase())
    }
  })
})
