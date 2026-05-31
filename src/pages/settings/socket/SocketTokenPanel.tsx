import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setOpsToken } from '@/api/ops'

export function SocketTokenPanel({ token, onTokenChange }: { token: string; onTokenChange: (t: string) => void }) {
  const [show, setShow] = useState(false)
  const [draft, setDraft] = useState(token)

  function save() {
    setOpsToken(draft.trim())
    onTokenChange(draft.trim())
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Ops token</span>
      <div className="flex items-center gap-1">
        <input
          type={show ? 'text' : 'password'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Bearer token for control actions"
          className="h-7 rounded border border-border bg-background px-2 text-xs font-mono w-52 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShow(!show)} title={show ? 'Hide token' : 'Show token'}>
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={save}>
          Apply
        </Button>
      </div>
    </div>
  )
}
