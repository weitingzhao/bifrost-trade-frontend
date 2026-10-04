/**
 * Save screen (head action). The saved-screen vocabulary (v1,
 * `research.saved_screen`) holds paths, grades, a composite floor and the
 * required trend / growth conditions — so a screen saves when every active
 * condition is one of those, and otherwise the button says which it cannot
 * hold. Never a silently smaller screen.
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { PageHeadAction } from '@/components/layout'
import { createSavedScreen } from '@/api/research/savedScreens'
import { notify } from '@/lib/shellNotify'
import type { ScreenState, Stage } from './stockScreenModel'
import { toSavedDefinition } from './stockScreenView'

export function SaveScreenAction({ screen, stages, nOn }: { screen: ScreenState; stages: readonly Stage[]; nOn: number }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const plan = toSavedDefinition(screen, stages)
  const save = useMutation({
    mutationFn: () =>
      createSavedScreen({ name: name.trim(), definition: plan.definition!, origin_page: '/research/stocks' }),
    onSuccess: (sc) => {
      setOpen(false)
      setName('')
      void qc.invalidateQueries({ queryKey: ['research-engine', 'saved-screens'] })
      notify(`Saved “${sc.name}” to My screens. It re-runs on tomorrow’s data; the model choice is not part of it.`)
    },
  })
  if (open && plan.definition) {
    return (
      <>
        {save.isError ? (
          <span className="max-w-[18rem] truncate text-dense-meta text-destructive" title={(save.error as Error).message}>
            {(save.error as Error).message.slice(0, 120)}
          </span>
        ) : null}
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim() && !save.isPending) save.mutate()
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Screen name"
          aria-label="Screen name"
          className="h-7 w-44"
        />
        <PageHeadAction primary disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save'}
        </PageHeadAction>
        <PageHeadAction onClick={() => setOpen(false)} title="Close without saving">
          Cancel
        </PageHeadAction>
      </>
    )
  }
  const title =
    nOn === 0
      ? 'No condition is on — nothing to save.'
      : plan.blocked
        ? `The saved-screen vocabulary (v1) holds required trend and growth conditions and SEPA path; it cannot hold: ${plan.blocked.join(' · ')}.`
        : 'Save the conditions as one screen (research.saved_screen). The universe and the model are not part of it.'
  return (
    <PageHeadAction primary disabled={nOn === 0 || !!plan.blocked} onClick={() => setOpen(true)} title={title}>
      Save screen
    </PageHeadAction>
  )
}
