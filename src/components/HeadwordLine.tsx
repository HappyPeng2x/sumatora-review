import type { Headword } from '../lib/entries'

interface Props {
  headword?: Headword
}

/** Writing (or first reading, if no kanji form) large, remaining readings
 * small and dim -- same primary/secondary hierarchy as sumatora-pwa's
 * EntryCard search results, just without the POS/gloss/tag rest of that
 * card, which doesn't belong in a review-history list. */
export function HeadwordLine({ headword }: Props) {
  if (!headword) return null
  const hasWritings = headword.writings.length > 0
  const primary = hasWritings ? headword.writings[0] : (headword.readings[0] ?? '')
  const secondary = hasWritings ? headword.readings : headword.readings.slice(1)
  if (!primary) return null
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="ja text-base font-medium text-slate-100">{primary}</span>
      {secondary.slice(0, 3).map((r, i) => (
        <span key={i} className="ja text-xs text-slate-400">{r}</span>
      ))}
    </div>
  )
}
