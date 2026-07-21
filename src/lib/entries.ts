import { fetchJson, rawUrl, ENTRIES_REPO, ENTRIES_REF } from './github'

export interface Headword {
  writings: string[]
  readings: string[]
}

interface GitenderForm {
  text: string
  type: 'writing' | 'reading'
}

interface GitenderEntry {
  forms: GitenderForm[]
}

/** Writings + readings only, from gitender's language-neutral entries/ --
 * same source data as the "headword" line in sumatora-pwa's search results
 * (EntryCard), just without the POS/gloss/tag rest of that card. */
export async function fetchHeadword(seq: number): Promise<Headword> {
  const shard = Math.floor(seq / 10000)
  const entry = await fetchJson<GitenderEntry>(
    rawUrl(ENTRIES_REPO, ENTRIES_REF, `entries/${shard}/${seq}.json`),
  )
  const writings = entry.forms.filter((f) => f.type === 'writing').map((f) => f.text)
  const readings = entry.forms.filter((f) => f.type === 'reading').map((f) => f.text)
  return { writings, readings }
}
