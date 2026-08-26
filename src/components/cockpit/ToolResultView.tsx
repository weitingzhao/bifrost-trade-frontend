import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  categoryLabel,
  summarizeToolResult,
  type ToolSummaryLine,
} from '@/lib/cockpit/toolMeta'

/**
 * Friendly renderer for MCP tool_result payloads (Wave RS-KB QA).
 *
 * Given a tool name and the raw envelope returned by the MCP tool (usually
 * `{ok, data}`), render:
 *   - a short Chinese title + one-sentence description of the tool
 *   - key metrics (lines) and/or a compact preview table
 *   - a "查看原始 JSON" disclosure for debugging
 *
 * When the tool is unregistered we still show the raw JSON, but with the
 * generic summarizer highlighting row counts / top-level scalars first.
 */
export function ToolResultView({
  toolName,
  result,
  className,
}: {
  toolName: string
  result: unknown
  className?: string
}) {
  const [rawOpen, setRawOpen] = useState(false)
  const { meta, ok, error, summary } = summarizeToolResult(toolName, result)

  return (
    <div className={cn('flex flex-col gap-1.5 text-dense-meta', className)}>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-dense-body font-semibold text-foreground">
            {meta.title}
          </span>
          <span className="rounded-full border border-border/60 bg-secondary px-1.5 py-0 text-dense-caption text-muted-foreground">
            {categoryLabel(meta.category)}
          </span>
        </div>
        <p className="text-dense-caption text-muted-foreground leading-snug">
          {meta.description}
        </p>
      </div>

      {!ok ? (
        <div className="rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-dense-caption text-destructive">
          调用失败：{error || '未知错误'}
        </div>
      ) : null}

      {summary ? (
        <div className="rounded border border-border/40 bg-secondary/30 px-2 py-1.5 space-y-1">
          {summary.headline ? (
            <div className="text-dense-label font-medium text-foreground">
              {summary.headline}
            </div>
          ) : null}
          {summary.lines && summary.lines.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {summary.lines.map((line) => (
                <SummaryLine key={`${line.label}-${line.value}`} line={line} />
              ))}
            </ul>
          ) : null}
          {summary.table ? (
            <div className="overflow-x-auto">
              <table className="w-full text-dense-caption font-mono">
                <thead>
                  <tr className="text-muted-foreground">
                    {summary.table.columns.map((c) => (
                      <th
                        key={c}
                        className="px-1 py-0.5 text-left font-normal border-b border-border/50"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="px-1 py-0.5 text-foreground/90 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {summary.table.truncatedFrom ? (
                <p className="mt-0.5 text-dense-caption text-muted-foreground/70">
                  共 {summary.table.truncatedFrom} 行 · 仅显示前 {summary.table.rows.length}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : ok ? (
        <p className="text-dense-caption text-muted-foreground">
          （工具无返回数据）
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setRawOpen((v) => !v)}
        className="inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 text-dense-caption text-muted-foreground hover:text-foreground"
      >
        {rawOpen ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        <span>{rawOpen ? '隐藏原始 JSON' : '查看原始 JSON'}</span>
      </button>
      {rawOpen ? (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-border/40 bg-background/60 px-2 py-1 text-dense-caption font-mono text-foreground/80">
          {safeStringify(result)}
        </pre>
      ) : null}
    </div>
  )
}

function SummaryLine({ line }: { line: ToolSummaryLine }) {
  return (
    <li className="flex min-w-0 items-baseline justify-between gap-2">
      <span className="text-muted-foreground text-dense-caption shrink-0">
        {line.label}
      </span>
      <span
        className={cn(
          'truncate text-dense-meta font-mono text-right',
          line.tone === 'success' && 'text-success',
          line.tone === 'warning' && 'text-warning',
          line.tone === 'danger' && 'text-destructive',
          line.tone === 'muted' && 'text-muted-foreground',
          (!line.tone || line.tone === 'default') && 'text-foreground/90',
        )}
      >
        {line.value}
      </span>
    </li>
  )
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2).slice(0, 8000)
  } catch {
    return String(v)
  }
}
