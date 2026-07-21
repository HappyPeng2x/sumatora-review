import {
  fetchJson,
  fetchTree,
  rawUrl,
  putFile,
  deleteFile,
  PROPOSALS_REPO,
  PROPOSALS_REF,
  INDEX_REPO,
  INDEX_REF,
} from './github'

export interface Proposal {
  seq: number
  lang: string
  glosses: string[][]
  model: string
}

export async function fetchProposal(lang: string, path: string): Promise<Proposal> {
  return fetchJson<Proposal>(rawUrl(PROPOSALS_REPO, PROPOSALS_REF, `${lang}/${path}`))
}

/**
 * Write an accepted translation as an RFC 7396 JSON Merge Patch fragment to
 * SumatoraIndex's patches/translations/{lang}/{seq}.json -- the same shape
 * jmdict-to-git.py's apply_patch() already expects for entry patches, now
 * also loaded for translations (load_translation_patches()).
 */
export async function acceptProposal(
  seq: number,
  lang: string,
  glosses: string[][],
  token: string,
): Promise<void> {
  await putFile(
    `patches/translations/${lang}/${seq}.json`,
    { glosses },
    token,
    `Accept ${lang} translation for seq ${seq}`,
  )
}

/**
 * Revert a previously-accepted translation -- used when a History redo
 * corrects an earlier Accept to a Reject. No-op if nothing was accepted for
 * this seq (Accept was never clicked, or it was already reverted).
 */
export async function revertAcceptedProposal(seq: number, lang: string, token: string): Promise<void> {
  await deleteFile(
    `patches/translations/${lang}/${seq}.json`,
    token,
    `Revert accepted ${lang} translation for seq ${seq}`,
  )
}

/** Deterministic path for a seq within a language dir, matching propose-translations.py's sharding. */
export function proposalPath(seq: number): string {
  return `${Math.floor(seq / 10000)}/${seq}.json`
}

/** The actual accepted content for a seq, straight from the patch file in
 * SumatoraIndex -- used by History to seed a redo with what's really live
 * upstream for a git-only entry (accepted from another device, so it has no
 * local IndexedDB record), instead of falling back to the original,
 * possibly-since-edited AI draft. */
export async function fetchAcceptedTranslation(seq: number, lang: string): Promise<string[][]> {
  const data = await fetchJson<{ glosses: string[][] }>(
    rawUrl(INDEX_REPO, INDEX_REF, `patches/translations/${lang}/${seq}.json`),
  )
  return data.glosses
}

/**
 * Every seq with an accepted patches/translations/{lang}/{seq}.json in
 * SumatoraIndex, straight from git -- unlike IndexedDB's local `decisions`
 * store, this is the same regardless of which device/browser asks, so it's
 * what makes "already accepted" consistent across devices. Rejects have no
 * git trace (nothing is written for a Reject), so they stay IndexedDB-only.
 */
export async function fetchAcceptedSeqs(lang: string): Promise<Set<number>> {
  const tree = await fetchTree(INDEX_REPO, INDEX_REF)
  const prefix = `patches/translations/${lang}/`
  const seqs = new Set<number>()
  for (const entry of tree) {
    if (entry.type !== 'blob' || !entry.path.startsWith(prefix) || !entry.path.endsWith('.json')) continue
    const name = entry.path.slice(prefix.length, -'.json'.length)
    const seq = Number(name)
    if (Number.isFinite(seq)) seqs.add(seq)
  }
  return seqs
}
