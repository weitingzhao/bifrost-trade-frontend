import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useJsonProbe } from '@/pages/settings/feed/massive/hooks/useJsonProbe'
import type { MassiveTickerProxyResponse } from '@/api/massive/stockFeed'

export function ProbeField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={className ?? 'flex flex-col gap-1 text-xs'}>
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function ProbeInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

export function MassiveJsonProbeCard({
  title,
  description,
  fields,
  onExecute,
  executeLabel = 'Execute',
  disabled,
}: {
  title: string
  description?: string
  fields: ReactNode
  onExecute: () => Promise<MassiveTickerProxyResponse>
  executeLabel?: string
  disabled?: boolean
}) {
  const { busy, error, data, execute } = useJsonProbe(onExecute)

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields}</div>
        <Button type="button" size="sm" disabled={disabled || busy} onClick={() => void execute()}>
          {busy ? 'Running…' : executeLabel}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {data ? (
          <pre className="max-h-96 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  )
}
