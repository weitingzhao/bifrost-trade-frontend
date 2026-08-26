/**
 * Copilot session export — Markdown / HTML / print (Wave RS-EX1).
 * Tool results use the same summarize() registry as ToolResultView.
 */
import type { CopilotToolCall, CopilotUiMessage } from '@/hooks/useCopilotSession'
import {
  categoryLabel,
  getToolMeta,
  genericSummary,
  summarizeToolResult,
  type ToolSummary,
} from '@/lib/cockpit/toolMeta'

export type ExportSerializerOptions = {
  sessionId?: string
  sessionTitle?: string
  exportedAt?: Date
  /** Include fenced raw JSON for tool results (default false — summaries only). */
  includeRawTools?: boolean
  /** Owner persona snapshot lines (Wave RS-PS). */
  personaSnapshot?: string[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTs(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export function sessionShortId(sessionId?: string): string {
  if (!sessionId) return 'local'
  const clean = sessionId.replace(/-/g, '')
  return clean.slice(0, 8)
}

export function exportFilename(
  sessionId?: string,
  at: Date = new Date(),
  kind: 'transcript' | 'memory' = 'transcript',
): string {
  const prefix = kind === 'memory' ? 'bifrost-copilot-memory' : 'bifrost-copilot'
  return `${prefix}-${sessionShortId(sessionId)}-${formatTs(at)}.md`
}

function headerBlock(opts: ExportSerializerOptions): string[] {
  const at = opts.exportedAt ?? new Date()
  const lines = ['# Bifrost Research Copilot Export', '']
  if (opts.sessionTitle) lines.push(`**Session:** ${opts.sessionTitle}`)
  if (opts.sessionId) lines.push(`**Session ID:** \`${opts.sessionId}\``)
  lines.push(`**Exported:** ${at.toISOString()}`)
  if (opts.personaSnapshot && opts.personaSnapshot.length > 0) {
    lines.push('')
    lines.push('## Persona snapshot')
    for (const line of opts.personaSnapshot) {
      lines.push(line)
    }
  }
  lines.push('')
  return lines
}

function summaryLinesMd(summary: ToolSummary | null): string[] {
  if (!summary) return []
  const out: string[] = []
  if (summary.headline) out.push(`> ${summary.headline}`)
  for (const line of summary.lines ?? []) {
    out.push(`- **${line.label}:** ${line.value}`)
  }
  if (summary.table && summary.table.rows.length > 0) {
    const cols = summary.table.columns
    out.push('')
    out.push(`| ${cols.join(' | ')} |`)
    out.push(`| ${cols.map(() => '---').join(' | ')} |`)
    for (const row of summary.table.rows) {
      out.push(`| ${row.join(' | ')} |`)
    }
    if (summary.table.truncatedFrom) {
      out.push(`_… ${summary.table.truncatedFrom - summary.table.rows.length} more rows_`)
    }
  }
  return out
}

function summarizeToolCallMd(tc: CopilotToolCall, includeRaw: boolean): string[] {
  const meta = getToolMeta(tc.name)
  const lines = [`#### Tool: ${meta.title} (\`${tc.name}\`)`, '', `_${meta.description}_`, '']
  if (Object.keys(tc.arguments ?? {}).length > 0) {
    lines.push('**Arguments:**')
    lines.push('```json')
    lines.push(JSON.stringify(tc.arguments, null, 2))
    lines.push('```')
    lines.push('')
  }
  if (tc.result !== undefined) {
    const { ok, error, summary } = summarizeToolResult(tc.name, tc.result)
    lines.push(`**Status:** ${tc.status}${ok ? '' : ' (error)'}`)
    if (error) lines.push(`**Error:** ${error}`)
    lines.push(...summaryLinesMd(summary))
    if (!summary && tc.result != null) {
      const fallback = genericSummary(
        typeof tc.result === 'object' && tc.result !== null && 'data' in (tc.result as object)
          ? (tc.result as { data: unknown }).data
          : tc.result,
      )
      lines.push(...summaryLinesMd(fallback))
    }
    if (includeRaw) {
      lines.push('')
      lines.push('<details><summary>Raw tool result</summary>')
      lines.push('')
      lines.push('```json')
      lines.push(JSON.stringify(tc.result, null, 2))
      lines.push('```')
      lines.push('</details>')
    }
  } else if (tc.status === 'pending') {
    lines.push('_Pending…_')
  }
  return lines
}

function messageToMarkdown(m: CopilotUiMessage, opts: ExportSerializerOptions): string[] {
  const out: string[] = []
  const roleLabel = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'
  out.push(`## ${roleLabel}`, '')

  if (m.handoff) {
    out.push(`> Agent handoff: **${m.handoff.from}** → **${m.handoff.to}**`, '')
  }

  if (m.toolCalls?.length) {
    for (const tc of m.toolCalls) {
      out.push(...summarizeToolCallMd(tc, Boolean(opts.includeRawTools)))
      out.push('')
    }
  }

  if (m.content.trim()) {
    out.push(m.content.trim())
    out.push('')
  }

  if (m.error) {
    out.push('> ⚠ Message ended with an error.')
    out.push('')
  }

  return out
}

export function messagesToMarkdown(
  messages: CopilotUiMessage[],
  opts: ExportSerializerOptions = {},
): string {
  const parts = [...headerBlock(opts)]
  if (messages.length === 0) {
    parts.push('_No messages in this session._')
  } else {
    for (const m of messages) {
      parts.push(...messageToMarkdown(m, opts))
    }
  }
  return parts.join('\n').trimEnd() + '\n'
}

function summaryLinesHtml(summary: ToolSummary | null): string {
  if (!summary) return ''
  const chunks: string[] = []
  if (summary.headline) {
    chunks.push(`<p class="tool-headline">${escapeHtml(summary.headline)}</p>`)
  }
  if (summary.lines?.length) {
    chunks.push('<ul class="tool-lines">')
    for (const line of summary.lines) {
      chunks.push(
        `<li><span class="label">${escapeHtml(line.label)}</span> ${escapeHtml(line.value)}</li>`,
      )
    }
    chunks.push('</ul>')
  }
  if (summary.table?.rows.length) {
    const cols = summary.table.columns
    chunks.push('<table><thead><tr>')
    for (const c of cols) chunks.push(`<th>${escapeHtml(c)}</th>`)
    chunks.push('</tr></thead><tbody>')
    for (const row of summary.table.rows) {
      chunks.push('<tr>')
      for (const cell of row) chunks.push(`<td>${escapeHtml(cell)}</td>`)
      chunks.push('</tr>')
    }
    chunks.push('</tbody></table>')
    if (summary.table.truncatedFrom) {
      chunks.push(
        `<p class="muted">… ${summary.table.truncatedFrom - summary.table.rows.length} more rows</p>`,
      )
    }
  }
  return chunks.join('')
}

function summarizeToolCallHtml(tc: CopilotToolCall, includeRaw: boolean): string {
  const meta = getToolMeta(tc.name)
  const cat = categoryLabel(meta.category)
  let body = `<section class="tool-call"><h4>${escapeHtml(meta.title)} <code>${escapeHtml(tc.name)}</code></h4>`
  body += `<p class="muted">${escapeHtml(cat)} · ${escapeHtml(meta.description)}</p>`
  if (Object.keys(tc.arguments ?? {}).length > 0) {
    body += `<pre class="json">${escapeHtml(JSON.stringify(tc.arguments, null, 2))}</pre>`
  }
  if (tc.result !== undefined) {
    const { ok, error, summary } = summarizeToolResult(tc.name, tc.result)
    body += `<p><strong>Status:</strong> ${escapeHtml(tc.status)}${ok ? '' : ' (error)'}</p>`
    if (error) body += `<p class="error">${escapeHtml(error)}</p>`
    body += summaryLinesHtml(summary)
    if (includeRaw) {
      body += `<details><summary>Raw tool result</summary><pre class="json">${escapeHtml(JSON.stringify(tc.result, null, 2))}</pre></details>`
    }
  }
  body += '</section>'
  return body
}

function messageToHtml(m: CopilotUiMessage, opts: ExportSerializerOptions): string {
  const roleClass = m.role === 'user' ? 'msg-user' : 'msg-assistant'
  let html = `<article class="message ${roleClass}">`
  html += `<header>${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}</header>`

  if (m.handoff) {
    html += `<p class="handoff">Handoff: <strong>${escapeHtml(m.handoff.from)}</strong> → <strong>${escapeHtml(m.handoff.to)}</strong></p>`
  }

  if (m.toolCalls?.length) {
    html += '<div class="tools">'
    for (const tc of m.toolCalls) {
      html += summarizeToolCallHtml(tc, Boolean(opts.includeRawTools))
    }
    html += '</div>'
  }

  if (m.content.trim()) {
    html += `<div class="content"><pre class="md-body">${escapeHtml(m.content.trim())}</pre></div>`
  }

  html += '</article>'
  return html
}

const INLINE_CSS = `
:root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.45; }
body { max-width: 52rem; margin: 2rem auto; padding: 0 1rem; color: #111; background: #fff; }
@media (prefers-color-scheme: dark) {
  body { color: #eee; background: #111; }
}
h1 { font-size: 1.35rem; margin-bottom: 0.5rem; }
.meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
.message { border: 1px solid #ddd; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
.msg-user { background: #f4f4f5; }
.msg-assistant { background: #fafafa; }
@media (prefers-color-scheme: dark) {
  .message { border-color: #333; }
  .msg-user { background: #1a1a1c; }
  .msg-assistant { background: #141416; }
}
.message header { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 0.5rem; }
.handoff { font-size: 0.9rem; color: #555; }
.tool-call { margin: 0.5rem 0; padding: 0.5rem; border-left: 3px solid #6366f1; background: rgba(99,102,241,0.06); }
.tool-call h4 { margin: 0 0 0.25rem; font-size: 0.95rem; }
.muted { color: #666; font-size: 0.85rem; }
.error { color: #b91c1c; }
pre.json, pre.md-body { white-space: pre-wrap; word-break: break-word; font-size: 0.8rem; overflow-x: auto; }
table { border-collapse: collapse; width: 100%; font-size: 0.8rem; margin: 0.5rem 0; }
th, td { border: 1px solid #ddd; padding: 0.25rem 0.4rem; text-align: left; }
.tool-headline { font-weight: 600; margin: 0.25rem 0; }
.tool-lines { margin: 0.25rem 0 0.5rem 1rem; padding: 0; }
.tool-lines .label { font-weight: 600; }
@media print {
  @page { margin: 16mm; }
  html, body { height: auto !important; overflow: visible !important; margin: 0; max-width: none; }
  .message, .memory-body { break-inside: avoid; page-break-inside: avoid; }
}
`.trim()

export function messagesToHtml(
  messages: CopilotUiMessage[],
  opts: ExportSerializerOptions = {},
): string {
  const at = opts.exportedAt ?? new Date()
  const metaParts: string[] = []
  if (opts.sessionTitle) metaParts.push(`Session: ${escapeHtml(opts.sessionTitle)}`)
  if (opts.sessionId) metaParts.push(`ID: ${escapeHtml(opts.sessionId)}`)
  metaParts.push(`Exported: ${escapeHtml(at.toISOString())}`)

  const body =
    messages.length === 0
      ? '<p><em>No messages in this session.</em></p>'
      : messages.map((m) => messageToHtml(m, opts)).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bifrost Copilot Export</title>
  <style>${INLINE_CSS}</style>
</head>
<body>
  <h1>Bifrost Research Copilot Export</h1>
  <p class="meta">${metaParts.join(' · ')}</p>
  ${body}
</body>
</html>`
}

/** Export a single assistant message (for per-message Copy MD). */
export function singleMessageMarkdown(
  message: CopilotUiMessage,
  opts: ExportSerializerOptions = {},
): string {
  return messageToMarkdown(message, opts).join('\n').trimEnd() + '\n'
}

export async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Standalone HTML for an AI-distilled memory brief (not a chat transcript). */
export function memoryBriefToHtml(
  markdown: string,
  opts: ExportSerializerOptions = {},
): string {
  const at = opts.exportedAt ?? new Date()
  const metaParts: string[] = ['Bifrost Copilot · AI memory brief']
  if (opts.sessionTitle) metaParts.push(`Session: ${escapeHtml(opts.sessionTitle)}`)
  if (opts.sessionId) metaParts.push(`ID: ${escapeHtml(opts.sessionId)}`)
  metaParts.push(`Exported: ${escapeHtml(at.toISOString())}`)
  const personaBlock =
    opts.personaSnapshot && opts.personaSnapshot.length > 0
      ? `<section class="persona-snapshot"><h2>Persona snapshot</h2><pre class="md-body">${escapeHtml(
          opts.personaSnapshot.join('\n'),
        )}</pre></section>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bifrost Copilot Memory</title>
  <style>${INLINE_CSS}</style>
</head>
<body>
  <h1>Bifrost Copilot — Memory brief</h1>
  <p class="meta">${metaParts.join(' · ')}</p>
  ${personaBlock}
  <article class="memory-body"><pre class="md-body">${escapeHtml(markdown.trim())}</pre></article>
</body>
</html>`
}

/**
 * Print via a hidden iframe so the browser paginates the full document.
 * Do not fall back to `window.print()` on the app shell — visibility:hidden
 * + position:fixed on the floating panel only captures the first page.
 */
export function printHtml(html: string) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return
  }

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1500)
  }

  const doPrint = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      cleanup()
    }
  }

  iframe.onload = () => window.setTimeout(doPrint, 50)
  doc.open()
  doc.write(html)
  doc.close()
}
