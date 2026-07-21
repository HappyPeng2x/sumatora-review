import { fetchJson, rawUrl, ENTRIES_REPO, ENTRIES_REF } from './github'

export interface Headword {
  writings: string[]
  readings: string[]
}

interface GitenderForm {
  text: string
  type: 'writing' | 'reading'
}

interface GitenderSenseGroup {
  tags: { code: string }[]
  senses: { number: number }[]
}

interface GitenderEntry {
  forms: GitenderForm[]
  senseGroups: GitenderSenseGroup[]
}

interface GitenderTranslation {
  senses: { number: number; glosses: string[] }[]
}

/** Writings + readings only, from gitender's language-neutral entries/ --
 * same source data as the "headword" line in sumatora-pwa's search results
 * (EntryCard), just without the POS/gloss/tag rest of that card. */
export async function fetchHeadword(seq: number): Promise<Headword> {
  const entry = await fetchEntry(seq)
  const writings = entry.forms.filter((f) => f.type === 'writing').map((f) => f.text)
  const readings = entry.forms.filter((f) => f.type === 'reading').map((f) => f.text)
  return { writings, readings }
}

function fetchEntry(seq: number): Promise<GitenderEntry> {
  const shard = Math.floor(seq / 10000)
  return fetchJson<GitenderEntry>(rawUrl(ENTRIES_REPO, ENTRIES_REF, `entries/${shard}/${seq}.json`))
}

async function fetchTranslationGlosses(seq: number, lang: string): Promise<string[][]> {
  const shard = Math.floor(seq / 10000)
  try {
    const t = await fetchJson<GitenderTranslation>(
      rawUrl(ENTRIES_REPO, ENTRIES_REF, `translations/${lang}/${shard}/${seq}.json`),
    )
    return t.senses.map((s) => s.glosses)
  } catch {
    return []
  }
}

export interface SenseSource {
  number: number
  tags: string[]
  /** English if present, else every other JMdict language with content for
   * this sense position -- same fallback rule as find-translation-gaps.py's
   * build_queue_entry, reimplemented here for the client-only "Ask Gemini"
   * flow so it can see the same non-English-sourced senses the local
   * generator does. */
  sources: Record<string, string[]>
}

const FALLBACK_LANGS = ['ger', 'rus', 'hun', 'dut', 'spa', 'swe', 'slv']

/** Per-sense tags + source-language content for a seq, mirroring
 * find-translation-gaps.py's build_queue_entry -- used to build an
 * "Ask Gemini" prompt with the same context the local AI pipeline gets. */
export async function fetchSenseSources(seq: number): Promise<SenseSource[]> {
  const entry = await fetchEntry(seq)
  const tagsBySense: string[][] = []
  for (const group of entry.senseGroups) {
    const codes = group.tags.map((t) => t.code)
    for (const _sense of group.senses) tagsBySense.push(codes)
  }
  const nSenses = tagsBySense.length

  const engGlosses = await fetchTranslationGlosses(seq, 'eng')
  const needsFallback = Array.from({ length: nSenses }, (_, i) => (engGlosses[i] ?? []).length === 0).some(Boolean)
  const fallbackGlosses: Record<string, string[][]> = {}
  if (needsFallback) {
    await Promise.all(
      FALLBACK_LANGS.map(async (lang) => {
        fallbackGlosses[lang] = await fetchTranslationGlosses(seq, lang)
      }),
    )
  }

  return tagsBySense.map((tags, i) => {
    const eng = engGlosses[i] ?? []
    const sources: Record<string, string[]> = {}
    if (eng.length > 0) {
      sources.eng = eng
    } else {
      for (const lang of FALLBACK_LANGS) {
        const g = fallbackGlosses[lang]?.[i] ?? []
        if (g.length > 0) sources[lang] = g
      }
    }
    return { number: i + 1, tags, sources }
  })
}
