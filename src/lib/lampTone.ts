/**
 * One lamp vocabulary, and one class family per property.
 *
 * Lamps are rendered in six places and no two agreed. `green` variously meant
 * `text-lamp-green`, `bg-lamp-green`, `bg-green-500` and `text-success`; one
 * file lit its glow from `--color-lamp-green` while colouring the label from
 * `--color-success`, which are the same value in light mode and different in
 * dark, where the lamp family is deliberately brighter because lamps glow.
 *
 * Worse than the drift was what happened to the fourth state. The daemon page
 * painted `none` with the same red as `red`, and `none` is what
 * `computeIbBrokerGroupLamp` returns when the daemon is not running — which
 * under D10 is the correct, permanent posture. A deliberate safety stance read
 * as an outage every day, on the page where red is supposed to mean something.
 *
 * **No reading is grey, never red.** That is the rule this module exists for.
 *
 * The states keep their colour names on purpose. `--color-lamp-*` and
 * `@bifrost/ui`'s HealthLamp both speak that vocabulary; renaming only inside
 * this repo would add a third one to translate at every boundary. Naming lamp
 * states by meaning is worth doing in `@bifrost/ui` first, where both apps
 * would inherit it.
 */

export type LampTone = 'green' | 'yellow' | 'red' | 'gray'

/**
 * `none`, `unknown`, null and anything unrecognised all collapse to grey.
 * Matches HealthLamp's own normalisation so a dot and its label never disagree.
 */
export function lampTone(lamp: string | null | undefined): LampTone {
  switch ((lamp ?? '').toLowerCase()) {
    case 'green':
      return 'green'
    case 'yellow':
      return 'yellow'
    case 'red':
      return 'red'
    default:
      return 'gray'
  }
}

const TEXT: Record<LampTone, string> = {
  green: 'text-lamp-green',
  yellow: 'text-lamp-yellow',
  red: 'text-lamp-red',
  gray: 'text-lamp-gray',
}

const FILL: Record<LampTone, string> = {
  green: 'bg-lamp-green',
  yellow: 'bg-lamp-yellow',
  red: 'bg-lamp-red',
  gray: 'bg-lamp-gray',
}

/** Glow reads as "live"; a grey lamp has nothing to broadcast, so it gets none. */
const GLOW: Record<LampTone, string> = {
  green: 'shadow-[0_0_5px_1px_var(--color-lamp-green)]',
  yellow: 'shadow-[0_0_5px_1px_var(--color-lamp-yellow)]',
  red: 'shadow-[0_0_5px_1px_var(--color-lamp-red)]',
  gray: '',
}

export function lampTextClass(lamp: string | null | undefined): string {
  return TEXT[lampTone(lamp)]
}

export function lampFillClass(lamp: string | null | undefined): string {
  return FILL[lampTone(lamp)]
}

export function lampGlowClass(lamp: string | null | undefined): string {
  return GLOW[lampTone(lamp)]
}

/** Fill plus glow, for a dot that carries the state on its own. */
export function lampDotClass(lamp: string | null | undefined): string {
  const tone = lampTone(lamp)
  return GLOW[tone] ? `${FILL[tone]} ${GLOW[tone]}` : FILL[tone]
}
