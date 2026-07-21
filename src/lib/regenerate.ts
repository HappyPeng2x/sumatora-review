import { fetchTree, putFile, INDEX_REPO, INDEX_REF } from './github'

/**
 * Ask the (separately-run, local) generation pipeline to redraft a seq's
 * translation from scratch -- e.g. after noticing it was drafted before a
 * prompt fix, or before a sense's real source content was available. Just
 * writes a marker to SumatoraIndex (this app's only write-scoped repo); a
 * script run manually against SumatoraIndex's regenerate-requests/ picks
 * these up, redrafts via Ollama, and clears the marker. That consumer script
 * doesn't exist yet -- this only queues the request.
 */
export async function requestRegeneration(seq: number, lang: string, token: string): Promise<void> {
  await putFile(
    `regenerate-requests/${lang}/${seq}.json`,
    { seq, lang, requestedAt: Date.now() },
    token,
    `Request ${lang} regeneration for seq ${seq}`,
  )
}

/**
 * Every seq with a still-pending regenerate-requests/{lang}/{seq}.json in
 * SumatoraIndex, straight from git -- same cross-device purpose as
 * fetchAcceptedSeqs in proposals.ts: a request made on one device should
 * show up as pending everywhere, not just where the button was clicked.
 * The marker disappears once the (not yet built) consumer script processes
 * and clears it, so this naturally goes empty again once that exists.
 */
export async function fetchRegenerateRequestedSeqs(lang: string): Promise<Set<number>> {
  const tree = await fetchTree(INDEX_REPO, INDEX_REF)
  const prefix = `regenerate-requests/${lang}/`
  const seqs = new Set<number>()
  for (const entry of tree) {
    if (entry.type !== 'blob' || !entry.path.startsWith(prefix) || !entry.path.endsWith('.json')) continue
    const seq = Number(entry.path.slice(prefix.length, -'.json'.length))
    if (Number.isFinite(seq)) seqs.add(seq)
  }
  return seqs
}
