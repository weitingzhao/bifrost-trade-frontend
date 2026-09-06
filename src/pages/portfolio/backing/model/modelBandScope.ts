/**
 * The sentence under the band's title: which account the figures are for,
 * always. Core models one account at a time, so the band must never leave the
 * reader guessing whether a number is Host, Secondary, or both.
 */
import type { ModelAnalysisAccountChoice, ModelBandAccount, ModelBandSide } from '@/utils/modelAnalysisAccounts'

const SIDE_LABEL: Record<ModelBandSide, string> = { host: 'Host', secondary: 'Secondary' }

export function modelBandScopeSentence(
  account: ModelBandAccount,
  accounts: Pick<ModelAnalysisAccountChoice, 'hostId' | 'secondaryId'>,
): string {
  if (account.side == null) {
    return account.scopeHasBoth
      ? 'Neither Host nor Secondary is in the current snapshot — nothing to model.'
      : 'No account in scope — turn on Host or Secondary above.'
  }
  const id = account.side === 'host' ? accounts.hostId : accounts.secondaryId
  const name = id ? `${SIDE_LABEL[account.side]} ${id}` : SIDE_LABEL[account.side]
  if (!account.accountId) return `${name} is not in the current snapshot — nothing to model.`
  if (account.locked) return `Following the page scope: ${name}.`
  return `Model figures are for ${name} only — this band reads one account at a time and never sums the two.`
}
