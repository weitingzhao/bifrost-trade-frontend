import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Fallback UIs ──────────────────────────────────────────────────────────────

function FullPageFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 gap-4 p-8 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <div>
        <p className="font-semibold text-foreground">页面渲染出错</p>
        <p className="mt-1 text-sm text-muted-foreground font-mono break-all max-w-md">
          {error.message}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        <RotateCcw className="size-4 mr-2" />
        重试
      </Button>
    </div>
  )
}

function InlineFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
      <AlertTriangle className="size-4 shrink-0 text-destructive" />
      <span className="text-muted-foreground font-mono truncate flex-1">{error.message}</span>
      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" onClick={onReset}>
        <RotateCcw className="size-3" />
      </Button>
    </div>
  )
}

// ── ErrorBoundary ─────────────────────────────────────────────────────────────

type FallbackFn = (error: Error, reset: () => void) => ReactNode

interface Props {
  children: ReactNode
  /** Custom fallback: static node or render function (error, reset) => node */
  fallback?: ReactNode | FallbackFn
  /** Use compact inline error strip instead of full-page block */
  inline?: boolean
}

interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 300))
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    const { children, fallback, inline } = this.props

    if (!error) return children

    if (typeof fallback === 'function') return (fallback as FallbackFn)(error, this.reset)
    if (fallback != null) return fallback

    return inline
      ? <InlineFallback error={error} onReset={this.reset} />
      : <FullPageFallback error={error} onReset={this.reset} />
  }
}
