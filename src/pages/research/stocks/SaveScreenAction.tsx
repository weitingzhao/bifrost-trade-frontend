/**
 * Save screen (head action). The screen is saved as `stock_screen.v2`
 * (research 0.181.0): every stage's conditions and "at least N", the Pine
 * block (picks, window, match) and the universe — Rank by is a view, not part
 * of the screen. Before Save, the definition is checked against Research's own
 * vocabulary (`/research/screens/vocabulary`); a name it does not accept keeps
 * the button off and is named, the same check its 422 would make.
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { PageHeadAction } from '@/components/layout'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { SCREEN_VOCABULARY_V2, createSavedScreen, fetchScreenVocabulary } from '@/api/research/savedScreens'
import { notify } from '@/lib/shellNotify'
import type { ScreenState, Stage } from './stockScreenModel'
import { toSavedDefinitionV2, vocabularyGaps } from './stockScreenView'

export function SaveScreenAction({
  screen,
  stages,
  nOn,
  universe,
}: {
  screen: ScreenState
  stages: readonly Stage[]
  nOn: number
  universe: string
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const definition = toSavedDefinitionV2(screen, stages, universe)
  const vocab = useQuery({ queryKey: QUERY_KEYS.researchEngine.screenVocabulary, queryFn: fetchScreenVocabulary, staleTime: 5 * 60_000 })
  const v2 = vocab.data?.[SCREEN_VOCABULARY_V2]
  const gaps = v2 ? vocabularyGaps(definition, v2) : []
  const save = useMutation({
    mutationFn: () =>
      createSavedScreen({ name: name.trim(), definition, vocabulary: SCREEN_VOCABULARY_V2, origin_page: '/research/stocks' }),
    onSuccess: (sc) => {
      setOpen(false)
      setName('')
      void qc.invalidateQueries({ queryKey: ['research-engine', 'saved-screens'] })
      notify(`Saved “${sc.name}” to My screens — its stages, the Pine window and match, and the universe. Rank by is not part of it.`)
    },
  })
  if (open && nOn > 0 && gaps.length === 0) {
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
      : gaps.length
        ? `Research’s screen vocabulary does not accept: ${gaps.join(' · ')}.`
        : 'Save the stages, the Pine window and match, and the universe as one screen (research.saved_screen · stock_screen.v2). Rank by is not part of it.'
  return (
    <PageHeadAction primary disabled={nOn === 0 || gaps.length > 0} onClick={() => setOpen(true)} title={title}>
      Save screen
    </PageHeadAction>
  )
}
