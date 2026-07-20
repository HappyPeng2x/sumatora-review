import { fetchTree, fetchText, rawUrl, PROPOSALS_REPO, PROPOSALS_REF } from './github'

export interface QueueEntry {
  seq: number
  /** Path to the proposal JSON, relative to the language directory, e.g. "129/1291770.json" */
  path: string
}

/**
 * Build the review queue for a language: every entry from every *finalized*
 * chunk (has a matching .done marker -- the still-open highest-numbered
 * chunk is deliberately excluded, since it may still be appended to).
 *
 * Re-fetches every chunk manifest on each call. Fine at today's scale (a
 * few dozen chunks); if this repo grows to hundreds of chunks, cache
 * already-seen chunk manifests (they're immutable once .done exists) rather
 * than re-fetching all of them every refresh.
 */
export async function buildQueue(lang: string): Promise<QueueEntry[]> {
  const tree = await fetchTree(PROPOSALS_REPO, PROPOSALS_REF)
  const donePrefix = `${lang}/chunks/`
  const doneChunkBases = tree
    .filter((e) => e.type === 'blob' && e.path.startsWith(donePrefix) && e.path.endsWith('.done'))
    .map((e) => e.path.slice(0, -'.done'.length))
    .sort()

  const entries: QueueEntry[] = []
  for (const base of doneChunkBases) {
    const text = await fetchText(rawUrl(PROPOSALS_REPO, PROPOSALS_REF, `${base}.jsonl`))
    for (const line of text.split('\n')) {
      if (!line.trim()) continue
      entries.push(JSON.parse(line) as QueueEntry)
    }
  }
  return entries
}
