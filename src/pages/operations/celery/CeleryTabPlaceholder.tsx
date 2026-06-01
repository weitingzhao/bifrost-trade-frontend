import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CeleryTabPlaceholderProps {
  title: string
  description: string
  plannedFeatures: string[]
}

export function CeleryTabPlaceholder({
  title,
  description,
  plannedFeatures,
}: CeleryTabPlaceholderProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div>
          <p className="text-xs font-medium text-foreground/80 mb-2">Planned in a later phase</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            {plannedFeatures.map(f => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
