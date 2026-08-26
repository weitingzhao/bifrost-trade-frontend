import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

/**
 * Markdown renderer for Copilot assistant messages (Wave RS-UX3).
 *
 * Custom component map — no dependency on @tailwindcss/typography.
 * Every element gets dense-typography tokens + design system colors so it fits
 * the monitoring shell instead of looking like a generic blog post.
 *
 * Supports (via remark-gfm): tables, task lists, strikethrough, autolinks.
 */

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1
      {...props}
      className="mt-3 mb-1 text-dense-body font-semibold text-foreground first:mt-0"
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      {...props}
      className="mt-3 mb-1 text-dense-body font-semibold text-foreground first:mt-0"
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      {...props}
      className="mt-2.5 mb-0.5 text-dense-label font-semibold uppercase tracking-wide text-muted-foreground first:mt-0"
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4
      {...props}
      className="mt-2 mb-0.5 text-dense-label font-medium text-foreground first:mt-0"
    >
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p {...props} className="my-1 text-dense-label leading-snug text-foreground">
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} className="my-1 list-disc space-y-0.5 pl-4 text-dense-label leading-snug">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="my-1 list-decimal space-y-0.5 pl-4 text-dense-label leading-snug">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props} className="text-dense-label leading-snug">
      {children}
    </li>
  ),
  strong: ({ children, ...props }) => (
    <strong {...props} className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em {...props} className="italic text-foreground/90">
      {children}
    </em>
  ),
  a: ({ children, href, ...props }) => (
    <a
      {...props}
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  code: ({ children, className: cls, ...props }) => {
    const isBlock = cls?.includes('language-')
    if (isBlock) {
      return (
        <code
          {...props}
          className={cn(
            'block whitespace-pre font-mono text-dense-caption leading-tight text-foreground',
            cls,
          )}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        {...props}
        className="rounded bg-secondary px-1 py-[1px] font-mono text-[0.85em] text-foreground"
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className="my-1.5 overflow-x-auto rounded border border-border/50 bg-background/80 px-2 py-1.5"
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      {...props}
      className="my-1.5 border-l-2 border-primary/50 pl-2 text-dense-label italic text-muted-foreground"
    >
      {children}
    </blockquote>
  ),
  hr: (props) => <hr {...props} className="my-2 border-border/50" />,
  table: ({ children, ...props }) => (
    <div className="my-1.5 overflow-x-auto">
      <table
        {...props}
        className="w-full border-collapse text-dense-meta"
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead {...props} className="border-b border-border/60 bg-secondary/40 text-left">
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="px-1.5 py-1 font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="border-b border-border/30 px-1.5 py-1 align-top">
      {children}
    </td>
  ),
}

export function MarkdownContent({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div className={cn('space-y-0', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
