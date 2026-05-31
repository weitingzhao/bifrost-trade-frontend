import { cn } from '@/lib/utils'

const COLOR: Record<string, string> = {
  green: 'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red: 'bg-lamp-red',
}

interface StatusLampProps {
  lamp: string
  className?: string
  title?: string
}

export function StatusLamp({ lamp, className, title }: StatusLampProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        COLOR[lamp] ?? 'bg-lamp-gray',
        className
      )}
      title={title}
      aria-hidden={title ? undefined : true}
    />
  )
}
