/**
 * The judges' work as text you can take somewhere else.
 *
 * A run's verdicts are the most considered thing the system produces, and until
 * now they could only be read inside this drawer. Copying them by hand loses
 * the structure that makes them worth reading: which judge said it, which of
 * the four questions it was answering, and what it was looking at when it did.
 *
 * The output is plain Markdown so it pastes into any other model, any notes
 * app, or the Copilot, with no rendering assumptions.
 */
import type { PersonaRow, PersonaVerdict } from '@/components/research/harness/HarnessPipelineStepper'

export interface ExportContext {
  runId: string
  objective: string | null
  asOf: string | null
  /** Considered → proposed, when the run recorded a funnel. */
  considered: number | null
  proposed: number | null
}

/** Pipes inside the prose would break the table for whoever receives it. */
function cell(text: string | null | undefined): string {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

function verdictLines(verdicts: PersonaVerdict[]): string[] {
  if (verdicts.length === 0) return ['_No per-persona verdicts recorded._']
  // The Chinese column appears only when a judge actually wrote one. An empty
  // column on every row of an English-only run would read as missing data
  // rather than as a field that was never asked for.
  const bilingual = verdicts.some((v) => (v.summary_zh ?? '').trim())
  const head = ['Judge', 'Asked', 'Stance', 'Confidence', 'Reasoning']
  if (bilingual) head.push('中文')
  const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`]
  for (const v of verdicts) {
    const model = v.model ?? 'heuristic'
    const flag = v.source === 'heuristic_fallback' ? ' (fell back)' : ''
    const conf = v.confidence == null ? '—' : v.confidence.toFixed(2)
    const row = [`${model}${flag}`, v.agent, v.stance, conf, cell(v.summary)]
    if (bilingual) row.push(cell(v.summary_zh) || '—')
    lines.push(`| ${row.join(' | ')} |`)
  }
  return lines
}

/**
 * One candidate, with every judge's reading of it.
 *
 * Deliberately free of run context: pasted on its own it should read as this
 * symbol's judgement, and `personaStageMarkdown` supplies the surrounding facts
 * once at the top rather than repeating them per candidate.
 */
export function candidateMarkdown(row: PersonaRow): string {
  const head = [`## ${row.symbol}`, '']
  const facts = [
    `- Net stance: **${row.net}**`,
    `- Validate: **${row.validate}**${row.blocked ? ' — blocked' : ''}`,
  ]
  if (row.agreement) facts.push(`- Judges: **${row.agreement}**`)
  for (const m of row.models) {
    const state = m.fallback
      ? `fell back (${m.error ?? 'failed'})`
      : `${m.net ?? '—'} / validate ${m.validate ?? '—'}`
    facts.push(`- ${m.model}: ${state}`)
  }
  return [...head, ...facts, '', ...verdictLines(row.verdicts), ''].join('\n')
}

/** The whole judge stage: context, then every candidate. */
export function personaStageMarkdown(rows: PersonaRow[], ctx: ExportContext): string {
  const head = [
    `# Research loop judgement — ${ctx.objective ?? ctx.runId}`,
    '',
    `- Run: \`${ctx.runId}\``,
  ]
  if (ctx.asOf) head.push(`- Started: ${ctx.asOf}`)
  if (ctx.considered != null && ctx.proposed != null) {
    head.push(`- Funnel: ${ctx.considered.toLocaleString('en-US')} considered → ${ctx.proposed} proposed`)
  }
  head.push(
    '',
    'Each candidate below was read by every judge listed, four times over: whether the',
    'evidence supports the setup, what it does to the book already held, whether the',
    'settled record backs the claim, and what should happen taking those together.',
    '',
  )
  if (rows.length === 0) return [...head, '_No candidates were judged._'].join('\n')
  return [...head, ...rows.map((r) => candidateMarkdown(r))].join('\n')
}

/**
 * Copy to the clipboard, falling back to a hidden textarea.
 *
 * `navigator.clipboard` is unavailable on plain-HTTP origins, which is exactly
 * where this app runs in development, so the fallback is the path that actually
 * executes rather than a defensive afterthought.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through
  }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.top = '-1000px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
